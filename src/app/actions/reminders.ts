"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ReminderWithRelations = {
  id: string;
  salonId: string;
  appointmentId: string | null;
  clientId: string | null;
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
  } | null;
};

// Keep legacy alias for backward compatibility
export type ReminderWithAppointment = ReminderWithRelations;

// ── helpers ────────────────────────────────────────────────────────────────────

async function getDefaultSalonId(): Promise<string | null> {
  const salon = await prisma.salon.findFirst({ select: { id: true } });
  return salon?.id ?? null;
}

const reminderInclude = {
  Appointment: {
    select: {
      id: true,
      date: true,
      startTime: true,
      Client: { select: { id: true, name: true } },
    },
  },
} as const;

// ── schedule a reminder for an appointment ─────────────────────────────────────

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

    const salonId = await getDefaultSalonId();
    if (!salonId) return { success: false, error: "No salon found" };

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
        salonId,
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

// ── send a direct message to a client (no appointment required) ────────────────

export async function sendDirectMessage(data: {
  clientId?: string;
  message: string;
  type: string;
  appointmentId?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!data.message?.trim()) return { success: false, error: "Message is required" };
  if (!["SMS", "WHATSAPP", "EMAIL"].includes(data.type)) {
    return { success: false, error: `Invalid type: ${data.type}` };
  }

  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) return { success: false, error: "No salon found" };

    // Simulate: scheduledAt = now, status will be marked SENT after 1 second
    const now = new Date();

    const reminder = await prisma.reminder.create({
      data: {
        id: randomUUID(),
        salonId,
        clientId: data.clientId ?? null,
        appointmentId: data.appointmentId ?? null,
        type: data.type,
        status: "PENDING",
        message: data.message.trim(),
        scheduledAt: now,
      },
    });

    // Simulate send: mark SENT immediately (in production this would call Twilio/WhatsApp API)
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: "SENT", sentAt: new Date() },
    });

    revalidatePath("/dashboard/reminders");
    return { success: true, id: reminder.id };
  } catch (err) {
    console.error("[sendDirectMessage]", err);
    return { success: false, error: "Failed to send message" };
  }
}

// ── send a pending reminder (mark it as SENT) ──────────────────────────────────

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

// ── send all pending reminders in bulk ────────────────────────────────────────

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

// ── cancel a reminder ─────────────────────────────────────────────────────────

export async function cancelReminder(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing id" };

  try {
    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) return { success: false, error: "Reminder not found" };

    await prisma.reminder.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/dashboard/reminders");
    return { success: true };
  } catch (err) {
    console.error("[cancelReminder]", err);
    return { success: false, error: "Failed to cancel reminder" };
  }
}

// ── get reminders with optional filters ──────────────────────────────────────

export async function getReminders(filter?: {
  status?: string;
  clientId?: string;
}): Promise<ReminderWithRelations[]> {
  return prisma.reminder.findMany({
    where: {
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.clientId ? { clientId: filter.clientId } : {}),
    },
    orderBy: { scheduledAt: "asc" },
    include: reminderInclude,
  }) as Promise<ReminderWithRelations[]>;
}

// ── get reminders for a specific appointment ──────────────────────────────────

export async function getRemindersForAppointment(
  appointmentId: string
): Promise<ReminderWithRelations[]> {
  return prisma.reminder.findMany({
    where: { appointmentId },
    orderBy: { scheduledAt: "asc" },
    include: reminderInclude,
  }) as Promise<ReminderWithRelations[]>;
}

// ── get all reminders (dashboard) ─────────────────────────────────────────────

export async function getAllReminders(
  filter?: "PENDING" | "SENT" | "FAILED" | "CANCELLED"
): Promise<ReminderWithRelations[]> {
  return prisma.reminder.findMany({
    where: filter ? { status: filter } : undefined,
    orderBy: { scheduledAt: "desc" },
    include: reminderInclude,
  }) as Promise<ReminderWithRelations[]>;
}

// ── pending reminder count (for sidebar badge) ────────────────────────────────

