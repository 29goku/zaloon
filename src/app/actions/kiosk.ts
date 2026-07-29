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

// ─── addWalkInToWaitlist ───────────────────────────────────────────────────────
//
// Kiosk walk-in: adds a walk-in to the waitlist with auto-positioned queue slot.
// Returns position and estimated wait time.

export async function addWalkInToWaitlist(input: {
  salonSlug: string;
  name: string;
  phone?: string;
  serviceId: string;
  staffId?: string;
  note?: string;
}): Promise<
  | { success: true; id: string; position: number; estimatedWaitMins: number }
  | { success: false; error: string }
> {
  const { salonSlug, name, phone, serviceId, staffId, note } = input;

  if (!salonSlug || !name || !serviceId) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    const salon = await prisma.salon.findUnique({
      where: { slug: salonSlug },
      select: { id: true },
    });
    if (!salon) return { success: false, error: "Salon not found" };

    const service = await prisma.service.findFirst({
      where: { id: serviceId, salonId: salon.id, active: true },
      select: { id: true, durationMins: true },
    });
    if (!service) return { success: false, error: "Service not found" };

    // Find or create client by phone
    let clientId: string | undefined;
    if (phone) {
      const normalised = phone.replace(/[\s\-().+]/g, "");
      let client = await prisma.client.findFirst({
        where: { salonId: salon.id, phone: { contains: normalised } },
        select: { id: true },
      });
      if (!client) {
        client = await prisma.client.create({
          data: { id: randomUUID(), salonId: salon.id, name, phone },
          select: { id: true },
        });
      }
      clientId = client.id;
    }

    // Determine next position and estimated wait
    const waitingEntries = await prisma.waitlist.findMany({
      where: { salonId: salon.id, status: "WAITING" },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { Service: { select: { durationMins: true } } },
    });

    const nextPosition = (waitingEntries[waitingEntries.length - 1]?.position ?? 0) + 1;
    const estimatedWaitMins = waitingEntries.reduce(
      (sum, e) => sum + (e.Service?.durationMins ?? 30),
      0
    );

    const today = new Date().toISOString().split("T")[0];

    const entry = await prisma.waitlist.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name,
        phone: phone ?? null,
        clientId: clientId ?? null,
        serviceId,
        staffId: staffId ?? null,
        preferredDate: today,
        note: note ?? "Walk-in via kiosk",
        status: "WAITING",
        position: nextPosition,
      },
    });

    revalidatePath("/dashboard/waitlist");
    revalidatePath("/dashboard/kiosk");
    return { success: true, id: entry.id, position: nextPosition, estimatedWaitMins };
  } catch (err) {
    console.error("[addWalkInToWaitlist]", err);
    return { success: false, error: "Failed to add to waitlist" };
  }
}

// ─── serveNextWalkIn ───────────────────────────────────────────────────────────
//
// Marks the top-of-queue waitlist entry as NOTIFIED (being served).
// Optionally creates an appointment if staffId + startTime provided.

export async function serveNextWalkIn(
  waitlistId: string,
  opts?: { staffId: string; startTime: string }
): Promise<
  | { success: true; appointmentId?: string }
  | { success: false; error: string }
> {
  if (!waitlistId) return { success: false, error: "Missing waitlist id" };

  try {
    const entry = await prisma.waitlist.findUnique({
      where: { id: waitlistId },
      select: {
        id: true,
        salonId: true,
        clientId: true,
        serviceId: true,
        name: true,
      },
    });
    if (!entry) return { success: false, error: "Waitlist entry not found" };

    if (opts?.staffId && opts?.startTime && entry.serviceId) {
      const serviceId = entry.serviceId;
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { price: true },
      });

      const today = new Date().toISOString().split("T")[0];

      const appointment = await prisma.$transaction(async (tx) => {
        const appt = await tx.appointment.create({
          data: {
            id: randomUUID(),
            salonId: entry.salonId,
            clientId: entry.clientId ?? null,
            staffId: opts.staffId,
            date: today,
            startTime: opts.startTime,
            totalAmount: service?.price ?? 0,
            notes: `Walk-in: ${entry.name}`,
            AppointmentService: {
              create: [{ serviceId }],
            },
          },
        });

        await tx.waitlist.update({
          where: { id: waitlistId },
          data: { status: "BOOKED" },
        });

        return appt;
      });

      revalidatePath("/dashboard/kiosk");
      revalidatePath("/dashboard/waitlist");
      revalidatePath("/dashboard/appointments");
      return { success: true, appointmentId: appointment.id };
    }

    // Just mark as being served (notified)
    await prisma.waitlist.update({
      where: { id: waitlistId },
      data: { status: "NOTIFIED", notifiedAt: new Date() },
    });

    revalidatePath("/dashboard/kiosk");
    revalidatePath("/dashboard/waitlist");
    return { success: true };
  } catch (err) {
    console.error("[serveNextWalkIn]", err);
    return { success: false, error: "Failed to serve next walk-in" };
  }
}

// ─── getKioskDashboardData ─────────────────────────────────────────────────────
//
// Aggregates data for the kiosk staff dashboard widget.

export async function getKioskDashboardData(): Promise<{
  checkedInToday: number;
  waitlist: Array<{
    id: string;
    name: string;
    position: number;
    serviceName: string | null;
    serviceDurationMins: number;
    estimatedWaitMins: number;
    createdAt: Date;
    status: string;
    staffPreference: string | null;
  }>;
  staffList: Array<{ id: string; name: string }>;
}> {
  const today = new Date().toISOString().split("T")[0];

  const [checkedInCount, waitlistEntries, staffList] = await Promise.all([
    // Count appointments that have been checked in today (IN_PROGRESS + COMPLETED)
    prisma.appointment.count({
      where: {
        date: today,
        status: { in: ["IN_PROGRESS", "COMPLETED"] },
      },
    }),
    prisma.waitlist.findMany({
      where: { status: { in: ["WAITING", "NOTIFIED"] } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        Service: { select: { name: true, durationMins: true } },
        Staff: { select: { name: true } },
      },
    }),
    prisma.staff.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Compute estimated wait for each entry
  let cumulativeWait = 0;
  const waitlist = waitlistEntries.map((entry) => {
    const wait = cumulativeWait;
    cumulativeWait += entry.Service?.durationMins ?? 30;
    return {
      id: entry.id,
      name: entry.name,
      position: entry.position,
      serviceName: entry.Service?.name ?? null,
      serviceDurationMins: entry.Service?.durationMins ?? 30,
      estimatedWaitMins: wait,
      createdAt: entry.createdAt,
      status: entry.status,
      staffPreference: entry.Staff?.name ?? null,
    };
  });

  return { checkedInToday: checkedInCount, waitlist, staffList };
}
