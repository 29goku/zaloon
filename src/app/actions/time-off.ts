"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const requestSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  startDate: z
    .string()
    .min(1, "Start date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
  endDate: z
    .string()
    .min(1, "End date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
  reason: z.string().optional(),
});

// ─── requestTimeOff ──────────────────────────────────────────────────────────

export async function requestTimeOff(
  staffId: string,
  startDate: string,
  endDate: string,
  reason?: string
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = requestSchema.safeParse({ staffId, startDate, endDate, reason });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (parsed.data.endDate < parsed.data.startDate) {
    return { success: false, error: "End date must be on or after start date" };
  }

  try {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) return { success: false, error: "Staff member not found" };

    const timeOff = await prisma.timeOff.create({
      data: {
        id: randomUUID(),
        staffId: parsed.data.staffId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        reason: parsed.data.reason ?? null,
        approved: false,
      },
    });

    return { success: true, id: timeOff.id };
  } catch (err) {
    console.error("[requestTimeOff]", err);
    return { success: false, error: "Failed to create time-off request" };
  }
}

// ─── approveTimeOff ──────────────────────────────────────────────────────────

export async function approveTimeOff(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const timeOff = await prisma.timeOff.findUnique({ where: { id } });
    if (!timeOff) return { success: false, error: "Time-off request not found" };

    await prisma.timeOff.update({ where: { id }, data: { approved: true } });
    return { success: true };
  } catch (err) {
    console.error("[approveTimeOff]", err);
    return { success: false, error: "Failed to approve time-off request" };
  }
}

// ─── denyTimeOff ─────────────────────────────────────────────────────────────

export async function denyTimeOff(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const timeOff = await prisma.timeOff.findUnique({ where: { id } });
    if (!timeOff) return { success: false, error: "Time-off request not found" };

    await prisma.timeOff.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    console.error("[denyTimeOff]", err);
    return { success: false, error: "Failed to deny time-off request" };
  }
}

// ─── getStaffTimeOff ─────────────────────────────────────────────────────────

export async function getStaffTimeOff(staffId?: string) {
  try {
    const records = await prisma.timeOff.findMany({
      where: staffId ? { staffId } : undefined,
      include: { Staff: { select: { id: true, name: true } } },
      orderBy: { startDate: "asc" },
    });
    return records;
  } catch (err) {
    console.error("[getStaffTimeOff]", err);
    return [];
  }
}

// ─── isStaffAvailable ────────────────────────────────────────────────────────
//
// Returns false if the given date falls within any approved TimeOff range for
// the staff member. A date "falls within" if startDate <= date <= endDate.

export async function isStaffAvailable(
  staffId: string,
  date: string // "YYYY-MM-DD"
): Promise<boolean> {
  try {
    const overlap = await prisma.timeOff.findFirst({
      where: {
        staffId,
        approved: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
    return overlap === null;
  } catch (err) {
    console.error("[isStaffAvailable]", err);
    // Fail open: if we can't check, allow booking rather than silently block
    return true;
  }
}
