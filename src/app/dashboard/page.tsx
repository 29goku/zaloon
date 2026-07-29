import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardHome } from "./dashboard-home";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Redirect to onboarding when the salon has neither staff nor services
  const [staffCount, serviceCount] = await Promise.all([
    prisma.staff.count(),
    prisma.service.count(),
  ]);
  if (staffCount === 0 && serviceCount === 0) {
    redirect("/dashboard/onboarding");
  }

  // Start of today (midnight)
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Start of this week (Monday)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);

  // Start of this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 7 days ago for new clients
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Day of week (0=Sun,1=Mon...6=Sat) for shift lookup
  const jsDay = now.getDay(); // 0=Sun
  // Shift model uses: 0=Mon,1=Tue,...,6=Sun convention — check schema
  // Shift.dayOfWeek is Int — we pass jsDay directly as stored
  const todayDayOfWeek = jsDay;

  const [
    salon,
    todayAppts,
    totalClients,
    totalStaff,
    recentInvoices,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    newClientsThisWeek,
    todayScheduledCount,
    completedAllTime,
    totalApptsAllTime,
    staffWithTodayShifts,
  ] = await Promise.all([
    prisma.salon.findFirst(),

    // Count non-cancelled appointments today
    prisma.appointment.count({
      where: { date: today, status: { not: "CANCELLED" } },
    }),

    prisma.client.count(),

    prisma.staff.count(),

    // Recent 5 invoices for "Recent Revenue" card
    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { Client: true },
    }),

    // Revenue today
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: todayStart } },
    }),

    // Revenue this week
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: weekStart } },
    }),

    // Revenue this month
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: monthStart } },
    }),

    // New clients this week
    prisma.client.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),

    // Pending/SCHEDULED appointments today
    prisma.appointment.count({
      where: { date: today, status: "SCHEDULED" },
    }),

    // Completed appointments (all time, for completion rate)
    prisma.appointment.count({
      where: { status: "COMPLETED" },
    }),

    // Total non-cancelled appointments (all time)
    prisma.appointment.count({
      where: { status: { not: "CANCELLED" } },
    }),

    // Staff who have shifts today
    prisma.staff.findMany({
      where: {
        Shift: { some: { dayOfWeek: todayDayOfWeek } },
      },
      include: {
        Shift: { where: { dayOfWeek: todayDayOfWeek } },
        Appointment: {
          where: { date: today, status: { not: "CANCELLED" } },
        },
      },
    }),
  ]);

  // Today's appointments list (up to 8)
  const todayApptsList = await prisma.appointment.findMany({
    where: { date: today },
    orderBy: { startTime: "asc" },
    take: 8,
    include: {
      Client: true,
      Staff: true,
      AppointmentService: { include: { Service: true } },
    },
  });

  // Next 3 upcoming appointments across all dates (from now onwards)
  const upcomingAppts = await prisma.appointment.findMany({
    where: {
      status: "SCHEDULED",
      OR: [
        { date: { gt: today } },
        { date: today, startTime: { gte: now.toTimeString().slice(0, 5) } },
      ],
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 3,
    include: {
      Client: true,
      Staff: true,
      AppointmentService: { include: { Service: true } },
    },
  });

  // Last 7 days revenue sparkline
  const last7Days: { date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dEnd = new Date(d);
    dEnd.setHours(23, 59, 59, 999);
    const agg = await prisma.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: d, lte: dEnd } },
    });
    last7Days.push({
      date: d.toISOString().split("T")[0],
      amount: agg._sum.total ?? 0,
    });
  }

  // ── Analytics widget data ──────────────────────────────────────────────────

  // Weekly revenue bar chart: last 7 calendar days keyed by day abbreviation
  const DAY_ABBREVS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyRevenueData: { day: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dEnd = new Date(d);
    dEnd.setHours(23, 59, 59, 999);
    const agg = await prisma.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: d, lte: dEnd } },
    });
    weeklyRevenueData.push({
      day: DAY_ABBREVS[d.getDay()],
      revenue: agg._sum.total ?? 0,
    });
  }

  // Appointment funnel: counts by status for the current month
  const [apptCompleted, apptScheduled, apptCancelled, apptNoShow] =
    await Promise.all([
      prisma.appointment.count({
        where: { status: "COMPLETED", createdAt: { gte: monthStart } },
      }),
      prisma.appointment.count({
        where: { status: "SCHEDULED", createdAt: { gte: monthStart } },
      }),
      prisma.appointment.count({
        where: { status: "CANCELLED", createdAt: { gte: monthStart } },
      }),
      prisma.appointment.count({
        where: { status: "NO_SHOW", createdAt: { gte: monthStart } },
      }),
    ]);

  // Top 5 clients by appointment count
  const topClientsRaw = await prisma.client.findMany({
    select: {
      name: true,
      _count: { select: { Appointment: true } },
      Invoice: { select: { total: true } },
    },
    orderBy: { Appointment: { _count: "desc" } },
    take: 5,
  });
  const topClients = topClientsRaw.map((c) => ({
    name: c.name,
    visits: c._count.Appointment,
    spent: c.Invoice.reduce((sum, inv) => sum + inv.total, 0),
  }));

  const revenue = recentInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const completionRate =
    totalApptsAllTime > 0
      ? Math.round((completedAllTime / totalApptsAllTime) * 100)
      : 0;

  const staffUtilization = {
    working: staffWithTodayShifts.length,
    total: totalStaff,
    staff: staffWithTodayShifts.map((s) => ({
      id: s.id,
      name: s.name,
      appointmentsToday: s.Appointment.length,
      shift:
        s.Shift[0]
          ? `${s.Shift[0].startTime}–${s.Shift[0].endTime}`
          : null,
    })),
  };

  return (
    <DashboardHome
      salonName={salon?.name ?? "Your Salon"}
      currency={salon?.currency ?? "USD"}
      todayAppts={todayAppts}
      totalClients={totalClients}
      totalStaff={totalStaff}
      revenue={revenue}
      todayApptsList={todayApptsList}
      // Existing new props
      revenueToday={todayRevenue._sum.total ?? 0}
      revenueThisWeek={weekRevenue._sum.total ?? 0}
      revenueThisMonth={monthRevenue._sum.total ?? 0}
      newClientsThisWeek={newClientsThisWeek}
      todayScheduledCount={todayScheduledCount}
      completionRate={completionRate}
      upcomingAppts={upcomingAppts}
      staffUtilization={staffUtilization}
      revenueSparkline={last7Days}
      // Analytics widget props
      weeklyRevenueData={weeklyRevenueData}
      apptFunnel={{
        scheduled: apptScheduled,
        completed: apptCompleted,
        cancelled: apptCancelled,
        noShow: apptNoShow,
      }}
      topClients={topClients}
    />
  );
}
