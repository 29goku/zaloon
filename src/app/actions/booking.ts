"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const bookingSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
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

  const { serviceId, staffId, date, startTime, clientName, clientPhone, clientEmail } =
    parsed.data;

  try {
    // 1. Verify salon exists
    const salon = await prisma.salon.findUnique({ where: { slug: salonSlug } });
    if (!salon) {
      return { success: false, error: "Salon not found" };
    }

    // 2. Verify service belongs to this salon
    const service = await prisma.service.findFirst({
      where: { id: serviceId, salonId: salon.id },
      select: { id: true, price: true },
    });
    if (!service) {
      return { success: false, error: "Service not found" };
    }

    // 3. Verify staff belongs to this salon AND provides this service
    const staffService = await prisma.staffService.findFirst({
      where: { staffId, serviceId },
    });
    if (!staffService) {
      return { success: false, error: "This staff member does not provide the selected service" };
    }

    const staffMember = await prisma.staff.findFirst({
      where: { id: staffId, salonId: salon.id },
    });
    if (!staffMember) {
      return { success: false, error: "Staff member not found" };
    }

    // 4. Find or create client by phone
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

    // 5. Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        clientId: client.id,
        staffId,
        date,
        startTime,
        totalAmount: service.price,
        status: "SCHEDULED",
        AppointmentService: {
          create: [{ id: randomUUID(), serviceId }],
        },
      },
    });

    // Short ID: last 6 chars of cuid, uppercased
    const shortId = appointment.id.slice(-6).toUpperCase();

    return { success: true, appointmentId: appointment.id, shortId };
  } catch (err) {
    console.error("[requestBooking]", err);
    return { success: false, error: "Failed to create booking" };
  }
}
