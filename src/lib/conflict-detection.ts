import { PrismaClient } from "@prisma/client";

export interface TimeSlot {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  date: string;      // "YYYY-MM-DD"
}

export interface ConflictInfo {
  type: "staff_double_booked" | "client_double_booked" | "outside_shift";
  staffName?: string;
  clientName?: string;
  conflictingAppointmentId?: string;
  conflictingTime?: string;
  message: string;
}

/** Parse "HH:MM" to minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Format minutes since midnight as "HH:MM" */
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Check if two time slots overlap (on the same date) */
export function timeSlotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if (a.date !== b.date) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  // Overlap if: aStart < bEnd AND aEnd > bStart
  return aStart < bEnd && aEnd > bStart;
}

/** Check for conflicts before creating/updating an appointment */
export async function checkAppointmentConflicts(
  prismaClient: PrismaClient,
  params: {
    staffId: string;
    date: string;
    startTime: string;
    durationMins: number;
    excludeAppointmentId?: string; // for updates — exclude self
    clientId?: string | null;
  }
): Promise<ConflictInfo[]> {
  const { staffId, date, startTime, durationMins, excludeAppointmentId, clientId } = params;

  const conflicts: ConflictInfo[] = [];

  const endMins = timeToMinutes(startTime) + durationMins;
  const endTime = minutesToTime(endMins);

  const newSlot: TimeSlot = { startTime, endTime, date };

  // ── 1. Check for staff double-booking ────────────────────────────────────────

  const staffAppointments = await prismaClient.appointment.findMany({
    where: {
      staffId,
      date,
      status: { not: "CANCELLED" },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    include: {
      Client: { select: { name: true } },
      AppointmentService: {
        include: { Service: { select: { durationMins: true } } },
      },
    },
  });

  let staffName: string | undefined;
  try {
    const staffRecord = await prismaClient.staff.findUnique({
      where: { id: staffId },
      select: { name: true },
    });
    staffName = staffRecord?.name ?? undefined;
  } catch {
    // non-fatal
  }

  for (const existing of staffAppointments) {
    const existingDuration = existing.AppointmentService.reduce(
      (sum, as) => sum + as.Service.durationMins,
      0
    ) || 30;
    const existingEndMins = timeToMinutes(existing.startTime) + existingDuration;
    const existingSlot: TimeSlot = {
      startTime: existing.startTime,
      endTime: minutesToTime(existingEndMins),
      date,
    };

    if (timeSlotsOverlap(newSlot, existingSlot)) {
      conflicts.push({
        type: "staff_double_booked",
        staffName,
        conflictingAppointmentId: existing.id,
        conflictingTime: existing.startTime,
        message: `${staffName ?? "Staff"} is already booked at ${existing.startTime} (until ${existingSlot.endTime})`,
      });
    }
  }

  // ── 2. Check if staff has a shift for that day ────────────────────────────────

  const [y, mo, d] = date.split("-").map(Number);
  const dayOfWeek = new Date(y, mo - 1, d).getDay();

  const shift = await prismaClient.shift.findFirst({
    where: { staffId, dayOfWeek },
  });

  if (!shift) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    conflicts.push({
      type: "outside_shift",
      staffName,
      message: `${staffName ?? "Staff"} has no scheduled shift on ${dayNames[dayOfWeek]}s`,
    });
  } else {
    // Also check if appointment falls outside shift hours
    const shiftStartMins = timeToMinutes(shift.startTime);
    const shiftEndMins = timeToMinutes(shift.endTime);
    const apptStartMins = timeToMinutes(startTime);

    if (apptStartMins < shiftStartMins || endMins > shiftEndMins) {
      conflicts.push({
        type: "outside_shift",
        staffName,
        message: `Appointment time (${startTime}–${endTime}) falls outside ${staffName ?? "staff"}'s shift hours (${shift.startTime}–${shift.endTime})`,
      });
    }
  }

  // ── 3. Optionally check client double-booking ─────────────────────────────────

  if (clientId) {
    const clientAppointments = await prismaClient.appointment.findMany({
      where: {
        clientId,
        date,
        status: { not: "CANCELLED" },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      include: {
        AppointmentService: {
          include: { Service: { select: { durationMins: true } } },
        },
      },
    });

    let clientName: string | undefined;
    try {
      const clientRecord = await prismaClient.client.findUnique({
        where: { id: clientId },
        select: { name: true },
      });
      clientName = clientRecord?.name ?? undefined;
    } catch {
      // non-fatal
    }

    for (const existing of clientAppointments) {
      const existingDuration = existing.AppointmentService.reduce(
        (sum, as) => sum + as.Service.durationMins,
        0
      ) || 30;
      const existingEndMins = timeToMinutes(existing.startTime) + existingDuration;
      const existingSlot: TimeSlot = {
        startTime: existing.startTime,
        endTime: minutesToTime(existingEndMins),
        date,
      };

      if (timeSlotsOverlap(newSlot, existingSlot)) {
        conflicts.push({
          type: "client_double_booked",
          clientName,
          conflictingAppointmentId: existing.id,
          conflictingTime: existing.startTime,
          message: `${clientName ?? "Client"} already has an appointment at ${existing.startTime}`,
        });
      }
    }
  }

  return conflicts;
}
