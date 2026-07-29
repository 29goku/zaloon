import { prisma } from "@/lib/prisma";
import { isStaffAvailable } from "@/app/actions/time-off";
import { type NextRequest } from "next/server";

// ─── helpers (same logic as getAvailableSlots in actions/booking.ts) ─────────

function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function toTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// GET /api/v1/booking/slots?date=YYYY-MM-DD&staffId=...&serviceId=...
// serviceId may be repeated (?serviceId=x&serviceId=y) or comma-separated
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date");
    const staffId = searchParams.get("staffId");

    // Collect one or more serviceId values
    const serviceIds = searchParams.getAll("serviceId");

    if (!date || !staffId) {
      return Response.json(
        { error: "date and staffId query parameters are required" },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json(
        { error: "date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Check time-off
    const available = await isStaffAvailable(staffId, date);
    if (!available) {
      return Response.json({ data: [] });
    }

    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay();

    // 1. Find shift
    const shift = await prisma.shift.findFirst({
      where: { staffId, dayOfWeek },
    });
    if (!shift) {
      return Response.json({ data: [] });
    }

    // 2. Determine service duration
    let serviceDurationMins = 30; // default slot size
    if (serviceIds.length > 0) {
      const services = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { durationMins: true },
      });
      if (services.length > 0) {
        serviceDurationMins = services.reduce(
          (sum, s) => sum + s.durationMins,
          0
        );
      }
    }

    // 3. Fetch existing appointments for this staff on this date
    const appointments = await prisma.appointment.findMany({
      where: { staffId, date, status: { not: "CANCELLED" } },
      include: {
        AppointmentService: {
          include: {
            Service: { select: { durationMins: true } },
          },
        },
      },
    });

    const shiftStart = toMins(shift.startTime);
    const shiftEnd = toMins(shift.endTime);

    // Build blocked intervals
    const blocked: Array<{ start: number; end: number }> = appointments.map(
      (appt) => {
        const start = toMins(appt.startTime);
        const totalDuration = appt.AppointmentService.reduce(
          (sum, as) => sum + as.Service.durationMins,
          0
        );
        return { start, end: start + (totalDuration || 30) };
      }
    );

    // Generate candidate slots every 30 minutes
    const slots: string[] = [];
    const slotInterval = 30;

    for (
      let slotStart = shiftStart;
      slotStart + serviceDurationMins <= shiftEnd;
      slotStart += slotInterval
    ) {
      const slotEnd = slotStart + serviceDurationMins;
      const overlaps = blocked.some(
        (b) => slotStart < b.end && slotEnd > b.start
      );
      if (!overlaps) {
        slots.push(toTime(slotStart));
      }
    }

    return Response.json({ data: slots });
  } catch (err) {
    console.error("[GET /api/v1/booking/slots]", err);
    return Response.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
}
