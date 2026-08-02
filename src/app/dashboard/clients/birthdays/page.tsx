import { prisma } from "@/lib/prisma";
import { BirthdaysPageClient } from "./birthdays-page-client";

export const dynamic = "force-dynamic";

export default async function BirthdaysPage() {
  const now = new Date();
  const currentMonth = now.getMonth();

  const salon = await prisma.salon.findFirst({ select: { id: true } });

  // ── Birthday clients this month ─────────────────────────────────────────────
  const allBirthdayClients = salon
    ? await prisma.client.findMany({
        where: { birthday: { not: null }, salonId: salon.id },
        select: {
          id: true,
          name: true,
          phone: true,
          birthday: true,
          loyaltyPoints: true,
        },
      })
    : [];

  const birthdayClientsThisMonth = allBirthdayClients.filter((c) => {
    const bday = new Date(c.birthday!);
    return bday.getMonth() === currentMonth;
  });

  // ── Upcoming birthdays in next 30 days ──────────────────────────────────────
  const upcomingBirthdays = allBirthdayClients
    .map((c) => {
      const bday = new Date(c.birthday!);
      // Create this year's birthday
      const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      // If already passed this year, use next year
      const candidate =
        thisYear < now
          ? new Date(now.getFullYear() + 1, bday.getMonth(), bday.getDate())
          : thisYear;
      const diffMs = candidate.getTime() - now.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...c, daysUntil, upcomingDate: candidate };
    })
    .filter((c) => c.daysUntil > 0 && c.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const upcomingWithLastVisit = await Promise.all(
    upcomingBirthdays.map(async (c) => {
      const lastAppt = await prisma.appointment.findFirst({
        where: { clientId: c.id, status: "COMPLETED" },
        orderBy: { date: "desc" },
        select: { date: true },
      });
      return { ...c, lastVisitDate: lastAppt?.date ?? null };
    })
  );

  // ── Anniversary clients this month ──────────────────────────────────────────
  // Anniversary = client.anniversary field OR first appointment date
  const allClients = salon
    ? await prisma.client.findMany({
        where: { salonId: salon.id },
        select: {
          id: true,
          name: true,
          phone: true,
          anniversary: true,
          Appointment: {
            orderBy: { date: "asc" },
            take: 1,
            select: { date: true },
          },
        },
      })
    : [];

  const anniversaryClientsThisMonth: Array<{
    id: string;
    name: string;
    phone: string | null;
    anniversaryDate: Date;
    yearsCount: number;
  }> = [];

  for (const client of allClients) {
    let anniversaryDate: Date | null = null;
    if (client.anniversary) {
      anniversaryDate = new Date(client.anniversary);
    } else if (client.Appointment.length > 0) {
      anniversaryDate = new Date(client.Appointment[0].date + "T00:00:00");
    }
    if (!anniversaryDate) continue;
    if (anniversaryDate.getMonth() !== currentMonth) continue;
    // Skip clients whose anniversary is in the same year (not yet a year old)
    const yearsCount = now.getFullYear() - anniversaryDate.getFullYear();
    if (yearsCount <= 0) continue;

    const thisYearAnniv = new Date(
      now.getFullYear(),
      anniversaryDate.getMonth(),
      anniversaryDate.getDate()
    );
    anniversaryClientsThisMonth.push({
      id: client.id,
      name: client.name,
      phone: client.phone,
      anniversaryDate: thisYearAnniv,
      yearsCount,
    });
  }

  anniversaryClientsThisMonth.sort(
    (a, b) => a.anniversaryDate.getDate() - b.anniversaryDate.getDate()
  );

  // ── Wishes sent today ───────────────────────────────────────────────────────
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const wishesSentToday = salon
    ? await prisma.reminder.count({
        where: {
          salonId: salon.id,
          type: "WHATSAPP",
          message: { contains: "Happy Birthday" },
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      })
    : 0;

  return (
    <BirthdaysPageClient
      birthdayClients={birthdayClientsThisMonth.map((c) => ({
        ...c,
        birthday: c.birthday ?? null,
      }))}
      anniversaryClients={anniversaryClientsThisMonth}
      totalBirthdaysThisMonth={birthdayClientsThisMonth.length}
      totalAnniversariesThisMonth={anniversaryClientsThisMonth.length}
      wishesSentToday={wishesSentToday}
      upcomingBirthdays={upcomingWithLastVisit.map((c) => ({
        ...c,
        birthday: c.birthday ?? null,
      }))}
    />
  );
}
