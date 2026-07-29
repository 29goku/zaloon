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

export type NotificationsResult = {
  upcomingToday: NotificationAppointment[];
  birthdaysThisWeek: NotificationClient[];
  overdueAppointments: NotificationAppointment[];
};

export async function getNotifications(): Promise<NotificationsResult> {
  const salon = await prisma.salon.findFirst({ select: { id: true } });
  if (!salon) {
    return { upcomingToday: [], birthdaysThisWeek: [], overdueAppointments: [] };
  }

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const currentTimeStr = format(now, "HH:mm");
  const threeHoursLaterStr = format(addHours(now, 3), "HH:mm");

  // Appointments starting within the next 3 hours today
  const upcomingToday = await prisma.appointment.findMany({
    where: {
      salonId: salon.id,
      date: todayStr,
      startTime: { gte: currentTimeStr, lte: threeHoursLaterStr },
      status: "SCHEDULED",
    },
    include: {
      Client: { select: { id: true, name: true } },
      Staff: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
    take: 20,
  });

  // Overdue: SCHEDULED appointments whose date/time is in the past
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

  // Birthdays this week — compare month/day only
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const allClients = await prisma.client.findMany({
    where: { salonId: salon.id, birthday: { not: null } },
    select: { id: true, name: true, birthday: true, phone: true },
  });

  const birthdaysThisWeek = allClients.filter((c) => {
    if (!c.birthday) return false;
    const bday = c.birthday;
    const thisYearBday = new Date(
      now.getFullYear(),
      bday.getMonth(),
      bday.getDate()
    );
    return thisYearBday >= weekStart && thisYearBday <= weekEnd;
  });

  return {
    upcomingToday: upcomingToday as NotificationAppointment[],
    birthdaysThisWeek: birthdaysThisWeek as NotificationClient[],
    overdueAppointments: overdueAppointments as NotificationAppointment[],
  };
}
