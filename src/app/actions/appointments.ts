"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkAppointmentConflicts, type ConflictInfo } from "@/lib/conflict-detection";

export type AppointmentWithRelations = {
  id: string;
  date: string;
  startTime: string;
  totalAmount: number;
  status: string;
  notes: string | null;
  Client: { id: string; name: string; phone?: string | null } | null;
  Staff: { id: string; name: string };
  AppointmentService: {
    serviceId: string;
    staffId: string | null;
    Service: { id: string; name: string; price: number; durationMins: number };
    Staff: { id: string; name: string } | null;
  }[];
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
      Client: { select: { id: true, name: true, phone: true } },
      Staff: { select: { id: true, name: true } },
      AppointmentService: {
        include: {
          Service: { select: { id: true, name: true, price: true, durationMins: true } },
          Staff: { select: { id: true, name: true } },
        },
      },
    },
  });
}

const createAppointmentSchema = z.object({
  clientId: z.string().nullable().optional(),
  staffId: z.string().min(1, "Staff is required"),
  serviceIds: z.array(z.string()).min(1, "At least one service is required"),
  // Per-service staff assignments: { [serviceId]: staffId }
  serviceStaffMap: z.record(z.string(), z.string()).optional(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  notes: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<
  | { success: true; id: string; shiftWarning?: string; warnings?: ConflictInfo[] }
  | { success: false; error: string; conflicts?: ConflictInfo[] }
> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { clientId, staffId, serviceIds, serviceStaffMap, date, startTime, notes } = parsed.data;

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return { success: false, error: "No salon found" };
    }

    // ── Conflict detection ────────────────────────────────────────────────────
    // First compute total duration so we can check time overlap properly
    const servicesForDuration = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, durationMins: true },
    });
    const durationMins = servicesForDuration.reduce((sum, s) => sum + s.durationMins, 0) || 30;

    let allConflicts: ConflictInfo[] = [];
    try {
      allConflicts = await checkAppointmentConflicts(prisma, {
        staffId,
        date,
        startTime,
        durationMins,
        clientId: clientId ?? null,
      });
    } catch {
      // Non-fatal: conflict check failure should not block booking
    }

    const hardConflicts = allConflicts.filter(
      (c) => c.type === "staff_double_booked" || c.type === "client_double_booked"
    );
    const warnings = allConflicts.filter((c) => c.type === "outside_shift");

    if (hardConflicts.length > 0) {
      const firstHard = hardConflicts[0];
      return {
        success: false,
        error:
          firstHard.type === "staff_double_booked"
            ? "Staff is already booked at that time"
            : "Client already has an appointment at that time",
        conflicts: hardConflicts,
      };
    }

    // Build legacy shiftWarning string for backwards compat
    const shiftWarning =
      warnings.length > 0 ? warnings[0].message + ". Appointment booked anyway." : undefined;

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
          create: serviceIds.map((serviceId) => ({
            serviceId,
            staffId: serviceStaffMap?.[serviceId] ?? null,
          })),
        },
      },
    });

    // ── Auto-schedule reminders driven by ReminderSettings ───────────────────
    try {
      await generateRemindersForAppointment(appointment.id, salon.id);
    } catch (reminderErr) {
      // Non-fatal: reminder failure should never block appointment creation
      console.error("[createAppointment] reminder scheduling failed", reminderErr)
    }

    revalidatePath("/dashboard/appointments");
    return {
      success: true,
      id: appointment.id,
      shiftWarning,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  } catch (err) {
    console.error("[createAppointment]", err);
    return { success: false, error: "Failed to create appointment" };
  }
}

const VALID_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
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
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    // When cancelled, find first PENDING waitlist entry matching serviceId,
    // then fall back to date-based matching for remaining entries
    if (status === "CANCELLED") {
      const cancelledAppointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          AppointmentService: { select: { serviceId: true } },
        },
      });
      const serviceIds = cancelledAppointment?.AppointmentService.map(
        (as) => as.serviceId
      ) ?? [];

      if (serviceIds.length > 0) {
        // Find the first WAITING entry for each cancelled service
        for (const serviceId of serviceIds) {
          const firstMatch = await prisma.waitlist.findFirst({
            where: { salonId: appointment.salonId, status: "WAITING", serviceId },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            select: { id: true },
          });
          if (firstMatch) {
            await prisma.waitlist.update({
              where: { id: firstMatch.id },
              data: {
                slotAvailableAt: new Date(),
                note: "Slot available from cancelled appointment",
              },
            });
          }
        }
      }

      // Also mark date-matched entries (without a service preference)
      if (appointment.date) {
        await prisma.waitlist.updateMany({
          where: {
            salonId: appointment.salonId,
            status: "WAITING",
            serviceId: null,
            OR: [
              { preferredDate: appointment.date },
              { preferredDate: null },
            ],
          },
          data: { slotAvailableAt: new Date() },
        });
      }

      revalidatePath("/dashboard/waitlist");
    }

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (err) {
    console.error("[updateAppointmentStatus]", err);
    return { success: false, error: "Failed to update appointment status" };
  }
}

