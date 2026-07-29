import type { PrismaClient } from "@prisma/client";

export interface AvailableSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  staffId: string;
  staffName: string;
  durationMins: number;
}

/** Parse "HH:MM" into total minutes since midnight */
function toMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Format minutes since midnight as "HH:MM" */
function fromMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Return YYYY-MM-DD for `daysFromToday` days from now */
function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** Day-of-week index (0 = Sunday … 6 = Saturday) for a YYYY-MM-DD string */
function dayOfWeekFor(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getDay();
}

export async function findNextAvailableSlots(
  prismaClient: PrismaClient,
  params: {
    serviceId: string;
    staffId?: string;
    daysAhead?: number;
    maxSlots?: number;
  }
): Promise<AvailableSlot[]> {
  const { serviceId, staffId, daysAhead = 14, maxSlots = 5 } = params;

  // 1. Get service duration
  const service = await prismaClient.service.findUnique({
    where: { id: serviceId },
    select: { durationMins: true },
  });
  if (!service) return [];

  const durationMins = service.durationMins;

  // 2. Determine which staff to check
  let staffList: { id: string; name: string }[] = [];

  if (staffId) {
    const s = await prismaClient.staff.findUnique({
      where: { id: staffId },
      select: { id: true, name: true },
    });
    if (s) staffList = [s];
  } else {
    // All staff who have the service linked via StaffService
    const staffServices = await prismaClient.staffService.findMany({
      where: { serviceId },
      select: {
        Staff: { select: { id: true, name: true } },
      },
    });
    // Fallback: if no StaffService records exist, use all staff
    if (staffServices.length > 0) {
      staffList = staffServices.map((ss) => ss.Staff);
    } else {
      staffList = await prismaClient.staff.findMany({
        select: { id: true, name: true },
      });
    }
  }

  if (staffList.length === 0) return [];

  const today = new Date();
  const slots: AvailableSlot[] = [];

  // 3. For each day in range
  for (let dayOffset = 0; dayOffset < daysAhead && slots.length < maxSlots; dayOffset++) {
    const dateStr = addDays(today, dayOffset);
    const dow = dayOfWeekFor(dateStr);

    for (const staff of staffList) {
      if (slots.length >= maxSlots) break;

      // 4. Find shift for this staff on this day-of-week
      const shift = await prismaClient.shift.findFirst({
        where: { staffId: staff.id, dayOfWeek: dow },
        select: { startTime: true, endTime: true },
      });
      if (!shift) continue;

      const shiftStart = toMins(shift.startTime);
      const shiftEnd = toMins(shift.endTime);

      // 5. Get existing appointments for this staff on this date
      const existingAppts = await prismaClient.appointment.findMany({
        where: {
          staffId: staff.id,
          date: dateStr,
          status: { not: "CANCELLED" },
        },
        include: {
          AppointmentService: {
            include: {
              Service: { select: { durationMins: true } },
            },
          },
        },
        orderBy: { startTime: "asc" },
      });

      // Build list of [startMins, endMins] blocks that are already booked
      const bookedBlocks: [number, number][] = existingAppts.map((appt) => {
        const start = toMins(appt.startTime);
        const totalDuration = appt.AppointmentService.reduce(
          (sum, as) => sum + (as.Service?.durationMins ?? 30),
          0
        );
        return [start, start + totalDuration];
      });

      // 6. Walk through shift in 30-min increments, check if durationMins fits
      const STEP = 30;
      for (
        let slotStart = shiftStart;
        slotStart + durationMins <= shiftEnd;
        slotStart += STEP
      ) {
        const slotEnd = slotStart + durationMins;

        // Check no overlap with booked blocks
        const hasConflict = bookedBlocks.some(
          ([bs, be]) => slotStart < be && slotEnd > bs
        );
        if (!hasConflict) {
          slots.push({
            date: dateStr,
            startTime: fromMins(slotStart),
            endTime: fromMins(slotEnd),
            staffId: staff.id,
            staffName: staff.name,
            durationMins,
          });
          if (slots.length >= maxSlots) break;
        }
      }
    }
  }

  // Sort by date then startTime
  slots.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return slots.slice(0, maxSlots);
}
