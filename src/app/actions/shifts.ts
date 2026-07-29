"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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
  const shifts = await prisma.shift.findMany({ orderBy: { dayOfWeek: "asc" } });
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
    const allStaff = await prisma.staff.findMany({ select: { id: true } });

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
    const allStaff = await prisma.staff.findMany({ select: { id: true } });

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
