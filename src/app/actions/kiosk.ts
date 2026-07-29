"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type KioskAppointment = {
  id: string;
  date: string;
  startTime: string;
  status: string;
  clientName: string;
  staffName: string;
  AppointmentService: { Service: { name: string; price: number } }[];
};

// ─── lookupClientByPhone ───────────────────────────────────────────────────────
//
// Finds a client by phone for a given salon slug, then returns their
// next upcoming SCHEDULED appointment for today.

export async function lookupClientByPhone(
  salonSlug: string,
  phone: string
): Promise<
  | { success: true; appointment: KioskAppointment }
  | { success: false; error?: string }
> {
  if (!salonSlug || !phone) {
    return { success: false, error: "Missing slug or phone" };
  }

  try {
    const salon = await prisma.salon.findUnique({
      where: { slug: salonSlug },
      select: { id: true },
    });

    if (!salon) return { success: false, error: "Salon not found" };

    // Normalise phone: strip spaces, dashes, parentheses
    const normalised = phone.replace(/[\s\-().+]/g, "");

    const client = await prisma.client.findFirst({
      where: {
        salonId: salon.id,
        phone: { contains: normalised },
      },
      select: { id: true, name: true },
    });

    if (!client) return { success: false };

    // Today in YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];

    const appointment = await prisma.appointment.findFirst({
      where: {
        salonId: salon.id,
        clientId: client.id,
        date: today,
        status: "SCHEDULED",
      },
      orderBy: { startTime: "asc" },
      include: {
        Staff: { select: { name: true } },
        AppointmentService: {
          include: {
            Service: { select: { name: true, price: true } },
          },
        },
      },
    });

    if (!appointment) return { success: false };

    return {
      success: true,
      appointment: {
        id: appointment.id,
        date: appointment.date,
        startTime: appointment.startTime,
        status: appointment.status,
        clientName: client.name,
        staffName: appointment.Staff.name,
        AppointmentService: appointment.AppointmentService.map((as) => ({
          Service: { name: as.Service.name, price: as.Service.price },
        })),
      },
    };
  } catch (err) {
    console.error("[lookupClientByPhone]", err);
    return { success: false, error: "Lookup failed" };
  }
}

// ─── checkInAppointment ────────────────────────────────────────────────────────
//
// Marks an appointment as IN_PROGRESS (it already exists in the valid statuses
// enum). If it has already been checked in or completed, it's a no-op success.

export async function checkInAppointment(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing appointment id" };

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: { status: true, notes: true },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found" };
    }

    // Already checked in or completed — treat as success
    if (appointment.status === "IN_PROGRESS" || appointment.status === "COMPLETED") {
      return { success: true };
    }

    // Build a check-in note with timestamp
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const checkinNote = `Checked in at ${hh}:${mm}`;
    const existingNotes = appointment.notes ?? "";
    const updatedNotes = existingNotes
      ? `${existingNotes}\n${checkinNote}`
      : checkinNote;

    await prisma.appointment.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        notes: updatedNotes,
      },
    });

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (err) {
    console.error("[checkInAppointment]", err);
    return { success: false, error: "Failed to check in" };
  }
}

// ─── kioskWalkIn ──────────────────────────────────────────────────────────────
//
// Creates a Waitlist entry from a kiosk walk-in.
// Also upserts the client record so subsequent visits find them.

export async function kioskWalkIn(input: {
  salonSlug: string;
  name: string;
  phone: string;
  serviceId: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const { salonSlug, name, phone, serviceId } = input;

  if (!salonSlug || !name || !serviceId) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    const salon = await prisma.salon.findUnique({
      where: { slug: salonSlug },
      select: { id: true },
    });

    if (!salon) return { success: false, error: "Salon not found" };

    // Verify service belongs to salon
    const service = await prisma.service.findFirst({
      where: { id: serviceId, salonId: salon.id, active: true },
      select: { id: true },
    });

    if (!service) return { success: false, error: "Service not found" };

    // Find or create client by phone (so future check-ins work)
    let clientId: string | undefined;
    if (phone) {
      const normalised = phone.replace(/[\s\-().+]/g, "");
      let client = await prisma.client.findFirst({
        where: { salonId: salon.id, phone: { contains: normalised } },
        select: { id: true },
      });
      if (!client) {
        client = await prisma.client.create({
          data: {
            id: randomUUID(),
            salonId: salon.id,
            name,
            phone,
          },
          select: { id: true },
        });
      }
      clientId = client.id;
    }

    // Today's date
    const today = new Date().toISOString().split("T")[0];

    const entry = await prisma.waitlist.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name,
        phone: phone || null,
        clientId: clientId ?? null,
        serviceId,
        preferredDate: today,
        note: "Walk-in via kiosk",
        status: "WAITING",
      },
    });

    revalidatePath("/dashboard/waitlist");
    return { success: true, id: entry.id };
  } catch (err) {
    console.error("[kioskWalkIn]", err);
    return { success: false, error: "Failed to add to waitlist" };
  }
}