// ─── Update appointment (full edit) ───────────────────────────────────────────

const updateAppointmentSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  clientId: z.string().nullable().optional(),
  staffId: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  startTime: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  serviceIds: z.array(z.string()).min(1).optional(),
  // Per-service staff assignments: { [serviceId]: staffId }
  serviceStaffMap: z.record(z.string(), z.string()).optional(),
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

  const { status, clientId, staffId, date, startTime, notes, serviceIds, serviceStaffMap, totalAmount } = parsed.data;

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
          data: serviceIds.map((serviceId) => ({
            appointmentId: id,
            serviceId,
            staffId: serviceStaffMap?.[serviceId] ?? null,
          })),
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
          ...(status ? { status } : {}),
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
): Promise<{ success: true; waitlistNotified?: number } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing appointment id" };

  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        AppointmentService: { select: { serviceId: true } },
      },
    });

    // Notify waitlist entries: first match by serviceId, then by date
    let waitlistNotified = 0;
    const serviceIds = appointment.AppointmentService.map((as) => as.serviceId);

    if (serviceIds.length > 0) {
      // Find first WAITING entry for each cancelled service and mark slot available
      for (const serviceId of serviceIds) {
        const firstMatch = await prisma.waitlist.findFirst({
          where: { salonId: appointment.salonId, status: "WAITING", serviceId },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });
        if (firstMatch) {
          await prisma.waitlist.update({
            where: { id: firstMatch.id },
            data: {
              slotAvailableAt: new Date(),
              note: "Slot available from cancelled appointment",
            },
          });
          waitlistNotified++;
        }
      }
    }

    // Also mark date-matched entries with no service preference
    if (appointment.date) {
      const result = await prisma.waitlist.updateMany({
        where: {
          salonId: appointment.salonId,
          status: "WAITING",
          serviceId: null,
          OR: [
            { preferredDate: appointment.date },
            { preferredDate: null },
          ],
        },
        data: { slotAvailableAt: new Date() },
      });
      waitlistNotified += result.count;
    }

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/waitlist");
    return { success: true, waitlistNotified };
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
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: "NO_SHOW" },
      include: { Client: { select: { id: true } } },
    });

    // Create a follow-up SMS reminder for no-show clients
    try {
      const salon = await prisma.salon.findFirst({ select: { id: true } });
      if (salon) {
        await prisma.reminder.create({
          data: {
            id: randomUUID(),
            salonId: salon.id,
            appointmentId: id,
            clientId: appointment.clientId ?? null,
            type: "SMS",
            status: "PENDING",
            message: "We missed you today! Would you like to reschedule?",
            scheduledAt: new Date(),
          },
        });
        revalidatePath("/dashboard/reminders");
      }
    } catch (reminderErr) {
      // Non-fatal
      console.error("[markNoShow] reminder creation failed", reminderErr);
    }

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
          salonId: salon.id,
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

// ─── Start appointment (IN_PROGRESS) ──────────────────────────────────────────

export async function startAppointment(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing appointment id" };

  try {
    await prisma.appointment.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/queue");
    return { success: true };
  } catch (err) {
    console.error("[startAppointment]", err);
    return { success: false, error: "Failed to start appointment" };
  }
}

// ─── Complete appointment from queue ──────────────────────────────────────────

export async function completeAppointment(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing appointment id" };

  try {
    await prisma.appointment.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    // Schedule a rebooking reminder 3 weeks after the appointment
    try {
      const { scheduleRebookingReminder } = await import("@/app/actions/reminders");
      await scheduleRebookingReminder(id);
    } catch (reminderErr) {
      // Non-fatal
      console.error("[completeAppointment] rebooking reminder failed", reminderErr);
    }

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/queue");
    return { success: true };
  } catch (err) {
    console.error("[completeAppointment]", err);
    return { success: false, error: "Failed to complete appointment" };
  }
}

// ─── Rebook appointment ────────────────────────────────────────────────────────

