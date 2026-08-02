"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSalonId } from "@/lib/repositories/base";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

// ─── requestTimeOff ──────────────────────────────────────────────────────────

export async function requestTimeOff(data: {
  staffId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const { staffId, startDate, endDate, reason } = data;

  if (!staffId) return { success: false, error: "Missing staffId" };
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate))
    return { success: false, error: "Invalid start date (YYYY-MM-DD)" };
  if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    return { success: false, error: "Invalid end date (YYYY-MM-DD)" };
  if (endDate < startDate)
    return { success: false, error: "End date must be on or after start date" };

  try {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) return { success: false, error: "Staff member not found" };

    const id = randomUUID();
    await prisma.timeOff.create({
      data: { id, staffId, startDate, endDate, reason: reason ?? null, approved: false },
    });

    revalidatePath("/dashboard/staff/time-off");
    return { success: true, id };
  } catch (err) {
    console.error("[requestTimeOff]", err);
    return { success: false, error: "Failed to create time-off request" };
  }
}

// ─── approveTimeOff ──────────────────────────────────────────────────────────

export async function approveTimeOff(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const rec = await prisma.timeOff.findUnique({ where: { id } });
    if (!rec) return { success: false, error: "Time-off request not found" };

    await prisma.timeOff.update({ where: { id }, data: { approved: true } });
    revalidatePath("/dashboard/staff/time-off");
    return { success: true };
  } catch (err) {
    console.error("[approveTimeOff]", err);
    return { success: false, error: "Failed to approve time-off request" };
  }
}

// ─── denyTimeOff ─────────────────────────────────────────────────────────────

export async function denyTimeOff(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const rec = await prisma.timeOff.findUnique({ where: { id } });
    if (!rec) return { success: false, error: "Time-off request not found" };

    await prisma.timeOff.delete({ where: { id } });
    revalidatePath("/dashboard/staff/time-off");
    return { success: true };
  } catch (err) {
    console.error("[denyTimeOff]", err);
    return { success: false, error: "Failed to deny time-off request" };
  }
}

// ─── cancelTimeOffRequest ─────────────────────────────────────────────────────

export async function cancelTimeOffRequest(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const rec = await prisma.timeOff.findUnique({ where: { id } });
    if (!rec) return { success: false, error: "Time-off request not found" };

    await prisma.timeOff.delete({ where: { id } });
    revalidatePath("/dashboard/staff/time-off");
    return { success: true };
  } catch (err) {
    console.error("[cancelTimeOffRequest]", err);
    return { success: false, error: "Failed to cancel time-off request" };
  }
}

// ─── getTimeOffRequests ───────────────────────────────────────────────────────

export async function getTimeOffRequests(filter?: {
  staffId?: string;
  status?: "pending" | "approved" | "all";
  from?: string;
  to?: string;
}): Promise<
  {
    id: string;
    staffId: string;
    staffName: string;
    startDate: string;
    endDate: string;
    reason?: string;
    approved: boolean;
    days: number;
    conflictingAppointments: number;
    createdAt: string;
  }[]
> {
  try {
    const where: Record<string, unknown> = {};

    if (filter?.staffId) where.staffId = filter.staffId;
    if (filter?.status === "pending") where.approved = false;
    if (filter?.status === "approved") where.approved = true;
    if (filter?.from) where.startDate = { gte: filter.from };
    if (filter?.to) {
      where.endDate =
        filter?.from
          ? { ...((where.endDate as object) ?? {}), lte: filter.to }
          : { lte: filter.to };
    }

    const records = await prisma.timeOff.findMany({
      where,
      include: { Staff: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const results = await Promise.all(
      records.map(async (rec) => {
        // Count SCHEDULED appointments during the leave period
        const conflictingAppointments = await prisma.appointment.count({
          where: {
            staffId: rec.staffId,
            status: "SCHEDULED",
            date: { gte: rec.startDate, lte: rec.endDate },
          },
        });

        return {
          id: rec.id,
          staffId: rec.staffId,
          staffName: rec.Staff.name,
          startDate: rec.startDate,
          endDate: rec.endDate,
          reason: rec.reason ?? undefined,
          approved: rec.approved,
          days: daysBetween(rec.startDate, rec.endDate),
          conflictingAppointments,
          createdAt: rec.createdAt.toISOString(),
        };
      })
    );

    return results;
  } catch (err) {
    console.error("[getTimeOffRequests]", err);
    return [];
  }
}

// ─── getConflictingAppointments ───────────────────────────────────────────────

export async function getConflictingAppointments(
  staffId: string,
  startDate: string,
  endDate: string
): Promise<{ count: number; dates: string[] }> {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        status: "SCHEDULED",
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true },
      orderBy: { date: "asc" },
    });

    const uniqueDates = [...new Set(appointments.map((a) => a.date))];
    return { count: appointments.length, dates: uniqueDates };
  } catch (err) {
    console.error("[getConflictingAppointments]", err);
    return { count: 0, dates: [] };
  }
}

// ─── getConflictingAppointmentDetails ────────────────────────────────────────
// Full appointment details for the conflict resolution panel

