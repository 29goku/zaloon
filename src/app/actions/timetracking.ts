"use server";

import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export interface TimeEntry {
  id: string;
  staffId: string;
  clockIn: string; // ISO datetime string
  clockOut: string | null; // null = currently clocked in
  date: string; // YYYY-MM-DD
  totalMinutes: number | null; // computed on clock-out
  notes?: string;
}

// ── Helper: read/write __timeEntries in Salon.businessHours ───────────────────

async function getSalonId(): Promise<string | null> {
  const salon = await prisma.salon.findFirst({ select: { id: true } });
  return salon?.id ?? null;
}

async function readEntries(salonId: string): Promise<TimeEntry[]> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { businessHours: true },
  });
  if (!salon?.businessHours) return [];
  try {
    const parsed = JSON.parse(salon.businessHours);
    return (parsed.__timeEntries as TimeEntry[]) ?? [];
  } catch {
    return [];
  }
}

async function writeEntries(
  salonId: string,
  entries: TimeEntry[]
): Promise<void> {
  // Preserve existing businessHours data (non-time-entry fields)
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { businessHours: true },
  });
  let existing: Record<string, unknown> = {};
  if (salon?.businessHours) {
    try {
      existing = JSON.parse(salon.businessHours);
    } catch {
      existing = {};
    }
  }
  const updated = { ...existing, __timeEntries: entries };
  await prisma.salon.update({
    where: { id: salonId },
    data: { businessHours: JSON.stringify(updated) },
  });
}

// ── Clock In ───────────────────────────────────────────────────────────────────

export async function clockIn(
  staffId: string
): Promise<{ success: boolean; entry?: TimeEntry; error?: string }> {
  try {
    const salonId = await getSalonId();
    if (!salonId) return { success: false, error: "No salon found" };

    const entries = await readEntries(salonId);

    // Check if already clocked in
    const openEntry = entries.find(
      (e) => e.staffId === staffId && e.clockOut === null
    );
    if (openEntry) {
      return { success: false, error: "Staff is already clocked in" };
    }

    const now = new Date();
    const entry: TimeEntry = {
      id: randomUUID(),
      staffId,
      clockIn: now.toISOString(),
      clockOut: null,
      date: now.toISOString().split("T")[0],
      totalMinutes: null,
    };

    entries.push(entry);
    await writeEntries(salonId, entries);

    revalidatePath("/dashboard/staff/timeclock");
    return { success: true, entry };
  } catch (err) {
    console.error("[clockIn]", err);
    return { success: false, error: "Failed to clock in" };
  }
}

// ── Clock Out ──────────────────────────────────────────────────────────────────

export async function clockOut(
  staffId: string
): Promise<{ success: boolean; entry?: TimeEntry; error?: string }> {
  try {
    const salonId = await getSalonId();
    if (!salonId) return { success: false, error: "No salon found" };

    const entries = await readEntries(salonId);
    const idx = entries.findIndex(
      (e) => e.staffId === staffId && e.clockOut === null
    );

    if (idx === -1) {
      return { success: false, error: "Staff is not clocked in" };
    }

    const now = new Date();
    const clockInTime = new Date(entries[idx].clockIn);
    const totalMinutes = Math.round(
      (now.getTime() - clockInTime.getTime()) / 60000
    );

    entries[idx] = {
      ...entries[idx],
      clockOut: now.toISOString(),
      totalMinutes,
    };

    await writeEntries(salonId, entries);

    revalidatePath("/dashboard/staff/timeclock");
    return { success: true, entry: entries[idx] };
  } catch (err) {
    console.error("[clockOut]", err);
    return { success: false, error: "Failed to clock out" };
  }
}

// ── Get Clock Status ───────────────────────────────────────────────────────────

export async function getClockStatus(staffId: string): Promise<{
  isClockedIn: boolean;
  clockInTime?: string;
  minutesWorked?: number;
}> {
  try {
    const salonId = await getSalonId();
    if (!salonId) return { isClockedIn: false };

    const entries = await readEntries(salonId);
    const open = entries.find(
      (e) => e.staffId === staffId && e.clockOut === null
    );

    if (!open) return { isClockedIn: false };

    const minutesWorked = Math.round(
      (Date.now() - new Date(open.clockIn).getTime()) / 60000
    );
    return { isClockedIn: true, clockInTime: open.clockIn, minutesWorked };
  } catch {
    return { isClockedIn: false };
  }
}

// ── Get Time Entries ───────────────────────────────────────────────────────────

