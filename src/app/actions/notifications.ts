"use server";

import { prisma } from "@/lib/prisma";
import { format, startOfWeek, endOfWeek, addHours } from "date-fns";

export type NotificationAppointment = {
  id: string;
  clientId: string | null;
  staffId: string;
  date: string;
  startTime: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  Client: { id: string; name: string } | null;
  Staff: { id: string; name: string };
};

export type NotificationClient = {
  id: string;
  name: string;
  birthday: Date | null;
  phone: string | null;
};

export type NotificationReminder = {
  id: string;
  type: string;
  status: string;
  message: string;
  scheduledAt: Date;
  appointmentId: string | null;
  clientId: string | null;
  Appointment: {
    id: string;
    date: string;
    startTime: string;
    Client: { id: string; name: string } | null;
  } | null;
};

export type NotificationInventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
};

export type NotificationsResult = {
  upcomingToday: NotificationAppointment[];
  birthdaysThisWeek: NotificationClient[];
  birthdaysToday: NotificationClient[];
  overdueAppointments: NotificationAppointment[];
  pendingReminders: NotificationReminder[];
  lowStockItems: NotificationInventoryItem[];
  // badge counts
  badgeCount: number;
};

export async function getNotifications(): Promise<NotificationsResult> {
  const salon = await prisma.salon.findFirst({ select: { id: true } });
  if (!salon) {
    return {
      upcomingToday: [],
      birthdaysThisWeek: [],
      birthdaysToday: [],
      overdueAppointments: [],
      pendingReminders: [],
      lowStockItems: [],
      badgeCount: 0,
    };
  }

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const currentTimeStr = format(now, "HH:mm");
  const twoHoursLaterStr = format(addHours(now, 2), "HH:mm");

  // ── Appointments starting within the next 2 hours today ─────────────────────
  const upcomingToday = await prisma.appointment.findMany({
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
    orderBy: { startTime: "asc" },
    take: 20,
  });

  // ── Overdue: SCHEDULED appointments whose date/time is in the past ───────────
  const overdueAppointments = await prisma.appointment.findMany({
    where: {
      salonId: salon.id,
      status: "SCHEDULED",
      OR: [
        { date: { lt: todayStr } },
        { date: todayStr, startTime: { lt: currentTimeStr } },
      ],
    },
    include: {
      Client: { select: { id: true, name: true } },
      Staff: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    take: 20,
  });

  // ── Pending reminders ────────────────────────────────────────────────────────
  const pendingReminders = await prisma.reminder.findMany({
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
    orderBy: { scheduledAt: "asc" },
    take: 20,
  });

  // ── Low stock inventory items ────────────────────────────────────────────────
  const lowStockItems = await prisma.inventoryItem.findMany({
    where: {
      salonId: salon.id,
      // quantity is at or below minQuantity threshold (and minQuantity > 0)
      minQuantity: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      category: true,
      quantity: true,
      minQuantity: true,
      unit: true,
    },
    orderBy: { name: "asc" },
  });

  // Filter to only items at or below minQuantity (SQLite can't do column comparisons in where)
  const filteredLowStock = lowStockItems.filter(
    (item) => item.quantity <= item.minQuantity
  );

  // ── Birthdays this week — compare month/day only ─────────────────────────────
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const allClients = await prisma.client.findMany({
    where: { salonId: salon.id, birthday: { not: null } },
    select: { id: true, name: true, birthday: true, phone: true },
  });

  const birthdaysThisWeek = allClients.filter((c) => {
    if (!c.birthday) return false;
    const bday = c.birthday;
    const thisYearBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
    return thisYearBday >= weekStart && thisYearBday <= weekEnd;
  });

  // Subset: birthdays specifically today
  const todayMM = now.getMonth();
  const todayDD = now.getDate();
  const birthdaysToday = birthdaysThisWeek.filter((c) => {
    if (!c.birthday) return false;
    return c.birthday.getMonth() === todayMM && c.birthday.getDate() === todayDD;
  });

  // ── Badge count: scheduled today + pending reminders + birthdays today ───────
  const scheduledTodayCount = await prisma.appointment.count({
    where: { salonId: salon.id, date: todayStr, status: "SCHEDULED" },
  });
  const pendingReminderCount = pendingReminders.length;
  const birthdayTodayCount = birthdaysToday.length;
  const lowStockCount = filteredLowStock.length;

  const badgeCount =
    scheduledTodayCount + pendingReminderCount + birthdayTodayCount + lowStockCount;

  return {
    upcomingToday: upcomingToday as NotificationAppointment[],
    birthdaysThisWeek: birthdaysThisWeek as NotificationClient[],
    birthdaysToday: birthdaysToday as NotificationClient[],
    overdueAppointments: overdueAppointments as NotificationAppointment[],
    pendingReminders: pendingReminders as NotificationReminder[],
    lowStockItems: filteredLowStock as NotificationInventoryItem[],
    badgeCount,
  };
}
