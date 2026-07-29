"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WaitlistStatus = "WAITING" | "NOTIFIED" | "BOOKED" | "CANCELLED";

const WAITLIST_STATUSES: WaitlistStatus[] = [
  "WAITING",
  "NOTIFIED",
  "BOOKED",
  "CANCELLED",
];

export type WaitlistEntry = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  status: string;
  position: number;
  notifiedAt: Date | null;
  slotAvailableAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  Client: { id: string; name: string } | null;
  Service: { id: string; name: string; durationMins?: number } | null;
  Staff: { id: string; name: string } | null;
};

export type WaitlistEntryWithEstimate = WaitlistEntry & {
  estimatedWaitMins: number;
  queuePosition: number;
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const addWaitlistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  clientId: z.string().optional(),
  serviceId: z.string().optional(),
  staffId: z.string().optional(),
  note: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.enum(["morning", "afternoon", "evening"]).optional(),
});

export type AddWaitlistInput = z.infer<typeof addWaitlistSchema>;

const convertToAppointmentSchema = z.object({
  staffId: z.string().min(1, "Staff is required"),
  serviceIds: z.array(z.string()).min(1, "At least one service is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  notes: z.string().optional(),
  clientId: z.string().nullable().optional(),
});

export type ConvertToAppointmentInput = z.infer<typeof convertToAppointmentSchema>;

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function addToWaitlist(
  data: AddWaitlistInput
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = addWaitlistSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return { success: false, error: "No salon found" };
    }

    const { name, phone, clientId, serviceId, staffId, note, preferredDate, preferredTime } =
      parsed.data;

    // Determine next position
    const lastEntry = await prisma.waitlist.findFirst({
      where: { salonId: salon.id, status: "WAITING" },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const nextPosition = (lastEntry?.position ?? 0) + 1;

    const entry = await prisma.waitlist.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name,
        phone: phone || null,
        clientId: clientId || null,
        serviceId: serviceId || null,
        staffId: staffId || null,
        note: note || null,
        preferredDate: preferredDate || null,
        preferredTime: preferredTime || null,
        status: "WAITING",
        position: nextPosition,
      },
    });

    revalidatePath("/dashboard/waitlist");
    return { success: true, id: entry.id };
  } catch (err) {
    console.error("[addToWaitlist]", err);
    return { success: false, error: "Failed to add to waitlist" };
  }
}

export async function removeFromWaitlist(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing waitlist entry id" };

  try {
    await prisma.waitlist.delete({ where: { id } });
    revalidatePath("/dashboard/waitlist");
    return { success: true };
  } catch (err) {
    console.error("[removeFromWaitlist]", err);
    return { success: false, error: "Failed to remove from waitlist" };
  }
}

export async function convertToAppointment(
  waitlistId: string,
  appointmentData: ConvertToAppointmentInput
): Promise<{ success: true; appointmentId: string } | { success: false; error: string }> {
  if (!waitlistId) return { success: false, error: "Missing waitlist entry id" };

  const parsed = convertToAppointmentSchema.safeParse(appointmentData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { staffId, serviceIds, date, startTime, notes, clientId } = parsed.data;

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, price: true },
    });
    const totalAmount = services.reduce((sum, svc) => sum + svc.price, 0);

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
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

      await tx.waitlist.update({
        where: { id: waitlistId },
        data: { status: "BOOKED" },
      });

      return appointment;
    });

    revalidatePath("/dashboard/waitlist");
    revalidatePath("/dashboard/appointments");
    return { success: true, appointmentId: result.id };
  } catch (err) {
    console.error("[convertToAppointment]", err);
    return { success: false, error: "Failed to convert to appointment" };
  }
}

export async function notifyWaitlistEntry(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing waitlist entry id" };

  try {
    await prisma.waitlist.update({
      where: { id },
      data: { status: "NOTIFIED", notifiedAt: new Date() },
    });

    revalidatePath("/dashboard/waitlist");
    return { success: true };
  } catch (err) {
    console.error("[notifyWaitlistEntry]", err);
    return { success: false, error: "Failed to notify waitlist entry" };
  }
}

