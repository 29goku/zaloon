import { prisma } from "@/lib/prisma";

export interface TimeSlot {
  time: string;
  available: boolean;
  staffId?: string;
  staffName?: string;
}

export async function getAvailableSlots(params: {
  salonId: string;
  serviceIds: string[];
  staffId?: string;
  date: string;
  slotInterval?: number;
}): Promise<TimeSlot[]> {
  const { salonId, serviceIds, staffId, date, slotInterval = 30 } = params;

  const salon = await prisma.salon.findUnique({ where: { id: salonId } });
  if (!salon) return [];

  // Check blackout dates
  let businessHoursBlob: Record<string, unknown> = {};
  try {
    businessHoursBlob = JSON.parse(salon.businessHours ?? "{}") as Record<string, unknown>;
  } catch {
    businessHoursBlob = {};
  }

  const blackoutDates = (businessHoursBlob.__blackoutDates as Array<{
    startDate: string;
    endDate?: string;
    recurring?: boolean;
  }> | undefined) ?? [];

  const todayYear = new Date(date).getFullYear();
  const isBlackedOut = blackoutDates.some((b) => {
    const start = b.recurring
      ? b.startDate.replace(/^\d{4}/, String(todayYear))
      : b.startDate;
    const end = b.endDate
      ? b.recurring
        ? b.endDate.replace(/^\d{4}/, String(todayYear))
        : b.endDate
      : start;
    return date >= start && date <= end;
  });

  if (isBlackedOut) return [];

  // Get total service duration
  const services = serviceIds.length > 0
    ? await prisma.service.findMany({ where: { id: { in: serviceIds } } })
    : [];
  const totalDuration = services.reduce((sum, s) => sum + s.durationMins, 0) || 60;

  // Get staff with shifts today
  const dayOfWeek = new Date(date).getDay();
  const staffQuery = staffId
    ? prisma.staff.findMany({
        where: { id: staffId, Shift: { some: { dayOfWeek } } },
        include: { Shift: { where: { dayOfWeek } } },
      })
    : prisma.staff.findMany({
        where: { salonId, Shift: { some: { dayOfWeek } } },
        include: { Shift: { where: { dayOfWeek } } },
      });

  const staffWithShifts = await staffQuery;
  if (staffWithShifts.length === 0) return [];

  // Get existing appointments for the date
  const existingAppts = await prisma.appointment.findMany({
    where: {
      salonId,
      date,
      status: { notIn: ["CANCELLED"] },
      ...(staffId ? { staffId } : {}),
    },
    include: {
      AppointmentService: { include: { Service: true } },
    },
  });

  // For each staff member, map their booked blocks
  type BookedBlock = { startMins: number; endMins: number };
  const staffBlocks = new Map<string, BookedBlock[]>();
  for (const appt of existingAppts) {
    const [h, m] = appt.startTime.split(":").map(Number);
    const startMins = (h || 0) * 60 + (m || 0);
    const apptDuration = appt.AppointmentService.reduce(
      (sum, as) => sum + as.Service.durationMins,
      0
    ) || 30;
    const endMins = startMins + apptDuration;
    if (!staffBlocks.has(appt.staffId)) staffBlocks.set(appt.staffId, []);
    staffBlocks.get(appt.staffId)!.push({ startMins, endMins });
  }

  // Generate slots using the first available staff member per time slot
  const allSlots = new Map<string, TimeSlot>();

  for (const staff of staffWithShifts) {
    const shift = staff.Shift[0];
    if (!shift) continue;

    const [sh, sm] = shift.startTime.split(":").map(Number);
    const [eh, em] = shift.endTime.split(":").map(Number);
    const shiftStart = (sh || 0) * 60 + (sm || 0);
    const shiftEnd = (eh || 0) * 60 + (em || 0);

    const blocks = staffBlocks.get(staff.id) ?? [];

    for (let mins = shiftStart; mins + totalDuration <= shiftEnd; mins += slotInterval) {
      const timeStr = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

      const hasConflict = blocks.some(
        (b) => mins < b.endMins && mins + totalDuration > b.startMins
      );

      if (!hasConflict && !allSlots.has(timeStr)) {
        allSlots.set(timeStr, {
          time: timeStr,
          available: true,
          staffId: staff.id,
          staffName: staff.name,
        });
      } else if (!allSlots.has(timeStr)) {
        allSlots.set(timeStr, { time: timeStr, available: false });
      }
    }
  }

  return Array.from(allSlots.values()).sort((a, b) => a.time.localeCompare(b.time));
}
