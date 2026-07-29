"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type AppointmentWithRelations = {
  id: string;
  date: string;
  startTime: string;
  totalAmount: number;
  status: string;
  notes: string | null;
  Client: { id: string; name: string } | null;
  Staff: { id: string; name: string };
  AppointmentService: { Service: { id: string; name: string; durationMins: number } }[];
};

export async function getAppointmentsForWeek(
  weekStart: string
): Promise<AppointmentWithRelations[]> {
  const start = new Date(weekStart);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  return prisma.appointment.findMany({
    where: { date: { in: dates } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: {
      Client: { select: { id: true, name: true } },
      Staff: { select: { id: true, name: true } },
      AppointmentService: { include: { Service: { select: { id: true, name: true, durationMins: true } } } },
    },
  });
}

const createAppointmentSchema = z.object({
  clientId: z.string().nullable().optional(),
  staffId: z.string().min(1, "Staff is required"),
  serviceIds: z.array(z.string()).min(1, "At least one service is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  notes: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { clientId, staffId, serviceIds, date, startTime, notes } = parsed.data;

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return { success: false, error: "No salon found" };
    }

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, price: true },
    });

    const totalAmount = services.reduce((sum, svc) => sum + svc.price, 0);

    const appointment = await prisma.appointment.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        clientId: clientId ?? null,
        staffId,
        date,
        startTime,
        totalAmount,
        notes: notes ?? null,
        AppointmentService: {
          create: serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
    });

    revalidatePath("/dashboard/appointments");
    return { success: true, id: appointment.id };
  } catch (err) {
    console.error("[createAppointment]", err);
    return { success: false, error: "Failed to create appointment" };
  }
}

const VALID_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
type AppointmentStatus = (typeof VALID_STATUSES)[number];

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing appointment id" };
  if (!VALID_STATUSES.includes(status)) {
    return { success: false, error: `Invalid status: ${status}` };
  }

  try {
    await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (err) {
    console.error("[updateAppointmentStatus]", err);
    return { success: false, error: "Failed to update appointment status" };
  }
}

// ─── Update appointment (full edit) ───────────────────────────────────────────

const updateAppointmentSchema = z.object({
  clientId: z.string().nullable().optional(),
  staffId: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  startTime: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  serviceIds: z.array(z.string()).min(1).optional(),
  totalAmount: z.number().optional(),
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export async function updateAppointment(
  id: string,
  data: UpdateAppointmentInput
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing appointment id" };

  const parsed = updateAppointmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { clientId, staffId, date, startTime, notes, serviceIds, totalAmount } = parsed.data;

  try {
    // Recalculate total if serviceIds provided but totalAmount not explicitly set
    let computedTotal = totalAmount;
    if (serviceIds && computedTotal === undefined) {
      const services = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { price: true },
      });
      computedTotal = services.reduce((sum, svc) => sum + svc.price, 0);
    }

    await prisma.$transaction(async (tx) => {
      // Replace AppointmentService rows if serviceIds provided
      if (serviceIds) {
        await tx.appointmentService.deleteMany({ where: { appointmentId: id } });
        await tx.appointmentService.createMany({
          data: serviceIds.map((serviceId) => ({ appointmentId: id, serviceId })),
        });
      }

      await tx.appointment.update({
        where: { id },
        data: {
          ...(clientId !== undefined ? { clientId: clientId ?? null } : {}),
          ...(staffId ? { staffId } : {}),
          ...(date ? { date } : {}),
          ...(startTime ? { startTime } : {}),
          ...(notes !== undefined ? { notes: notes ?? null } : {}),
          ...(computedTotal !== undefined ? { totalAmount: computedTotal } : {}),
        },
      });
    });

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (err) {
    console.error("[updateAppointment]", err);
    return { success: false, error: "Failed to update appointment" };
  }
}

// ─── Cancel appointment ────────────────────────────────────────────────────────

export async function cancelAppointment(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing appointment id" };

  try {
    await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (err) {
    console.error("[cancelAppointment]", err);
    return { success: false, error: "Failed to cancel appointment" };
  }
}

// ─── Mark no-show ──────────────────────────────────────────────────────────────

export async function markNoShow(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing appointment id" };

  try {
    await prisma.appointment.update({
      where: { id },
      data: { status: "NO_SHOW" },
    });

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (err) {
    console.error("[markNoShow]", err);
    return { success: false, error: "Failed to mark no-show" };
  }
}

// ─── Checkout appointment ──────────────────────────────────────────────────────

const VALID_PAYMENT_METHODS = ["CASH", "CARD", "UPI", "TRANSFER"] as const;
type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];

export async function checkoutAppointment(
  id: string,
  paymentMethod: string,
  finalAmount?: number,
  earnPoints: boolean = true
): Promise<{ success: true; invoiceId: string; pointsEarned?: number } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing appointment id" };
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
    return { success: false, error: `Invalid payment method: ${paymentMethod}` };
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { Invoice: true },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found" };
    }
    if (appointment.status === "COMPLETED") {
      return { success: false, error: "Appointment is already completed" };
    }
    if (appointment.Invoice) {
      return { success: false, error: "Invoice already exists for this appointment" };
    }

    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return { success: false, error: "No salon found" };
    }

    const total = finalAmount !== undefined ? finalAmount : appointment.totalAmount;

    // 1 point per 10 currency units, rounded down
    const pointsEarned =
      earnPoints && appointment.clientId && total > 0
        ? Math.floor(total / 10)
        : 0;

    const invoice = await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      const inv = await tx.invoice.create({
        data: {
          id: randomUUID(),
          salonId: salon.id,
          clientId: appointment.clientId ?? null,
          appointmentId: id,
          total,
          paymentMethod,
          status: "PAID",
        },
      });

      // Award loyalty points inside transaction
      if (pointsEarned > 0 && appointment.clientId) {
        await tx.client.update({
          where: { id: appointment.clientId },
          data: { loyaltyPoints: { increment: pointsEarned } },
        });

        await tx.ledgerEntry.create({
          data: {
            id: randomUUID(),
            clientId: appointment.clientId,
            type: "CREDIT",
            amount: pointsEarned,
            note: `Points earned: ${pointsEarned} pts for invoice ${inv.id}`,
          },
        });
      }

      return inv;
    });

    // Auto-schedule a thank-you SMS reminder (sent immediately)
    try {
      const now = new Date();
      const scheduledAt = new Date(now.getTime() + 60 * 60 * 1000); // now + 1 hour
      await prisma.reminder.create({
        data: {
          id: randomUUID(),
          appointmentId: id,
          type: "SMS",
          status: "SENT",
          message: `Thank you for visiting ${salon.name}! We hope to see you again soon.`,
          scheduledAt,
          sentAt: now,
        },
      });
    } catch (reminderErr) {
      // Non-fatal: log but don't fail the checkout
      console.error("[checkoutAppointment] reminder creation failed", reminderErr);
    }

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/reminders");
    return { success: true, invoiceId: invoice.id, pointsEarned: pointsEarned > 0 ? pointsEarned : undefined };
  } catch (err) {
    console.error("[checkoutAppointment]", err);
    return { success: false, error: "Failed to complete checkout" };
  }
}
