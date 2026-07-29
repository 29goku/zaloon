"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { isStaffAvailable } from "@/app/actions/time-off";

// ─── getAvailableSlots ──────────────────────────────────────────────────────────
//
// Returns an array of "HH:MM" time strings for a given staff member on a given
// date, considering:
//   1. The staff's Shift for that day-of-week (provides the working window).
//   2. Existing Appointments on that date (blocks occupied slots).
//
// Slots are generated in 30-minute increments starting from shift start time.
// A slot is excluded if [slotStart, slotStart + serviceDurationMins) overlaps
// any existing appointment block.

export async function getAvailableSlots(
  staffId: string,
  date: string, // "YYYY-MM-DD"
  serviceDurationMins: number
): Promise<string[]> {
  if (!staffId || !date) return [];

  // 0. Check if staff member has approved time off on this date
  const available = await isStaffAvailable(staffId, date);
  if (!available) return [];

  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = dateObj.getDay(); // 0=Sun … 6=Sat

  // 1. Find shift for this staff on this day-of-week
  const shift = await prisma.shift.findFirst({
    where: { staffId, dayOfWeek },
  });
  if (!shift) return [];

  // 2. Fetch existing appointments for this staff on this date
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

  // Convert "HH:MM" to minutes-since-midnight
  function toMins(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  // Convert minutes-since-midnight to "HH:MM"
  function toTime(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const shiftStart = toMins(shift.startTime);
  const shiftEnd = toMins(shift.endTime);

  // Build blocked intervals from existing appointments
  // Each appointment starts at startTime, lasts sum-of-service durations
  const blocked: Array<{ start: number; end: number }> = appointments.map((appt) => {
    const start = toMins(appt.startTime);
    const totalDuration = appt.AppointmentService.reduce(
      (sum, as) => sum + as.Service.durationMins,
      0
    );
    return { start, end: start + (totalDuration || 30) };
  });

  // Generate candidate slots every 30 minutes within the shift window
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

  return slots;
}

// ─── requestBooking ─────────────────────────────────────────────────────────────

const bookingSchema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1, "At least one service is required"),
  staffId: z.string().min(1, "Staff is required"),
  date: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z
    .string()
    .min(1, "Time is required")
    .regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  clientName: z.string().min(1, "Name is required"),
  clientPhone: z.string().min(1, "Phone is required"),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  note: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export async function requestBooking(
  salonSlug: string,
  data: BookingInput
): Promise<
  | { success: true; appointmentId: string; shortId: string }
  | { success: false; error: string }
> {
  const parsed = bookingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { serviceIds, staffId, date, startTime, clientName, clientPhone, clientEmail, note } =
    parsed.data;

  try {
    // 1. Verify salon exists
    const salon = await prisma.salon.findUnique({ where: { slug: salonSlug } });
    if (!salon) {
      return { success: false, error: "Salon not found" };
    }

    // 2. Verify services belong to this salon
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, salonId: salon.id },
      select: { id: true, price: true },
    });
    if (services.length !== serviceIds.length) {
      return { success: false, error: "One or more services not found" };
    }

    // 3. Verify staff belongs to this salon
    const staffMember = await prisma.staff.findFirst({
      where: { id: staffId, salonId: salon.id },
    });
    if (!staffMember) {
      return { success: false, error: "Staff member not found" };
    }

    // 4. Verify staff provides all selected services
    const staffServices = await prisma.staffService.findMany({
      where: { staffId, serviceId: { in: serviceIds } },
    });
    if (staffServices.length !== serviceIds.length) {
      return {
        success: false,
        error: "This staff member does not provide all selected services",
      };
    }

    // 5. Find or create client by phone
    let client = clientPhone
      ? await prisma.client.findFirst({
          where: { salonId: salon.id, phone: clientPhone },
        })
      : null;

    if (!client) {
      client = await prisma.client.create({
        data: {
          id: randomUUID(),
          salonId: salon.id,
          name: clientName,
          phone: clientPhone || null,
          email: clientEmail || null,
        },
      });
    }

    const totalAmount = services.reduce((sum, s) => sum + s.price, 0);

    // 6. Create the appointment with all services
    const appointment = await prisma.appointment.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        clientId: client.id,
        staffId,
        date,
        startTime,
        totalAmount,
        status: "SCHEDULED",
        notes: note || null,
        AppointmentService: {
          create: serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
    });

    // Short reference: last 6 chars uppercased
    const shortId = appointment.id.slice(-6).toUpperCase();

    return { success: true, appointmentId: appointment.id, shortId };
  } catch (err) {
    console.error("[requestBooking]", err);
    return { success: false, error: "Failed to create booking. Please try again." };
  }
}