export async function getPendingReminderCount(): Promise<number> {
  return prisma.reminder.count({ where: { status: "PENDING" } });
}

// ── delete reminders in bulk ──────────────────────────────────────────────────

export async function deleteReminders(
  ids: string[]
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  if (!ids.length) return { success: false, error: "No IDs provided" };
  try {
    const result = await prisma.reminder.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/dashboard/reminders");
    return { success: true, count: result.count };
  } catch (err) {
    console.error("[deleteReminders]", err);
    return { success: false, error: "Failed to delete reminders" };
  }
}

// ── mark a reminder as FAILED ─────────────────────────────────────────────────

export async function markReminderFailed(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing id" };
  try {
    await prisma.reminder.update({ where: { id }, data: { status: "FAILED" } });
    revalidatePath("/dashboard/reminders");
    return { success: true };
  } catch (err) {
    console.error("[markReminderFailed]", err);
    return { success: false, error: "Failed to mark reminder as failed" };
  }
}

// ── mark a reminder as SENT ───────────────────────────────────────────────────

export async function markReminderSent(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing id" };
  try {
    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) return { success: false, error: "Reminder not found" };
    await prisma.reminder.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
    revalidatePath("/dashboard/reminders");
    return { success: true };
  } catch (err) {
    console.error("[markReminderSent]", err);
    return { success: false, error: "Failed to mark reminder as sent" };
  }
}

// ── schedule reminders for all appointments on a given date ───────────────────

export type ScheduleRemindersResult = {
  date: string;
  appointmentsFound: number;
  scheduledCount: number;
  skippedCount: number;
  errors: string[];
};

export async function scheduleRemindersForDate(
  date: string
): Promise<{ success: true; summary: ScheduleRemindersResult } | { success: false; error: string }> {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, error: "Invalid date format. Expected YYYY-MM-DD." };
  }

  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) return { success: false, error: "No salon found" };

    // Load all appointments on that date
    const appointments = await prisma.appointment.findMany({
      where: { salonId, date },
      include: {
        Client: { select: { id: true, name: true } },
      },
    });

    const result: ScheduleRemindersResult = {
      date,
      appointmentsFound: appointments.length,
      scheduledCount: 0,
      skippedCount: 0,
      errors: [],
    };

    for (const appt of appointments) {
      const [year, month, day] = appt.date.split("-").map(Number);
      const [hour, minute] = appt.startTime.split(":").map(Number);
      const apptDateTime = new Date(year, month - 1, day, hour, minute);
      const clientName = appt.Client?.name ?? "Valued Customer";

      const windows: { hours: number; label: string }[] = [
        { hours: 24, label: "24h" },
        { hours: 2, label: "2h" },
        { hours: 1, label: "1h" },
      ];

      for (const window of windows) {
        const scheduledAt = new Date(apptDateTime.getTime() - window.hours * 60 * 60 * 1000);

        // Skip if already past or if already scheduled for this appointment + type combo
        if (scheduledAt <= new Date()) {
          result.skippedCount++;
          continue;
        }

        // Dedupe: check if a reminder with this appointmentId already exists near this window
        const alreadyScheduled = await prisma.reminder.findFirst({
          where: {
            appointmentId: appt.id,
            scheduledAt: {
              gte: new Date(scheduledAt.getTime() - 30 * 60_000),
              lte: new Date(scheduledAt.getTime() + 30 * 60_000),
            },
          },
        });

        if (alreadyScheduled) {
          result.skippedCount++;
          continue;
        }

        try {
          const message =
            `Hi ${clientName}! Reminder: your appointment is on ${appt.date} at ${appt.startTime}. ` +
            `(${window.label} notice) Please contact us if you need to reschedule.`;

          await prisma.reminder.create({
            data: {
              id: randomUUID(),
              salonId,
              appointmentId: appt.id,
              clientId: appt.clientId,
              type: "SMS",
              status: "PENDING",
              message,
              scheduledAt,
            },
          });
          result.scheduledCount++;
        } catch (createErr) {
          console.error("[scheduleRemindersForDate] create error", createErr);
          result.errors.push(`Failed to schedule ${window.label} reminder for appt ${appt.id}`);
        }
      }
    }

    revalidatePath("/dashboard/reminders");
    return { success: true, summary: result };
  } catch (err) {
    console.error("[scheduleRemindersForDate]", err);
    return { success: false, error: "Failed to schedule reminders" };
  }
}

