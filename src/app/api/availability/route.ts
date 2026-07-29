import { prisma } from "@/lib/prisma";
import { timeToMinutes } from "@/lib/conflict-detection";

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// GET /api/availability?staffId=...&date=YYYY-MM-DD&duration=30
// Returns available time slots (HH:MM) for a staff+date+duration combination.
// Slots are generated within shift hours, minus booked appointments (with service-based durations).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId");
  const date = searchParams.get("date");
  const duration = parseInt(searchParams.get("duration") ?? "30", 10);

  if (!staffId || !date) {
    return Response.json(
      { error: "staffId and date query parameters are required" },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json(
      { error: "date must be in YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  const slotDuration = isNaN(duration) || duration <= 0 ? 30 : duration;

  try {
    // 1. Find shift for this staff on this day of week
    const [y, mo, d] = date.split("-").map(Number);
    const dayOfWeek = new Date(y, mo - 1, d).getDay();

    const shift = await prisma.shift.findFirst({
      where: { staffId, dayOfWeek },
    });

    if (!shift) {
      // No shift — no available slots
      return Response.json({ slots: [] });
    }

    const shiftStartMins = timeToMinutes(shift.startTime);
    const shiftEndMins = timeToMinutes(shift.endTime);

    // 2. Fetch existing booked appointments for this staff+date
    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        date,
        status: { not: "CANCELLED" },
      },
      include: {
        AppointmentService: {
          include: { Service: { select: { durationMins: true } } },
        },
      },
    });

    // Build blocked intervals (start, end) in minutes
    const blocked: Array<{ start: number; end: number }> = appointments.map((appt) => {
      const apptStart = timeToMinutes(appt.startTime);
      const apptDuration = appt.AppointmentService.reduce(
        (sum, as) => sum + as.Service.durationMins,
        0
      ) || 30;
      // Add a small buffer after each appointment (0 by default, could read from service)
      return { start: apptStart, end: apptStart + apptDuration };
    });

    // 3. Generate candidate slots every 30 minutes within shift hours
    const SLOT_INTERVAL = 30;
    const slots: string[] = [];

    for (
      let slotStart = shiftStartMins;
      slotStart + slotDuration <= shiftEndMins;
      slotStart += SLOT_INTERVAL
    ) {
      const slotEnd = slotStart + slotDuration;
      const overlaps = blocked.some((b) => slotStart < b.end && slotEnd > b.start);
      if (!overlaps) {
        slots.push(minutesToTime(slotStart));
      }
    }

    return Response.json({ slots });
  } catch (err) {
    console.error("[GET /api/availability]", err);
    return Response.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