export async function getTimeEntries(
  staffId: string,
  from: Date,
  to: Date
): Promise<TimeEntry[]> {
  try {
    const salonId = await getSalonId();
    if (!salonId) return [];

    const entries = await readEntries(salonId);
    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    return entries.filter(
      (e) =>
        e.staffId === staffId && e.date >= fromStr && e.date <= toStr
    );
  } catch {
    return [];
  }
}

// ── Get Time Summary ───────────────────────────────────────────────────────────

export async function getTimeSummary(
  from: Date,
  to: Date
): Promise<
  Array<{
    staffId: string;
    staffName: string;
    totalHours: number;
    daysWorked: number;
    avgHoursPerDay: number;
    entries: TimeEntry[];
  }>
> {
  try {
    const salonId = await getSalonId();
    if (!salonId) return [];

    const [entries, allStaff] = await Promise.all([
      readEntries(salonId),
      prisma.staff.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    return allStaff.map((staff) => {
      const staffEntries = entries.filter(
        (e) =>
          e.staffId === staff.id &&
          e.date >= fromStr &&
          e.date <= toStr &&
          e.clockOut !== null
      );
      const totalMinutes = staffEntries.reduce(
        (sum, e) => sum + (e.totalMinutes ?? 0),
        0
      );
      const uniqueDays = new Set(staffEntries.map((e) => e.date)).size;
      const totalHours = totalMinutes / 60;
      const avgHoursPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0;

      return {
        staffId: staff.id,
        staffName: staff.name,
        totalHours,
        daysWorked: uniqueDays,
        avgHoursPerDay,
        entries: staffEntries,
      };
    });
  } catch {
    return [];
  }
}

// ── Manual Entry ───────────────────────────────────────────────────────────────

export async function manualEntry(
  staffId: string,
  date: string,
  clockInStr: string,
  clockOutStr: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const salonId = await getSalonId();
    if (!salonId) return { success: false, error: "No salon found" };

    const entries = await readEntries(salonId);

    const clockIn = new Date(clockInStr);
    const clockOut = new Date(clockOutStr);
    if (isNaN(clockIn.getTime()) || isNaN(clockOut.getTime())) {
      return { success: false, error: "Invalid time values" };
    }
    if (clockOut <= clockIn) {
      return { success: false, error: "Clock-out must be after clock-in" };
    }

    const totalMinutes = Math.round(
      (clockOut.getTime() - clockIn.getTime()) / 60000
    );

    const entry: TimeEntry = {
      id: randomUUID(),
      staffId,
      clockIn: clockIn.toISOString(),
      clockOut: clockOut.toISOString(),
      date,
      totalMinutes,
      notes,
    };

    entries.push(entry);
    await writeEntries(salonId, entries);

    revalidatePath("/dashboard/staff/timeclock");
    revalidatePath(`/dashboard/staff/${staffId}`);
    return { success: true };
  } catch (err) {
    console.error("[manualEntry]", err);
    return { success: false, error: "Failed to save entry" };
  }
}

// ── Edit Entry ─────────────────────────────────────────────────────────────────

export async function editEntry(
  entryId: string,
  data: Partial<TimeEntry>
): Promise<{ success: boolean; error?: string }> {
  try {
    const salonId = await getSalonId();
    if (!salonId) return { success: false, error: "No salon found" };

    const entries = await readEntries(salonId);
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return { success: false, error: "Entry not found" };

    const updated = { ...entries[idx], ...data };

    // Recompute totalMinutes if both times are present
    if (updated.clockIn && updated.clockOut) {
      const ci = new Date(updated.clockIn);
      const co = new Date(updated.clockOut);
      if (!isNaN(ci.getTime()) && !isNaN(co.getTime())) {
        updated.totalMinutes = Math.round(
          (co.getTime() - ci.getTime()) / 60000
        );
      }
    }

    entries[idx] = updated;
    await writeEntries(salonId, entries);

    revalidatePath("/dashboard/staff/timeclock");
    return { success: true };
  } catch (err) {
    console.error("[editEntry]", err);
    return { success: false, error: "Failed to edit entry" };
  }
}

// ── Delete Entry ───────────────────────────────────────────────────────────────

export async function deleteEntry(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const salonId = await getSalonId();
    if (!salonId) return { success: false, error: "No salon found" };

    const entries = await readEntries(salonId);
    const filtered = entries.filter((e) => e.id !== entryId);
    if (filtered.length === entries.length) {
      return { success: false, error: "Entry not found" };
    }

    await writeEntries(salonId, filtered);

    revalidatePath("/dashboard/staff/timeclock");
    return { success: true };
  } catch (err) {
    console.error("[deleteEntry]", err);
    return { success: false, error: "Failed to delete entry" };
  }
}