export async function rebookAppointment(
  appointmentId: string,
  newDate: string,
  newStartTime: string
): Promise<{ success: true; appointmentId: string } | { success: false; error: string }> {
  if (!appointmentId) return { success: false, error: "Missing appointmentId" };
  if (!newDate) return { success: false, error: "Missing newDate" };
  if (!newStartTime) return { success: false, error: "Missing newStartTime" };

  try {
    const original = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        AppointmentService: { select: { serviceId: true, staffId: true } },
      },
    });

    if (!original) return { success: false, error: "Original appointment not found" };

    const newId = randomUUID();

    await prisma.appointment.create({
      data: {
        id: newId,
        salonId: original.salonId,
        clientId: original.clientId,
        staffId: original.staffId,
        date: newDate,
        startTime: newStartTime,
        totalAmount: original.totalAmount,
        status: "SCHEDULED",
        AppointmentService: {
          create: original.AppointmentService.map((as) => ({
            serviceId: as.serviceId,
            staffId: as.staffId ?? null,
          })),
        },
      },
    });

    revalidatePath("/dashboard/appointments");
    return { success: true, appointmentId: newId };
  } catch (err) {
    console.error("[rebookAppointment]", err);
    return { success: false, error: "Failed to rebook appointment" };
  }
}

// ─── Get available time slots for rebook ──────────────────────────────────────

