import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardHome } from "./dashboard-home";
import { getRevenueGoals } from "@/app/actions/settings";
import { getBudgets } from "@/app/actions/budget";
import { EXPENSE_CATEGORIES } from "@/app/actions/expenses-constants";
import { getRecentActivity, getRecentChanges } from "@/lib/activity-feed";

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
  const todayDayOfWeek = jsDay;

  // Next-hour boundary for "Upcoming in Next Hour" widget
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const currentTimeStr = now.toTimeString().slice(0, 5);   // "HH:MM"
  const oneHourStr = oneHourFromNow.toTimeString().slice(0, 5); // "HH:MM"

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
    // New: clients served today (completed appointments today)
    clientsServedToday,
    // New: last 5 new clients
    recentNewClients,
    // New: last 5 completed appointments
    recentCompletedAppts,
    // Quick stats extras
    servicesOffered,
    avgRatingAgg,
    activeMemberships,
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

    // New: clients served today (completed appointments)
    prisma.appointment.count({
      where: { date: today, status: "COMPLETED" },
    }),

    // New: last 5 new clients added
    prisma.client.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true },
    }),

    // New: last 5 completed appointments
    prisma.appointment.findMany({
      where: { status: "COMPLETED" },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        Client: true,
        Staff: true,
        AppointmentService: { include: { Service: true } },
      },
    }),

    // servicesOffered: count of active services
    prisma.service.count({ where: { active: true } }),

    // avgRating: average from reviews
    prisma.review.aggregate({ _avg: { rating: true } }),

    // activeMemberships: count of active ClientMembership records
    prisma.clientMembership.count({ where: { status: "ACTIVE" } }),
  ]);

  // Birthday clients this month (SQLite/Postgres: fetch all with birthday and filter in JS)
  const allBirthdayClients = await prisma.client.findMany({
    where: { birthday: { not: null } },
    select: { id: true, name: true, phone: true, birthday: true, loyaltyPoints: true },
  });
  const birthdayClientsThisMonth = allBirthdayClients.filter((c) => {
    const bday = new Date(c.birthday!);
    return bday.getMonth() === now.getMonth();
  });

  // Today's appointments list (up to 20 — more for grouping by time slot)
  const todayApptsList = await prisma.appointment.findMany({
    where: { date: today },
    orderBy: { startTime: "asc" },
    take: 20,
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

  // New: appointments starting within the next 60 minutes
  const nextHourAppts = await prisma.appointment.findMany({
    where: {
      date: today,
      status: "SCHEDULED",
      startTime: { gte: currentTimeStr, lte: oneHourStr },
    },
    orderBy: { startTime: "asc" },
    take: 10,
    include: {
      Client: true,
      Staff: true,
      AppointmentService: { include: { Service: true } },
    },
  });

  // New: top 3 staff (by appointment count) for "Available" empty-slot display
  const top3Staff = await prisma.staff.findMany({
    take: 3,
    orderBy: { Appointment: { _count: "desc" } },
    select: { id: true, name: true },
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

  function mapAppt(
    a: (typeof todayApptsList)[number]
  ) {
    return {
      ...a,
      client: a.Client ? { name: a.Client.name } : null,
      staff: { name: a.Staff.name, id: a.Staff.id },
      services: a.AppointmentService.map((as) => ({
        service: { name: as.Service.name },
      })),
    };
  }

  const avgRating = avgRatingAgg._avg.rating ?? 0;

  // Monthly revenue target: from stored goals (falls back to 120% of actual as a seed)
  const totalMonthRevenue = monthRevenue._sum.total ?? 0;
  const revenueGoals = await getRevenueGoals();
  const monthlyTarget = revenueGoals.monthly > 0
    ? revenueGoals.monthly
    : (totalMonthRevenue * 1.2 || 10000);

  // Budget alert: count categories that are over budget this month
  const monthStartStr = monthStart.toISOString().split("T")[0];
  const todayStr = today;
  const [budgets, monthExpenses] = await Promise.all([
    getBudgets(),
    prisma.expense.groupBy({
      by: ["category"],
      where: { salonId: salon?.id ?? "", date: { gte: monthStartStr, lte: todayStr } },
      _sum: { amount: true },
    }),
  ]);
  const spentByCategory: Record<string, number> = {};
  for (const row of monthExpenses) {
    spentByCategory[row.category] = row._sum.amount ?? 0;
  }
  const overBudgetCount = EXPENSE_CATEGORIES.filter((cat) => {
    const budget = budgets[cat] ?? 0;
    const spent = spentByCategory[cat] ?? 0;
    return budget > 0 && spent > budget;
  }).length;

  // Build client activity feed: interleave new clients + completed appts
  const newClientItems = recentNewClients.map((c) => ({
    type: "new_client" as const,
    id: c.id,
    name: c.name,
    timestamp: c.createdAt.toISOString(),
  }));

  const completedApptItems = recentCompletedAppts.map((a) => ({
    type: "completed_appt" as const,
    id: a.id,
    clientName: a.Client?.name ?? "Walk-in",
    staffName: a.Staff.name,
    services: a.AppointmentService.map((as) => as.Service.name),
    timestamp: a.createdAt.toISOString(),
    amount: a.totalAmount,
  }));

  // Merge and sort by timestamp descending, take top 8
  const activityFeed = [
    ...newClientItems.map((item) => ({ ...item, _ts: item.timestamp })),
    ...completedApptItems.map((item) => ({ ...item, _ts: item.timestamp })),
  ]
    .sort((a, b) => (a._ts < b._ts ? 1 : -1))
    .slice(0, 8)
    .map(({ _ts: _discarded, ...rest }) => rest);

  // Fetch recent activity from lib (for the TodaySummaryWidget)
  const [recentActivity] = await Promise.all([
    getRecentActivity(20),
  ]);

  return (
    <DashboardHome
      salonName={salon?.name ?? "Your Salon"}
      currency={salon?.currency ?? "USD"}
      todayAppts={todayAppts}
      totalClients={totalClients}
      totalStaff={totalStaff}
      revenue={revenue}
      todayApptsList={todayApptsList.map(mapAppt)}
      // Existing new props
      revenueToday={todayRevenue._sum.total ?? 0}
      revenueThisWeek={weekRevenue._sum.total ?? 0}
      revenueThisMonth={totalMonthRevenue}
      newClientsThisWeek={newClientsThisWeek}
      todayScheduledCount={todayScheduledCount}
      completionRate={completionRate}
      upcomingAppts={upcomingAppts.map(mapAppt)}
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
      // New widget props
      clientsServedToday={clientsServedToday}
      nextHourAppts={nextHourAppts.map(mapAppt)}
      monthlyTarget={monthlyTarget}
      activityFeed={activityFeed}
      top3Staff={top3Staff.map((s) => ({ id: s.id, name: s.name }))}
      serverNow={now.toISOString()}
      birthdayClients={birthdayClientsThisMonth}
      servicesOffered={servicesOffered}
      avgRating={avgRating}
      activeMemberships={activeMemberships}
      recentActivity={recentActivity}
      overBudgetCount={overBudgetCount}
    />
  );
}
