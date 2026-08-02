"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getCurrentSalonId } from "@/lib/repositories/base";

type Tx = Prisma.TransactionClient;

type Result = { success: true } | { success: false; error: string };

// ─── Update (upsert) a shift ───────────────────────────────────────────────────

export async function updateShift(
  staffId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<Result> {
  if (!staffId) return { success: false, error: "Missing staffId" };
  if (dayOfWeek < 0 || dayOfWeek > 6)
    return { success: false, error: "dayOfWeek must be 0–6" };
  if (!startTime || !endTime)
    return { success: false, error: "startTime and endTime are required" };

  try {
    const existing = await prisma.shift.findFirst({
      where: { staffId, dayOfWeek },
    });

    if (existing) {
      await prisma.shift.update({
        where: { id: existing.id },
        data: { startTime, endTime },
      });
    } else {
      await prisma.shift.create({
        data: {
          id: randomUUID(),
          staffId,
          dayOfWeek,
          startTime,
          endTime,
        },
      });
    }

    revalidatePath("/dashboard/staff/schedule");
    revalidatePath("/dashboard/staff/availability");
    return { success: true };
  } catch (err) {
    console.error("[updateShift]", err);
    return { success: false, error: "Failed to update shift" };
  }
}

// ─── Remove a shift (mark day off) ────────────────────────────────────────────

export async function removeShift(
  staffId: string,
  dayOfWeek: number
): Promise<Result> {
  if (!staffId) return { success: false, error: "Missing staffId" };

  try {
    await prisma.shift.deleteMany({ where: { staffId, dayOfWeek } });
    revalidatePath("/dashboard/staff/schedule");
    revalidatePath("/dashboard/staff/availability");
    return { success: true };
  } catch (err) {
    console.error("[removeShift]", err);
    return { success: false, error: "Failed to remove shift" };
  }
}

// ─── Get all shifts for all staff (keyed by staffId) ──────────────────────────

export type ShiftRow = {
  id: string;
  staffId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export async function getAllShifts(): Promise<Record<string, ShiftRow[]>> {
  const salonId = await getCurrentSalonId();
  const shifts = await prisma.shift.findMany({
    where: { Staff: { salonId } },
    orderBy: { dayOfWeek: "asc" },
  });
  const map: Record<string, ShiftRow[]> = {};
  for (const s of shifts) {
    if (!map[s.staffId]) map[s.staffId] = [];
    map[s.staffId].push(s);
  }
  return map;
}

// ─── Copy shifts from one staff member to another ─────────────────────────────

export async function copyShifts(
  fromStaffId: string,
  toStaffId: string
): Promise<Result> {
  if (!fromStaffId || !toStaffId)
    return { success: false, error: "Both fromStaffId and toStaffId are required" };
  if (fromStaffId === toStaffId)
    return { success: false, error: "Source and target staff must be different" };

  try {
    const sourceShifts = await prisma.shift.findMany({
      where: { staffId: fromStaffId },
    });

    await prisma.$transaction(async (tx: Tx) => {
      // Delete existing shifts for target
      await tx.shift.deleteMany({ where: { staffId: toStaffId } });
      // Copy source shifts
      for (const s of sourceShifts) {
        await tx.shift.create({
          data: {
            id: randomUUID(),
            staffId: toStaffId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          },
        });
      }
    });

    revalidatePath("/dashboard/staff/schedule");
    revalidatePath("/dashboard/staff/availability");
    return { success: true };
  } catch (err) {
    console.error("[copyShifts]", err);
    return { success: false, error: "Failed to copy shifts" };
  }
}

// ─── Apply same shift to all staff on a specific day ──────────────────────────

export async function applyShiftToAll(
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<Result> {
  if (dayOfWeek < 0 || dayOfWeek > 6)
    return { success: false, error: "dayOfWeek must be 0–6" };
  if (!startTime || !endTime)
    return { success: false, error: "startTime and endTime are required" };

  try {
    const salonId = await getCurrentSalonId();
    const allStaff = await prisma.staff.findMany({ where: { salonId }, select: { id: true } });

    await prisma.$transaction(async (tx: Tx) => {
      for (const staff of allStaff) {
        const existing = await tx.shift.findFirst({
          where: { staffId: staff.id, dayOfWeek },
        });
        if (existing) {
          await tx.shift.update({
            where: { id: existing.id },
            data: { startTime, endTime },
          });
        } else {
          await tx.shift.create({
            data: {
              id: randomUUID(),
              staffId: staff.id,
              dayOfWeek,
              startTime,
              endTime,
            },
          });
        }
      }
    });

    revalidatePath("/dashboard/staff/schedule");
    revalidatePath("/dashboard/staff/availability");
    return { success: true };
  } catch (err) {
    console.error("[applyShiftToAll]", err);
    return { success: false, error: "Failed to apply shift to all staff" };
  }
}

// ─── createShift ──────────────────────────────────────────────────────────────

export async function createShift(data: {
  staffId: string;
  dayOfWeek: number; // 0=Sun, 1=Mon ... 6=Sat
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!data.staffId) return { success: false, error: "Missing staffId" };
  if (data.dayOfWeek < 0 || data.dayOfWeek > 6)
    return { success: false, error: "dayOfWeek must be 0–6" };
  if (!data.startTime || !data.endTime)
    return { success: false, error: "startTime and endTime are required" };

  try {
    // upsert: if a shift already exists for this staff+day, update it
    const existing = await prisma.shift.findFirst({
      where: { staffId: data.staffId, dayOfWeek: data.dayOfWeek },
    });

    if (existing) {
      await prisma.shift.update({
        where: { id: existing.id },
        data: { startTime: data.startTime, endTime: data.endTime },
      });
      revalidatePath("/dashboard/staff/schedule");
      return { success: true, id: existing.id };
    }

    const id = randomUUID();
    await prisma.shift.create({
      data: {
        id,
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
    revalidatePath("/dashboard/staff/schedule");
    return { success: true, id };
  } catch (err) {
    console.error("[createShift]", err);
    return { success: false, error: "Failed to create shift" };
  }
}

// ─── deleteShift ──────────────────────────────────────────────────────────────

export async function deleteShift(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: "Missing shift id" };
  try {
    await prisma.shift.delete({ where: { id } });
    revalidatePath("/dashboard/staff/schedule");
    return { success: true };
  } catch (err) {
    console.error("[deleteShift]", err);
    return { success: false, error: "Failed to delete shift" };
  }
}

// ─── setStaffSchedule ────────────────────────────────────────────────────────
// Replaces all existing shifts for a staff member with the new schedule.

export async function setStaffSchedule(
  staffId: string,
  schedule: { dayOfWeek: number; startTime: string; endTime: string }[]
): Promise<{ success: boolean; error?: string }> {
  if (!staffId) return { success: false, error: "Missing staffId" };

  try {
    await prisma.$transaction(async (tx: Tx) => {
      await tx.shift.deleteMany({ where: { staffId } });
      for (const entry of schedule) {
        await tx.shift.create({
          data: {
            id: randomUUID(),
            staffId,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
          },
        });
      }
    });
    revalidatePath("/dashboard/staff/schedule");
    return { success: true };
  } catch (err) {
    console.error("[setStaffSchedule]", err);
    return { success: false, error: "Failed to set staff schedule" };
  }
}

// ─── getWeeklySchedule ────────────────────────────────────────────────────────

export async function getWeeklySchedule(): Promise<{
  staff: {
    id: string;
    name: string;
    shifts: { id: string; dayOfWeek: number; startTime: string; endTime: string }[];
  }[];
}> {
  const allStaff = await prisma.staff.findMany({
    include: { Shift: { orderBy: { dayOfWeek: "asc" } } },
    orderBy: { name: "asc" },
  });

  return {
    staff: allStaff.map((s) => ({
      id: s.id,
      name: s.name,
      shifts: s.Shift.map((sh) => ({
        id: sh.id,
        dayOfWeek: sh.dayOfWeek,
        startTime: sh.startTime,
        endTime: sh.endTime,
      })),
    })),
  };
}

// ─── getStaffAvailabilityForDate ─────────────────────────────────────────────

export async function getStaffAvailabilityForDate(
  staffId: string,
  date: string // "YYYY-MM-DD"
): Promise<{
  hasShift: boolean;
  shiftStart: string | null;
  shiftEnd: string | null;
  onLeave: boolean;
  leaveReason: string | null;
  appointmentCount: number;
}> {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { Shift: true },
    });

    if (!staff) {
      return {
        hasShift: false,
        shiftStart: null,
        shiftEnd: null,
        onLeave: false,
        leaveReason: null,
        appointmentCount: 0,
      };
    }

    // Day of week for the given date
    const [y, m, d] = date.split("-").map(Number);
    const jsDay = new Date(y, m - 1, d).getDay(); // 0=Sun
    const shift = staff.Shift.find((s) => s.dayOfWeek === jsDay) ?? null;

    // Check approved time-off
    const timeOff = await prisma.timeOff.findFirst({
      where: {
        staffId,
        approved: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    // Count appointments on that date
    const appointmentCount = await prisma.appointment.count({
      where: { staffId, date },
    });

    return {
      hasShift: !!shift,
      shiftStart: shift?.startTime ?? null,
      shiftEnd: shift?.endTime ?? null,
      onLeave: !!timeOff,
      leaveReason: timeOff?.reason ?? null,
      appointmentCount,
    };
  } catch (err) {
    console.error("[getStaffAvailabilityForDate]", err);
    return {
      hasShift: false,
      shiftStart: null,
      shiftEnd: null,
      onLeave: false,
      leaveReason: null,
      appointmentCount: 0,
    };
  }
}

// ─── Set standard week for all staff (Mon-Fri 9-18, Sat 9-15, Sun off) ────────
// dayOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

const STANDARD_WEEK: Array<{
  dayOfWeek: number;
  startTime: string;
  endTime: string;
} | null> = [
  null,            // 0 = Sun (off)
  { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" }, // Mon
  { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" }, // Tue
  { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" }, // Wed
  { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" }, // Thu
  { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" }, // Fri
  { dayOfWeek: 6, startTime: "09:00", endTime: "15:00" }, // Sat
];

export async function setStandardWeek(): Promise<Result> {
  try {
    const salonId = await getCurrentSalonId();
    const allStaff = await prisma.staff.findMany({ where: { salonId }, select: { id: true } });

    await prisma.$transaction(async (tx: Tx) => {
      for (const staff of allStaff) {
        // Delete all shifts for this staff
        await tx.shift.deleteMany({ where: { staffId: staff.id } });
        // Re-create standard week
        for (const shift of STANDARD_WEEK) {
          if (!shift) continue; // Sunday = off
          await tx.shift.create({
            data: {
              id: randomUUID(),
              staffId: staff.id,
              dayOfWeek: shift.dayOfWeek,
              startTime: shift.startTime,
              endTime: shift.endTime,
            },
          });
        }
      }
    });

    revalidatePath("/dashboard/staff/schedule");
    revalidatePath("/dashboard/staff/availability");
    return { success: true };
  } catch (err) {
    console.error("[setStandardWeek]", err);
    return { success: false, error: "Failed to set standard week" };
  }
}