const ALL_SLOTS: string[] = [];
for (let h = 9; h < 19; h++) {
  ALL_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  ALL_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

export async function getAvailableSlotsForRebook(
  staffId: string,
  date: string
): Promise<string[]> {
  if (!staffId || !date) return ALL_SLOTS;

  try {
    const booked = await prisma.appointment.findMany({
      where: {
        staffId,
        date,
        status: { not: "CANCELLED" },
      },
      select: { startTime: true },
    });

    const takenSet = new Set(booked.map((a) => a.startTime));
    return ALL_SLOTS.filter((slot) => !takenSet.has(slot));
  } catch {
    return ALL_SLOTS;
  }
}

// ─── Queue types ───────────────────────────────────────────────────────────────

export type QueueEntry = {
  id: string;
  position: number;
  clientName: string;
  services: string;
  startTime: string;
  estimatedWaitMins: number;
  staffName: string;
  staffId: string;
  status: string;
};

export type StaffQueueCard = {
  staffId: string;
  staffName: string;
  currentAppointment: {
    id: string;
    clientName: string;
    services: string;
    startTime: string;
  } | null;
  nextAppointment: {
    id: string;
    clientName: string;
    services: string;
    startTime: string;
  } | null;
  idleMins: number | null;
};

// ─── Get queue for today ───────────────────────────────────────────────────────

export async function getQueueForToday(): Promise<{
  entries: QueueEntry[];
  staffCards: StaffQueueCard[];
}> {
  const today = new Date().toISOString().split("T")[0];

  const appointments = await prisma.appointment.findMany({
    where: {
      date: today,
      status: { not: "CANCELLED" },
    },
    orderBy: { startTime: "asc" },
    include: {
      Client: { select: { name: true } },
      Staff: { select: { id: true, name: true } },
      AppointmentService: {
        include: {
          Service: { select: { name: true, durationMins: true } },
          Staff: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Build queue entries with wait time calculation
  // For each SCHEDULED appointment, wait = sum of durations of all preceding
  // SCHEDULED/IN_PROGRESS appointments for that staff member
  const staffAppointmentMap = new Map<
    string,
    Array<typeof appointments[number]>
  >();
  for (const appt of appointments) {
    const list = staffAppointmentMap.get(appt.staffId) ?? [];
    list.push(appt);
    staffAppointmentMap.set(appt.staffId, list);
  }

  const entries: QueueEntry[] = appointments.map((appt, globalIdx) => {
    const staffAppts = staffAppointmentMap.get(appt.staffId) ?? [];
    const staffIdx = staffAppts.findIndex((a) => a.id === appt.id);

    // Preceding appointments for same staff member that are scheduled/in-progress
    const preceding = staffAppts.slice(0, staffIdx).filter(
      (a) => a.status === "SCHEDULED" || a.status === "IN_PROGRESS"
    );

    const estimatedWaitMins = preceding.reduce((sum, a) => {
      const totalDuration = a.AppointmentService.reduce(
        (s, as) => s + as.Service.durationMins,
        0
      );
      return sum + (totalDuration || 30); // fallback 30 min if no services
    }, 0);

    const serviceNames = appt.AppointmentService.map(
      (as) => as.Service.name
    ).join(", ") || "—";

    return {
      id: appt.id,
      position: globalIdx + 1,
      clientName: appt.Client?.name ?? "Walk-in",
      services: serviceNames,
      startTime: appt.startTime,
      estimatedWaitMins,
      staffName: appt.Staff.name,
      staffId: appt.Staff.id,
      status: appt.status,
    };
  });

  // Build staff cards
  const staffIds = Array.from(staffAppointmentMap.keys());
  const staffCards: StaffQueueCard[] = staffIds.map((staffId) => {
    const staffAppts = staffAppointmentMap.get(staffId)!;
    const inProgress = staffAppts.find((a) => a.status === "IN_PROGRESS");
    const nextScheduled = staffAppts.find((a) => a.status === "SCHEDULED");
    const staffName = staffAppts[0]?.Staff.name ?? "Unknown";

    const makeApptSummary = (appt: typeof appointments[number]) => ({
      id: appt.id,
      clientName: appt.Client?.name ?? "Walk-in",
      services:
        appt.AppointmentService.map((as) => as.Service.name).join(", ") || "—",
      startTime: appt.startTime,
    });

    // If there's nothing in-progress, compute idle time from last completed
    let idleMins: number | null = null;
    if (!inProgress) {
      const lastCompleted = [...staffAppts]
        .reverse()
        .find((a) => a.status === "COMPLETED");
      if (lastCompleted) {
        // Use start time + duration of last completed as proxy
        const [h, m] = lastCompleted.startTime.split(":").map(Number);
        const completedDuration = lastCompleted.AppointmentService.reduce(
          (s, as) => s + as.Service.durationMins,
          0
        );
        const finishMinutes = h * 60 + m + completedDuration;
        const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
        idleMins = Math.max(0, nowMinutes - finishMinutes);
      }
    }

    return {
      staffId,
      staffName,
      currentAppointment: inProgress ? makeApptSummary(inProgress) : null,
      nextAppointment: nextScheduled ? makeApptSummary(nextScheduled) : null,
      idleMins,
    };
  });

  return { entries, staffCards };
}

// ─── Update appointment notes (formula notes JSON) ─────────────────────────────

export interface AppointmentNotes {
  general?: string;
  formula?: string;
  processingTime?: string;
  result?: string;
  nextVisit?: string;
  products?: string;
}

export async function updateAppointmentNotes(
  appointmentId: string,
  notes: AppointmentNotes
): Promise<{ success: true } | { success: false; error: string }> {
  if (!appointmentId) return { success: false, error: "Missing appointment id" };

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { notes: JSON.stringify(notes) },
    });

    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (err) {
    console.error("[updateAppointmentNotes]", err);
    return { success: false, error: "Failed to update appointment notes" };
  }
}

// ─── Auto-reminder generation helper ──────────────────────────────────────────
// Non-exported: called after appointment creation to schedule reminders
// based on the salon's ReminderSettings stored in businessHours JSON.

async function generateRemindersForAppointment(
  appointmentId: string,
  salonId: string
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { date: true, startTime: true, clientId: true },
  });
  if (!appointment) return;

  // Load reminder settings from businessHours JSON
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { businessHours: true, name: true },
  });

  let hoursBefore: number[] = [24, 2];
  let dayBeforeAt5pm = false;
  let smsTemplate =
    "Reminder: You have an appointment at {{salonName}} on {{date}} at {{time}}.";

  if (salon?.businessHours) {
    try {
      const bh = JSON.parse(salon.businessHours);
      if (bh?.__reminderSettings) {
        const rs = bh.__reminderSettings;
        if (Array.isArray(rs.hoursBefore) && rs.hoursBefore.length > 0) {
          hoursBefore = rs.hoursBefore as number[];
        }
        if (typeof rs.dayBeforeAt5pm === "boolean") dayBeforeAt5pm = rs.dayBeforeAt5pm;
        if (typeof rs.smsTemplate === "string" && rs.smsTemplate) smsTemplate = rs.smsTemplate;
      }
    } catch {
      // ignore
    }
  }

  const apptDateTime = new Date(`${appointment.date}T${appointment.startTime}`);
  const now = new Date();
  const salonName = salon?.name ?? "the salon";

  const message = smsTemplate
    .replace(/{{salonName}}/g, salonName)
    .replace(/{{date}}/g, appointment.date)
    .replace(/{{time}}/g, appointment.startTime);

  const remindersToCreate: Array<{
    scheduledAt: Date;
    type: string;
  }> = [];

  // hoursBefore reminders
  for (const h of hoursBefore) {
    const scheduledAt = new Date(apptDateTime.getTime() - h * 60 * 60 * 1000);
    if (scheduledAt > now) {
      remindersToCreate.push({ scheduledAt, type: "APPOINTMENT_REMINDER" });
    }
  }

  // Day-before at 17:00
  if (dayBeforeAt5pm) {
    const dayBefore = new Date(apptDateTime);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(17, 0, 0, 0);
    if (dayBefore > now) {
      remindersToCreate.push({ scheduledAt: dayBefore, type: "APPOINTMENT_REMINDER" });
    }
  }

  for (const { scheduledAt, type } of remindersToCreate) {
    await prisma.reminder.create({
      data: {
        id: randomUUID(),
        salonId,
        appointmentId,
        clientId: appointment.clientId ?? null,
        type: "SMS",
        message: `[${type}] ${message}`,
        scheduledAt,
        status: "PENDING",
      },
    });
  }
}
