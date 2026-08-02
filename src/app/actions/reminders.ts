"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { getCurrentSalonId } from "@/lib/repositories/base";

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

    const salonId = await getCurrentSalonId();

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
    const salonId = await getCurrentSalonId();

    const now = new Date();

    // If EMAIL type and clientId provided, look up the client email and send
    if (data.type === "EMAIL" && data.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: data.clientId },
        select: { name: true, email: true },
      });
      if (client?.email) {
        const subject = "Message from your salon";
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hi ${client.name ?? "there"},</p>
            <p>${data.message.trim()}</p>
          </div>
        `;
        // Non-blocking: fire and forget
        sendEmail(client.email, subject, html).catch((err) =>
          console.error("[sendDirectMessage] email send error", err)
        );
      }
    }

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

    // Mark SENT immediately (Twilio/WhatsApp delivery would go here for SMS/WhatsApp)
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
    const salonId = await getCurrentSalonId();
    const now = new Date();
    const result = await prisma.reminder.updateMany({
      where: { salonId, status: "PENDING" },
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
  const salonId = await getCurrentSalonId();
  return prisma.reminder.findMany({
    where: {
      salonId,
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
  const salonId = await getCurrentSalonId();
  return prisma.reminder.findMany({
    where: filter ? { salonId, status: filter } : { salonId },
    orderBy: { scheduledAt: "desc" },
    include: reminderInclude,
  }) as Promise<ReminderWithRelations[]>;
}

// ── pending reminder count (for sidebar badge) ────────────────────────────────

export async function getPendingReminderCount(): Promise<number> {
  const salonId = await getCurrentSalonId();
  return prisma.reminder.count({ where: { salonId, status: "PENDING" } });
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
    const salonId = await getCurrentSalonId();

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
              type: "WHATSAPP",
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
        type: "WHATSAPP",
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

// ── sendQuickMessage ──────────────────────────────────────────────────────────

export async function sendQuickMessage(data: {
  clientId: string;
  channel: "WHATSAPP" | "EMAIL";
  message: string;
  scheduledAt?: string; // ISO string; if undefined → now
}): Promise<{ success: boolean; reminderId?: string; error?: string }> {
  if (!data.clientId) return { success: false, error: "clientId is required" };
  if (!data.message?.trim()) return { success: false, error: "Message is required" };
  if (!["WHATSAPP", "EMAIL"].includes(data.channel)) {
    return { success: false, error: "Invalid channel" };
  }

  try {
    const salonId = await getCurrentSalonId();

    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : new Date();
    const isImmediate = !data.scheduledAt;

    const reminder = await prisma.reminder.create({
      data: {
        id: randomUUID(),
        salonId,
        clientId: data.clientId,
        type: data.channel,
        status: "PENDING",
        message: data.message.trim(),
        scheduledAt,
      },
    });

    // If sending now, mark as SENT immediately (simulated delivery)
    if (isImmediate) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    }

    revalidatePath("/dashboard/communications");
    revalidatePath("/dashboard/reminders");
    return { success: true, reminderId: reminder.id };
  } catch (err) {
    console.error("[sendQuickMessage]", err);
    return { success: false, error: "Failed to send message" };
  }
}

// ── cancelScheduledMessage ────────────────────────────────────────────────────

export async function cancelScheduledMessage(
  reminderId: string
): Promise<{ success: boolean; error?: string }> {
  if (!reminderId) return { success: false, error: "reminderId is required" };

  try {
    const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
    if (!reminder) return { success: false, error: "Reminder not found" };
    if (reminder.status === "SENT") {
      return { success: false, error: "Cannot cancel an already-sent message" };
    }

    await prisma.reminder.update({
      where: { id: reminderId },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/dashboard/communications");
    revalidatePath("/dashboard/reminders");
    return { success: true };
  } catch (err) {
    console.error("[cancelScheduledMessage]", err);
    return { success: false, error: "Failed to cancel message" };
  }
}

// ── retryFailedMessage ────────────────────────────────────────────────────────

export async function retryFailedMessage(
  reminderId: string
): Promise<{ success: boolean; error?: string }> {
  if (!reminderId) return { success: false, error: "reminderId is required" };

  try {
    const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
    if (!reminder) return { success: false, error: "Reminder not found" };

    await prisma.reminder.update({
      where: { id: reminderId },
      data: { status: "PENDING", sentAt: null },
    });

    revalidatePath("/dashboard/communications");
    revalidatePath("/dashboard/reminders");
    return { success: true };
  } catch (err) {
    console.error("[retryFailedMessage]", err);
    return { success: false, error: "Failed to retry message" };
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
    const salonId = await getCurrentSalonId();
    const salon = await prisma.salon.findUniqueOrThrow({
      where: { id: salonId },
      select: { businessHours: true },
    });

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
      where: { id: salonId },
      data: { businessHours: updated, updatedAt: new Date() },
    });

    revalidatePath("/dashboard/settings/reminders");
    return { success: true };
  } catch (err) {
    console.error("[saveNotificationPrefs]", err);
    return { success: false, error: "Failed to save notification preferences" };
  }
}

// ── clear old sent reminders ──────────────────────────────────────────────────

export async function clearOldReminders(
  daysOld: number
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  if (daysOld < 1) return { success: false, error: "daysOld must be >= 1" };
  try {
    const salonId = await getCurrentSalonId();
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await prisma.reminder.deleteMany({
      where: { salonId, status: "SENT", sentAt: { lt: cutoff } },
    });
    revalidatePath("/dashboard/reminders");
    return { success: true, count: result.count };
  } catch (err) {
    console.error("[clearOldReminders]", err);
    return { success: false, error: "Failed to clear old reminders" };
  }
}

// ── Notification types ────────────────────────────────────────────────────────

export type Notification = {
  id: string;
  type:
    | "appointment_upcoming"
    | "no_show"
    | "review_received"
    | "low_stock"
    | "birthday"
    | "pending_reminder"
    | "time_off_request";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
};

// ── generate current notifications from DB state ──────────────────────────────

export async function generateNotifications(): Promise<Notification[]> {
  const salonId = await getCurrentSalonId();
  if (!salonId) return [];
  const salon = { id: salonId };

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const twoHoursLaterStr = twoHoursLater.toTimeString().slice(0, 5);
  const currentTimeStr = now.toTimeString().slice(0, 5);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const [upcomingAppts, noShows, recentReviews, pendingReminders, lowStock, birthdays, pendingTimeOff] =
    await Promise.all([
      // Upcoming appointments in next 2 hours
      prisma.appointment.findMany({
        where: {
          salonId: salon.id,
          date: todayStr,
          startTime: { gte: currentTimeStr, lte: twoHoursLaterStr },
          status: "SCHEDULED",
        },
        include: {
          Client: { select: { id: true, name: true } },
          Staff: { select: { id: true, name: true } },
        },
        take: 10,
        orderBy: { startTime: "asc" },
      }),
      // No shows: SCHEDULED appointments from today that are past
      prisma.appointment.findMany({
        where: {
          salonId: salon.id,
          date: todayStr,
          startTime: { lt: currentTimeStr },
          status: "SCHEDULED",
        },
        include: {
          Client: { select: { id: true, name: true } },
          Staff: { select: { id: true, name: true } },
        },
        take: 10,
        orderBy: { startTime: "desc" },
      }),
      // Reviews in last 48h
      prisma.review.findMany({
        where: {
          salonId: salon.id,
          createdAt: { gte: fortyEightHoursAgo },
        },
        include: {
          Client: { select: { id: true, name: true } },
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      // Pending reminders
      prisma.reminder.findMany({
        where: { salonId: salon.id, status: "PENDING" },
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
        take: 10,
        orderBy: { scheduledAt: "asc" },
      }),
      // Low stock items
      prisma.inventoryItem.findMany({
        where: { salonId: salon.id, minQuantity: { gt: 0 } },
        select: { id: true, name: true, quantity: true, minQuantity: true, unit: true },
        orderBy: { name: "asc" },
      }),
      // Client birthdays today
      prisma.client.findMany({
        where: { salonId: salon.id, birthday: { not: null } },
        select: { id: true, name: true, birthday: true },
      }),
      // Pending time-off requests (not approved)
      prisma.timeOff.findMany({
        where: { approved: false },
        include: { Staff: { select: { id: true, name: true } } },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const notifications: Notification[] = [];

  // Upcoming appointments
  for (const apt of upcomingAppts) {
    const clientName = apt.Client?.name ?? "Walk-in";
    notifications.push({
      id: `appointment_upcoming:${apt.id}`,
      type: "appointment_upcoming",
      title: "Upcoming appointment",
      message: `${clientName} with ${apt.Staff?.name ?? "Staff"} at ${apt.startTime}`,
      timestamp: now.toISOString(),
      read: false,
      link: "/dashboard/appointments",
    });
  }

  // No shows
  for (const apt of noShows) {
    const clientName = apt.Client?.name ?? "Walk-in";
    notifications.push({
      id: `no_show:${apt.id}`,
      type: "no_show",
      title: "Possible no-show",
      message: `${clientName} — appointment at ${apt.startTime} has not been checked in`,
      timestamp: now.toISOString(),
      read: false,
      link: "/dashboard/appointments",
    });
  }

  // Reviews
  for (const review of recentReviews) {
    const clientName = review.Client?.name ?? "A client";
    notifications.push({
      id: `review_received:${review.id}`,
      type: "review_received",
      title: "New review received",
      message: `${clientName} left a ${review.rating}-star review`,
      timestamp: review.createdAt.toISOString(),
      read: false,
      link: "/dashboard/reviews",
    });
  }

  // Low stock
  const filteredLowStock = lowStock.filter((i) => i.quantity <= i.minQuantity);
  for (const item of filteredLowStock) {
    notifications.push({
      id: `low_stock:${item.id}`,
      type: "low_stock",
      title: "Low stock alert",
      message: `${item.name}: ${item.quantity} ${item.unit} remaining (min: ${item.minQuantity})`,
      timestamp: now.toISOString(),
      read: false,
      link: "/dashboard/inventory",
    });
  }

  // Birthdays today
  const todayMM = now.getMonth();
  const todayDD = now.getDate();
  for (const client of birthdays) {
    if (!client.birthday) continue;
    if (client.birthday.getMonth() === todayMM && client.birthday.getDate() === todayDD) {
      notifications.push({
        id: `birthday:${client.id}`,
        type: "birthday",
        title: "Client birthday today",
        message: `${client.name}'s birthday is today`,
        timestamp: now.toISOString(),
        read: false,
        link: "/dashboard/clients",
      });
    }
  }

  // Pending reminders
  for (const reminder of pendingReminders) {
    const appt = reminder.Appointment;
    const label = appt?.Client?.name
      ? `${appt.Client.name} — ${appt.date} ${appt.startTime}`
      : `${reminder.type} reminder`;
    notifications.push({
      id: `pending_reminder:${reminder.id}`,
      type: "pending_reminder",
      title: "Pending reminder",
      message: `${reminder.type}: ${label}`,
      timestamp: reminder.scheduledAt.toISOString(),
      read: false,
      link: "/dashboard/reminders",
    });
  }

  // Time-off requests
  for (const req of pendingTimeOff) {
    notifications.push({
      id: `time_off_request:${req.id}`,
      type: "time_off_request",
      title: "Time-off request pending",
      message: `${req.Staff?.name ?? "Staff"} requested time off from ${req.startDate} to ${req.endDate}`,
      timestamp: req.createdAt.toISOString(),
      read: false,
      link: "/dashboard/staff/time-off",
    });
  }

  return notifications;
}

// ── load notification preferences ────────────────────────────────────────────

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  const defaults: NotificationPrefs = {
    remind24h: true,
    remind24hChannel: "WHATSAPP",
    remind2h: true,
    remind2hChannel: "WHATSAPP",
    remind1h: false,
    remind1hChannel: "WHATSAPP",
    followUpAfterVisit: false,
    rebookingReminder: false,
    rebookingDays: 30,
    birthdayMessage: false,
    birthdayTemplate: "Happy Birthday {name}! We'd love to celebrate with you — book a special appointment today!",
  };

  try {
    const salonId = await getCurrentSalonId();
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { businessHours: true },
    });
    if (!salon?.businessHours) return defaults;
    const blob = JSON.parse(salon.businessHours) as Record<string, unknown>;
    const prefs = blob.notificationPrefs as NotificationPrefs | undefined;
    return prefs ? { ...defaults, ...prefs } : defaults;
  } catch {
    return defaults;
  }
}