// ── schedule a rebooking reminder 3 weeks after appointment ──────────────────

export async function scheduleRebookingReminder(
  appointmentId: string
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!appointmentId) return { success: false, error: "Missing appointmentId" };

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        Client: { select: { name: true } },
        Salon: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!appointment) return { success: false, error: "Appointment not found" };

    const [year, month, day] = appointment.date.split("-").map(Number);
    const apptDate = new Date(year, month - 1, day);
    // 3 weeks after the appointment date
    const scheduledAt = new Date(apptDate.getTime() + 21 * 24 * 60 * 60 * 1000);

    const clientName = appointment.Client?.name ?? "there";
    const salonName = appointment.Salon.name;
    const bookingLink = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/book/${appointment.Salon.slug}`;

    const message =
      `Hi ${clientName}! Time for your next appointment at ${salonName}. Book now: ${bookingLink}`;

    const reminder = await prisma.reminder.create({
      data: {
        id: randomUUID(),
        salonId: appointment.Salon.id,
        appointmentId,
        clientId: appointment.clientId ?? null,
        type: "SMS",
        status: "PENDING",
        message,
        scheduledAt,
      },
    });

    revalidatePath("/dashboard/reminders");
    return { success: true, id: reminder.id };
  } catch (err) {
    console.error("[scheduleRebookingReminder]", err);
    return { success: false, error: "Failed to schedule rebooking reminder" };
  }
}

// ── save notification preferences (stored in Salon.businessHours JSON blob) ───

export type NotificationPrefs = {
  remind24h: boolean;
  remind24hChannel: "SMS" | "EMAIL" | "WHATSAPP";
  remind2h: boolean;
  remind2hChannel: "SMS" | "EMAIL" | "WHATSAPP";
  remind1h: boolean;
  remind1hChannel: "SMS" | "EMAIL" | "WHATSAPP";
  followUpAfterVisit: boolean;
  rebookingReminder: boolean;
  rebookingDays: number;
  birthdayMessage: boolean;
  birthdayTemplate: string;
};

export async function saveNotificationPrefs(
  prefs: NotificationPrefs
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    // Parse existing businessHours blob (may contain hours data already)
    let existing: Record<string, unknown> = {};
    if (salon.businessHours) {
      try {
        existing = JSON.parse(salon.businessHours) as Record<string, unknown>;
      } catch {
        // malformed JSON — start fresh
      }
    }

    const updated = JSON.stringify({ ...existing, notificationPrefs: prefs });

    await prisma.salon.update({
      where: { id: salon.id },
      data: { businessHours: updated, updatedAt: new Date() },
    });

    revalidatePath("/dashboard/settings/reminders");
    return { success: true };
  } catch (err) {
    console.error("[saveNotificationPrefs]", err);
    return { success: false, error: "Failed to save notification preferences" };
  }
}

// ── load notification preferences ────────────────────────────────────────────

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  const defaults: NotificationPrefs = {
    remind24h: true,
    remind24hChannel: "SMS",
    remind2h: true,
    remind2hChannel: "SMS",
    remind1h: false,
    remind1hChannel: "SMS",
    followUpAfterVisit: false,
    rebookingReminder: false,
    rebookingDays: 30,
    birthdayMessage: false,
    birthdayTemplate: "Happy Birthday {name}! We'd love to celebrate with you — book a special appointment today!",
  };

  try {
    const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
    if (!salon?.businessHours) return defaults;
    const blob = JSON.parse(salon.businessHours) as Record<string, unknown>;
    const prefs = blob.notificationPrefs as NotificationPrefs | undefined;
    return prefs ? { ...defaults, ...prefs } : defaults;
  } catch {
    return defaults;
  }
}
