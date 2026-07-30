"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ── deleteOldAppointments ──────────────────────────────────────────────────────

export async function deleteOldAppointments(): Promise<
  { success: true; deleted: number } | { success: false; error: string }
> {
  const session = await auth();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().split("T")[0]; // YYYY-MM-DD

    // Find appointment IDs to delete (those without invoices or with cascadable records)
    const appointments = await prisma.appointment.findMany({
      where: { date: { lt: cutoffStr } },
      select: { id: true },
    });

    if (appointments.length === 0) {
      return { success: true, deleted: 0 };
    }

    const ids = appointments.map((a) => a.id);

    // Delete dependent records first
    await prisma.appointmentService.deleteMany({
      where: { appointmentId: { in: ids } },
    });
    await prisma.reminder.deleteMany({
      where: { appointmentId: { in: ids } },
    });
    // Dissociate invoices (set appointmentId to null) instead of deleting financial records
    await prisma.invoice.updateMany({
      where: { appointmentId: { in: ids } },
      data: { appointmentId: null },
    });
    // Dissociate reviews
    await prisma.review.updateMany({
      where: { appointmentId: { in: ids } },
      data: { appointmentId: null },
    });

    const result = await prisma.appointment.deleteMany({
      where: { id: { in: ids } },
    });

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/settings/data");

    return { success: true, deleted: result.count };
  } catch (err) {
    console.error("[deleteOldAppointments]", err);
    return { success: false, error: "Failed to delete old appointments" };
  }
}

// ── deleteCancelledAppointments ────────────────────────────────────────────────

export async function deleteCancelledAppointments(): Promise<
  { success: true; deleted: number } | { success: false; error: string }
> {
  const session = await auth();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: { status: "CANCELLED" },
      select: { id: true },
    });

    if (appointments.length === 0) {
      return { success: true, deleted: 0 };
    }

    const ids = appointments.map((a) => a.id);

    await prisma.appointmentService.deleteMany({
      where: { appointmentId: { in: ids } },
    });
    await prisma.reminder.deleteMany({
      where: { appointmentId: { in: ids } },
    });
    await prisma.invoice.updateMany({
      where: { appointmentId: { in: ids } },
      data: { appointmentId: null },
    });
    await prisma.review.updateMany({
      where: { appointmentId: { in: ids } },
      data: { appointmentId: null },
    });

    const result = await prisma.appointment.deleteMany({
      where: { id: { in: ids } },
    });

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/settings/data");

    return { success: true, deleted: result.count };
  } catch (err) {
    console.error("[deleteCancelledAppointments]", err);
    return { success: false, error: "Failed to delete cancelled appointments" };
  }
}