export async function updateWaitlistStatus(
  id: string,
  status: WaitlistStatus
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing waitlist entry id" };
  if (!WAITLIST_STATUSES.includes(status)) {
    return { success: false, error: `Invalid status: ${status}` };
  }

  try {
    const updateData: { status: WaitlistStatus; notifiedAt?: Date } = { status };
    if (status === "NOTIFIED") {
      updateData.notifiedAt = new Date();
    }

    await prisma.waitlist.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/dashboard/waitlist");
    return { success: true };
  } catch (err) {
    console.error("[updateWaitlistStatus]", err);
    return { success: false, error: "Failed to update waitlist status" };
  }
}

export async function getWaitlist(
  filter?: WaitlistStatus | "ALL"
): Promise<WaitlistEntry[]> {
  return prisma.waitlist.findMany({
    where:
      filter && filter !== "ALL"
        ? { status: filter }
        : undefined,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      Client: { select: { id: true, name: true } },
      Service: { select: { id: true, name: true, durationMins: true } },
      Staff: { select: { id: true, name: true } },
    },
  });
}

// ─── Reprioritize Waitlist ─────────────────────────────────────────────────────

export async function reprioritizeWaitlist(
  id: string,
  newPosition: number
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing waitlist entry id" };
  if (typeof newPosition !== "number" || newPosition < 1) {
    return { success: false, error: "Invalid position" };
  }

  try {
    const entry = await prisma.waitlist.findUnique({ where: { id } });
    if (!entry) return { success: false, error: "Waitlist entry not found" };

    const oldPosition = entry.position;
    if (oldPosition === newPosition) return { success: true };

    // Get all WAITING entries for this salon ordered by position
    const siblings = await prisma.waitlist.findMany({
      where: { salonId: entry.salonId, status: "WAITING" },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, position: true },
    });

    // Filter out the current entry and cap newPosition
    const others = siblings.filter((e) => e.id !== id);
    const clampedPos = Math.min(newPosition, others.length + 1);

    // Build reordered list: insert at clampedPos (1-indexed)
    const reordered = [...others];
    const insertIdx = clampedPos - 1;
    reordered.splice(insertIdx, 0, { id, position: clampedPos });

    // Update positions in a transaction
    await prisma.$transaction(
      reordered.map((e, idx) =>
        prisma.waitlist.update({
          where: { id: e.id },
          data: { position: idx + 1 },
        })
      )
    );

    revalidatePath("/dashboard/waitlist");
    return { success: true };
  } catch (err) {
    console.error("[reprioritizeWaitlist]", err);
    return { success: false, error: "Failed to reprioritize waitlist" };
  }
}

// ─── Get Waitlist With Estimated Wait Time ────────────────────────────────────

export async function getWaitlistWithEstimate(): Promise<WaitlistEntryWithEstimate[]> {
  const entries = await prisma.waitlist.findMany({
    where: { status: "WAITING" },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      Client: { select: { id: true, name: true } },
      Service: { select: { id: true, name: true, durationMins: true } },
      Staff: { select: { id: true, name: true } },
    },
  });

  // Average duration: use each entry's service duration or fall back to 30 min
  const DEFAULT_DURATION = 30;

  return entries.map((entry, idx) => {
    // Sum of durations for all entries ahead of this one
    const estimatedWaitMins = entries.slice(0, idx).reduce((sum, e) => {
      return sum + (e.Service?.durationMins ?? DEFAULT_DURATION);
    }, 0);

    return {
      ...entry,
      estimatedWaitMins,
      queuePosition: idx + 1,
    };
  });
}

// ─── Get Waitlist Position For Service ────────────────────────────────────────

export async function getWaitlistPositionForService(
  salonId: string,
  serviceId: string | null
): Promise<number> {
  const count = await prisma.waitlist.count({
    where: {
      salonId,
      status: "WAITING",
      ...(serviceId ? { serviceId } : {}),
    },
  });
  return count;
}
