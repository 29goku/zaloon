"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ReminderWithAppointment = {
  id: string;
  appointmentId: string;
  type: string;
  status: string;
  message: string;
  scheduledAt: Date;
  sentAt: Date | null;
  createdAt: Date;
  Appointment: {
    id: string;
    date: string;
    startTime: string;
    Client: { id: string; name: string } | null;
  };
};

// Schedule a reminder for an appointment
export async function scheduleReminder(
  appointmentId: string,
  type: string,
  hoursBeforeAppt: number
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!appointmentId) return { success: false, error: "Missing appointmentId" };
  if (!["SMS", "WHATSAPP", "EMAIL"].includes(type)) {
    return { success: false, error: `Invalid type: ${type}` };
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { Client: { select: { name: true } } },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found" };
    }

    // Parse appointment date + startTime into a Date
    const [year, month, day] = appointment.date.split("-").map(Number);
    const [hour, minute] = appointment.startTime.split(":").map(Number);
    const apptDateTime = new Date(year, month - 1, day, hour, minute);
    const scheduledAt = new Date(apptDateTime.getTime() - hoursBeforeAppt * 60 * 60 * 1000);

    const clientName = appointment.Client?.name ?? "Valued Customer";
    const message =
      `Hi ${clientName}! This is a reminder for your appointment at ${appointment.startTime} on ${appointment.date}. ` +
      `Please let us know if you need to reschedule.`;

    const reminder = await prisma.reminder.create({
      data: {
        id: randomUUID(),
        appointmentId,
        type,
        status: "PENDING",
        message,
        scheduledAt,
      },
    });

    revalidatePath("/dashboard/reminders");
    return { success: true, id: reminder.id };
  } catch (err) {
    console.error("[scheduleReminder]", err);
    return { success: false, error: "Failed to schedule reminder" };
  }
}

// Simulate sending a reminder — marks it SENT and records sentAt
export async function sendReminder(
  reminderId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!reminderId) return { success: false, error: "Missing reminderId" };

  try {
    const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
    if (!reminder) return { success: false, error: "Reminder not found" };
    if (reminder.status === "SENT") return { success: false, error: "Already sent" };

    await prisma.reminder.update({
      where: { id: reminderId },
      data: { status: "SENT", sentAt: new Date() },
    });

    revalidatePath("/dashboard/reminders");
    return { success: true };
  } catch (err) {
    console.error("[sendReminder]", err);
    return { success: false, error: "Failed to send reminder" };
  }
}

// Send all pending reminders in bulk
export async function sendAllPendingReminders(): Promise<
  { success: true; count: number } | { success: false; error: string }
> {
  try {
    const now = new Date();
    const result = await prisma.reminder.updateMany({
      where: { status: "PENDING" },
      data: { status: "SENT", sentAt: now },
    });

    revalidatePath("/dashboard/reminders");
    return { success: true, count: result.count };
  } catch (err) {
    console.error("[sendAllPendingReminders]", err);
    return { success: false, error: "Failed to send all pending reminders" };
  }
}

// Get all reminders for a specific appointment
export async function getRemindersForAppointment(
  appointmentId: string
): Promise<ReminderWithAppointment[]> {
  return prisma.reminder.findMany({
    where: { appointmentId },
    orderBy: { scheduledAt: "asc" },
    include: {
      Appointment: {
        select: {
          id: true,
          date: true,
          startTime: true,
          Client: { select: { id: true, name: true } },
        },
      },
    },
  }) as Promise<ReminderWithAppointment[]>;
}

// Get all reminders (for the dashboard)
export async function getAllReminders(
  filter?: "PENDING" | "SENT" | "FAILED"
): Promise<ReminderWithAppointment[]> {
  return prisma.reminder.findMany({
    where: filter ? { status: filter } : undefined,
    orderBy: { scheduledAt: "asc" },
    include: {
      Appointment: {
        select: {
          id: true,
          date: true,
          startTime: true,
          Client: { select: { id: true, name: true } },
        },
      },
    },
  }) as Promise<ReminderWithAppointment[]>;
}

// Get pending reminder count (for sidebar badge)
export async function getPendingReminderCount(): Promise<number> {
  return prisma.reminder.count({ where: { status: "PENDING" } });
}