export async function getConflictingAppointmentDetails(
  staffId: string,
  startDate: string,
  endDate: string
): Promise<
  {
    id: string;
    date: string;
    startTime: string;
    clientName: string;
    staffId: string;
    salonId: string;
  }[]
> {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        status: "SCHEDULED",
        date: { gte: startDate, lte: endDate },
      },
      include: { Client: { select: { name: true } } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return appointments.map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      clientName: a.Client?.name ?? "Walk-in",
      staffId: a.staffId,
      salonId: a.salonId,
    }));
  } catch (err) {
    console.error("[getConflictingAppointmentDetails]", err);
    return [];
  }
}

// ─── reassignAppointment ──────────────────────────────────────────────────────

export async function reassignAppointment(
  appointmentId: string,
  newStaffId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appt) return { success: false, error: "Appointment not found" };

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { staffId: newStaffId },
    });

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/staff/time-off");
    return { success: true };
  } catch (err) {
    console.error("[reassignAppointment]", err);
    return { success: false, error: "Failed to reassign appointment" };
  }
}

// ─── cancelAppointmentForLeave ────────────────────────────────────────────────

export async function cancelAppointmentForLeave(
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appt) return { success: false, error: "Appointment not found" };

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/staff/time-off");
    return { success: true };
  } catch (err) {
    console.error("[cancelAppointmentForLeave]", err);
    return { success: false, error: "Failed to cancel appointment" };
  }
}

// ─── updateTimeOffAllowances ──────────────────────────────────────────────────
// Stored in Salon.businessHours as a JSON string with a __timeOffAllowances key

export async function updateTimeOffAllowances(
  allowances: Record<string, number>
): Promise<{ success: boolean; error?: string }> {
  try {
    const salonId = await getCurrentSalonId();
    const salon = await prisma.salon.findUniqueOrThrow({
      where: { id: salonId },
      select: { businessHours: true },
    });

    let parsed: Record<string, unknown> = {};
    if (salon.businessHours) {
      try {
        parsed = JSON.parse(salon.businessHours);
      } catch {
        parsed = {};
      }
    }

    // Merge new allowances into existing __timeOffAllowances
    const existing =
      (parsed.__timeOffAllowances as Record<string, { allowedDays: number; usedDays: number }>) ??
      {};
    const updated: Record<string, { allowedDays: number; usedDays: number }> = {};
    for (const [staffId, days] of Object.entries(allowances)) {
      updated[staffId] = {
        allowedDays: days,
        usedDays: existing[staffId]?.usedDays ?? 0,
      };
    }

    parsed.__timeOffAllowances = updated;

    await prisma.salon.update({
      where: { id: salonId },
      data: { businessHours: JSON.stringify(parsed), updatedAt: new Date() },
    });

    revalidatePath("/dashboard/staff/time-off");
    return { success: true };
  } catch (err) {
    console.error("[updateTimeOffAllowances]", err);
    return { success: false, error: "Failed to update allowances" };
  }
}

// ─── getTimeOffAllowances ─────────────────────────────────────────────────────

export async function getTimeOffAllowances(): Promise<
  Record<string, { allowedDays: number; usedDays: number }>
> {
  try {
    const salonId = await getCurrentSalonId();
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { businessHours: true },
    });
    if (!salon?.businessHours) return {};

    const parsed = JSON.parse(salon.businessHours);
    return (
      (parsed.__timeOffAllowances as Record<
        string,
        { allowedDays: number; usedDays: number }
      >) ?? {}
    );
  } catch {
    return {};
  }
}

// ─── syncUsedDays ─────────────────────────────────────────────────────────────
// Recomputes usedDays for all staff from approved TimeOff records (current year)

export async function syncUsedDays(): Promise<{ success: boolean; error?: string }> {
  try {
    const salonId = await getCurrentSalonId();
    const salon = await prisma.salon.findUniqueOrThrow({
      where: { id: salonId },
      select: { businessHours: true },
    });

    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const approvedRecords = await prisma.timeOff.findMany({
      where: {
        approved: true,
        startDate: { gte: yearStart, lte: yearEnd },
      },
    });

    const usedMap: Record<string, number> = {};
    for (const rec of approvedRecords) {
      const days = daysBetween(rec.startDate, rec.endDate);
      usedMap[rec.staffId] = (usedMap[rec.staffId] ?? 0) + days;
    }

    let parsed: Record<string, unknown> = {};
    if (salon.businessHours) {
      try {
        parsed = JSON.parse(salon.businessHours);
      } catch {
        parsed = {};
      }
    }

    const existing =
      (parsed.__timeOffAllowances as Record<
        string,
        { allowedDays: number; usedDays: number }
      >) ?? {};

    for (const [staffId, usedDays] of Object.entries(usedMap)) {
      if (existing[staffId]) {
        existing[staffId].usedDays = usedDays;
      } else {
        existing[staffId] = { allowedDays: 15, usedDays };
      }
    }

    parsed.__timeOffAllowances = existing;
    await prisma.salon.update({
      where: { id: salonId },
      data: { businessHours: JSON.stringify(parsed), updatedAt: new Date() },
    });

    return { success: true };
  } catch (err) {
    console.error("[syncUsedDays]", err);
    return { success: false, error: "Failed to sync used days" };
  }
}
