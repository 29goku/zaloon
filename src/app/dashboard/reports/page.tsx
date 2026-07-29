import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  RefreshCw,
  XCircle,
  Calendar,
  BarChart3,
  Repeat2,
  ShieldCheck,
} from "lucide-react";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { RevenueChart } from "@/components/reports/revenue-chart";
import { StaffPerformanceTable } from "@/components/reports/staff-performance-table";
import { KpiCard } from "@/components/reports/kpi-card";
import { RevenueByDayChart } from "@/components/reports/revenue-by-day-chart";
import { TopServicesTable } from "@/components/reports/top-services-table";
import { TopClientsTable } from "@/components/reports/top-clients-table";
import { PeakHoursHeatmap } from "@/components/reports/peak-hours-heatmap";
import { StaffRevenueChart } from "@/components/reports/staff-revenue-chart";
import { RevenueByCategoryTable } from "@/components/reports/revenue-by-category-table";
import { StaffRatingsTable } from "@/components/reports/staff-ratings-table";
import { ServiceAnalysisTable } from "@/components/reports/service-analysis-table";
import { ExportAllButton } from "@/components/reports/export-all-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ── date helpers ──────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(d.getDate() + n);
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const copy = new Date(d);
  copy.setDate(d.getDate() - day);
  return copy;
}

function presetRange(preset: string): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case "thisMonth":
    case "this-month": {
      return {
        from: toDateString(startOfMonth(today)),
        to: toDateString(today),
      };
    }
    case "lastMonth":
    case "last-month": {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        from: toDateString(startOfMonth(lastMonth)),
        to: toDateString(endOfMonth(lastMonth)),
      };
    }
    case "last3Months": {
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      return {
        from: toDateString(threeMonthsAgo),
        to: toDateString(today),
      };
    }
    case "thisYear": {
      return {
        from: `${today.getFullYear()}-01-01`,
        to: toDateString(today),
      };
    }
    case "today": {
      const t = toDateString(today);
      return { from: t, to: t };
    }
    case "last7days":
    case "last-7-days": {
      return {
        from: toDateString(addDays(today, -6)),
        to: toDateString(today),
      };
    }
    case "last30days":
    case "last-30-days": {
      return {
        from: toDateString(addDays(today, -29)),
        to: toDateString(today),
      };
    }
    case "this-week": {
      return {
        from: toDateString(startOfWeek(today)),
        to: toDateString(today),
      };
    }
    default: {
      return {
        from: toDateString(startOfMonth(today)),
        to: toDateString(today),
      };
    }
  }
}

function previousPeriod(from: string, to: string): { prevFrom: string; prevTo: string } {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -diffDays);
  return { prevFrom: toDateString(prevStart), prevTo: toDateString(prevEnd) };
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const cur = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  while (cur <= end) {
    dates.push(toDateString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// ── preset nav ───────────────────────────────────────────────────────────────

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "last7days", label: "Last 7 Days" },
  { id: "last30days", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "last3Months", label: "Last 3 Months" },
  { id: "thisYear", label: "This Year" },
] as const;

// ── page ─────────────────────────────────────────────────────────────────────

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  // Support both ?period=thisMonth (new) and ?preset=this-month (legacy)
  const rawPeriod =
    typeof sp.period === "string"
      ? sp.period
      : typeof sp.preset === "string"
      ? sp.preset
      : null;

  const validPresetIds = (PRESETS.map((p) => p.id) as string[]).concat([
    "this-month",
    "last-month",
    "this-week",
    "last-7-days",
    "last-30-days",
    "last-3-months",
    "this-year",
  ]);
  const activePreset =
    rawPeriod && validPresetIds.includes(rawPeriod) ? rawPeriod : null;

  let from: string;
  let to: string;

  if (activePreset) {
    const range = presetRange(activePreset);
    from = range.from;
    to = range.to;
  } else if (typeof sp.from === "string" && typeof sp.to === "string") {
    const rawFrom = sp.from;
    const rawTo = sp.to;
    from = rawFrom <= rawTo ? rawFrom : rawTo;
    to = rawFrom <= rawTo ? rawTo : rawFrom;
  } else {
    const defaults = presetRange("thisMonth");
    from = defaults.from;
    to = defaults.to;
  }

  const { prevFrom, prevTo } = previousPeriod(from, to);

  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // ── parallel data fetching ────────────────────────────────────────────────

  const [
    currentInvoices,
    prevInvoices,
    currentAppointments,
    prevAppointments,
    allClients,
    paymentMethodBreakdown,
    currentExpensesAgg,
    prevExpensesAgg,
    allServices,
    staffReviews,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: new Date(from + "T00:00:00.000Z"),
          lte: new Date(to + "T23:59:59.999Z"),
        },
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        clientId: true,
        paymentMethod: true,
        Appointment: {
          select: {
            staffId: true,
            startTime: true,
            date: true,
            Staff: { select: { id: true, name: true } },
            AppointmentService: {
              select: {
                Service: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    categoryId: true,
                    durationMins: true,
                    ServiceCategory: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: new Date(prevFrom + "T00:00:00.000Z"),
          lte: new Date(prevTo + "T23:59:59.999Z"),
        },
      },
      select: { total: true, clientId: true },
    }),

    prisma.appointment.findMany({
      where: { date: { gte: from, lte: to } },
      select: {
        id: true,
        staffId: true,
        clientId: true,
        status: true,
        startTime: true,
        date: true,
        Staff: { select: { id: true, name: true } },
        Invoice: { select: { total: true } },
        AppointmentService: {
          select: {
            Service: { select: { id: true, name: true, durationMins: true } },
          },
        },
      },
    }),

    prisma.appointment.findMany({
      where: { date: { gte: prevFrom, lte: prevTo } },
      select: { status: true, clientId: true },
    }),

    prisma.client.findMany({
      select: { id: true, name: true, createdAt: true },
    }),

    prisma.invoice.groupBy({
      by: ["paymentMethod"],
      where: {
        createdAt: {
          gte: new Date(from + "T00:00:00.000Z"),
          lte: new Date(to + "T23:59:59.999Z"),
        },
      },
      _count: true,
      _sum: { total: true },
    }),

    prisma.expense.aggregate({
      where: {
        salonId: salon?.id ?? "",
        date: { gte: from, lte: to },
      },
      _sum: { amount: true },
    }),

    prisma.expense.aggregate({
      where: {
        salonId: salon?.id ?? "",
        date: { gte: prevFrom, lte: prevTo },
      },
      _sum: { amount: true },
    }),

    // All active services for duration reference
    prisma.service.findMany({
      select: { id: true, name: true, durationMins: true, categoryId: true },
    }),

    // Staff reviews in the period
    prisma.review.findMany({
      where: {
        createdAt: {
          gte: new Date(from + "T00:00:00.000Z"),
          lte: new Date(to + "T23:59:59.999Z"),
        },
        staffId: { not: null },
      },
      select: { staffId: true, rating: true },
    }),
  ]);

  // ── Revenue KPIs ──────────────────────────────────────────────────────────

  const currentRevenue = currentInvoices.reduce((s, inv) => s + inv.total, 0);
  const prevRevenue = prevInvoices.reduce((s, inv) => s + inv.total, 0);
  const currentExpenses = currentExpensesAgg._sum.amount ?? 0;
  const prevExpenses = prevExpensesAgg._sum.amount ?? 0;
  const currentNetProfit = currentRevenue - currentExpenses;
  const prevNetProfit = prevRevenue - prevExpenses;
  const currentAvgTicket =
    currentInvoices.length > 0 ? currentRevenue / currentInvoices.length : 0;
  const prevAvgTicket =
    prevInvoices.length > 0 ? prevRevenue / prevInvoices.length : 0;

  // ── Appointment KPIs ──────────────────────────────────────────────────────

  const currentApptCount = currentAppointments.length;
  const prevApptCount = prevAppointments.length;

  const cancelledCurrent = currentAppointments.filter(
    (a) => a.status === "CANCELLED" || a.status === "CANCELED"
  ).length;
  const cancelRateCurrent =
    currentApptCount > 0 ? (cancelledCurrent / currentApptCount) * 100 : 0;

  const cancelledPrev = prevAppointments.filter(
    (a) => a.status === "CANCELLED" || a.status === "CANCELED"
  ).length;
  const cancelRatePrev =
    prevApptCount > 0 ? (cancelledPrev / prevApptCount) * 100 : 0;

  const cancelRateChange =
    cancelRatePrev === 0 && cancelRateCurrent === 0
      ? null
      : cancelRatePrev === 0
      ? null
      : ((cancelRateCurrent - cancelRatePrev) / cancelRatePrev) * 100;

  // ── Client analytics ─────────────────────────────────────────────────────

  const fromDate = new Date(from + "T00:00:00.000Z");
  const toDate = new Date(to + "T23:59:59.999Z");
  const prevFromDate = new Date(prevFrom + "T00:00:00.000Z");
  const prevToDate = new Date(prevTo + "T23:59:59.999Z");

  const clientInfoMap = new Map(
    allClients.map((c) => [c.id, { name: c.name, createdAt: new Date(c.createdAt) }])
  );

  const currentClientIds = new Set(
    currentAppointments
      .filter((a) => a.clientId !== null)
      .map((a) => a.clientId as string)
  );

  let newClients = 0;
  let returningClients = 0;
  for (const cid of currentClientIds) {
    const info = clientInfoMap.get(cid);
    if (info && info.createdAt >= fromDate && info.createdAt <= toDate) {
      newClients++;
    } else {
      returningClients++;
    }
  }

  const prevClientIds = new Set(
    prevAppointments
      .filter((a) => a.clientId !== null)
      .map((a) => a.clientId as string)
  );
  let prevNewClients = 0;
  let prevReturningClients = 0;
  for (const cid of prevClientIds) {
    const info = clientInfoMap.get(cid);
    if (info && info.createdAt >= prevFromDate && info.createdAt <= prevToDate) {
      prevNewClients++;
    } else {
      prevReturningClients++;
    }
  }

  const totalActiveClients = newClients + returningClients;
  const returningRatio =
    totalActiveClients > 0
      ? Math.round((returningClients / totalActiveClients) * 100)
      : 0;

  // Retention: clients with more than one visit in the period
  const clientVisitCounts = new Map<string, number>();
  for (const appt of currentAppointments) {
    if (!appt.clientId) continue;
    clientVisitCounts.set(appt.clientId, (clientVisitCounts.get(appt.clientId) ?? 0) + 1);
  }
  const multiVisitClients = [...clientVisitCounts.values()].filter((v) => v > 1).length;
  const retentionRate =
    currentClientIds.size > 0
      ? Math.round((multiVisitClients / currentClientIds.size) * 100)
      : 0;

  // Top 10 clients by spend
  const clientSpendMap = new Map<
    string,
    { name: string; totalSpend: number; visitCount: number }
  >();
  for (const inv of currentInvoices) {
    if (!inv.clientId) continue;
    const info = clientInfoMap.get(inv.clientId);
    const name = info?.name ?? "Unknown";
    const existing = clientSpendMap.get(inv.clientId);
    if (existing) {
      existing.totalSpend += inv.total;
      existing.visitCount += 1;
    } else {
      clientSpendMap.set(inv.clientId, { name, totalSpend: inv.total, visitCount: 1 });
    }
  }
  const topClients = [...clientSpendMap.entries()]
    .sort((a, b) => b[1].totalSpend - a[1].totalSpend)
    .slice(0, 10)
    .map(([clientId, d]) => ({
      clientId,
      name: d.name,
      totalSpend: d.totalSpend,
      visitCount: d.visitCount,
      avgTicket: d.visitCount > 0 ? d.totalSpend / d.visitCount : 0,
    }));

  // ── Revenue over time ─────────────────────────────────────────────────────

  const revenueByDay: Record<string, number> = {};
  for (const inv of currentInvoices) {
    const day = toDateString(new Date(inv.createdAt));
    revenueByDay[day] = (revenueByDay[day] ?? 0) + inv.total;
  }
  const revenueChartData = dateRange(from, to).map((date) => ({
    date,
    revenue: revenueByDay[date] ?? 0,
  }));

  // ── Revenue by day of week ────────────────────────────────────────────────

  const revByDow: Record<number, { revenue: number; count: number }> = {};
  for (const inv of currentInvoices) {
    const dow = new Date(inv.createdAt).getDay();
    if (!revByDow[dow]) revByDow[dow] = { revenue: 0, count: 0 };
    revByDow[dow].revenue += inv.total;
    revByDow[dow].count += 1;
  }
  const revenueByDayData = Object.entries(revByDow).map(([dow, v]) => ({
    dayOfWeek: Number(dow),
    ...v,
  }));

  const busiestDow =
    revenueByDayData.length > 0
      ? revenueByDayData.reduce((best, cur) => (cur.count > best.count ? cur : best))
      : null;
  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const busiestDayLabel = busiestDow ? DOW_LABELS[busiestDow.dayOfWeek] : null;

  // ── Peak hours heatmap ────────────────────────────────────────────────────

  const peakHourCounts = new Map<string, number>();
  for (const appt of currentAppointments) {
    if (!appt.startTime) continue;
    const hour = parseInt(appt.startTime.split(":")[0], 10);
    if (isNaN(hour)) continue;
    const [y, m, d] = appt.date.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    const key = `${hour}-${dow}`;
    peakHourCounts.set(key, (peakHourCounts.get(key) ?? 0) + 1);
  }
  const peakHoursData = [...peakHourCounts.entries()].map(([key, count]) => {
    const [hour, dow] = key.split("-").map(Number);
    return { hour, dayOfWeek: dow, count };
  });

  // ── Top services ──────────────────────────────────────────────────────────

  const serviceRevMap: Record<
    string,
    { name: string; revenue: number; count: number; categoryId: string; categoryName: string }
  > = {};
  for (const inv of currentInvoices) {
    if (!inv.Appointment) continue;
    const services = inv.Appointment.AppointmentService;
    if (services.length === 0) continue;
    const perService = inv.total / services.length;
    for (const svc of services) {
      const sid = svc.Service.id;
      if (!serviceRevMap[sid]) {
        serviceRevMap[sid] = {
          name: svc.Service.name,
          revenue: 0,
          count: 0,
          categoryId: svc.Service.categoryId ?? "",
          categoryName: svc.Service.ServiceCategory?.name ?? "Uncategorized",
        };
      }
      serviceRevMap[sid].revenue += perService;
      serviceRevMap[sid].count += 1;
    }
  }

  const topServicesByRevenue = Object.values(serviceRevMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((s) => ({
      name: s.name,
      count: s.count,
      revenue: s.revenue,
      avgPrice: s.count > 0 ? s.revenue / s.count : 0,
    }));

  const topServicesByBookings = Object.values(serviceRevMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((s) => ({
      name: s.name,
      count: s.count,
      revenue: s.revenue,
      avgPrice: s.count > 0 ? s.revenue / s.count : 0,
    }));

  // ── Staff analytics ───────────────────────────────────────────────────────

  type StaffAccum = {
    staffId: string;
    name: string;
    totalAppointments: number;
    completedAppointments: number;
    revenue: number;
  };

  const staffMap: Record<string, StaffAccum> = {};
  for (const appt of currentAppointments) {
    const sid = appt.staffId;
    if (!staffMap[sid]) {
      staffMap[sid] = {
        staffId: sid,
        name: appt.Staff.name,
        totalAppointments: 0,
        completedAppointments: 0,
        revenue: 0,
      };
    }
    staffMap[sid].totalAppointments += 1;
    if (appt.status === "COMPLETED") staffMap[sid].completedAppointments += 1;
    if (appt.Invoice) staffMap[sid].revenue += appt.Invoice.total;
  }

  const staffPerformance = Object.values(staffMap).sort((a, b) => b.revenue - a.revenue);

  const staffRevenueChartData = staffPerformance.map((s) => ({
    staffId: s.staffId,
    name: s.name,
    revenue: s.revenue,
    appointments: s.totalAppointments,
    avgTicket: s.completedAppointments > 0 ? s.revenue / s.completedAppointments : 0,
  }));

  // ── Revenue by category ───────────────────────────────────────────────────

  const categoryRevMap: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const svc of Object.values(serviceRevMap)) {
    const cid = svc.categoryId;
    if (!categoryRevMap[cid]) {
      categoryRevMap[cid] = { name: svc.categoryName, revenue: 0, count: 0 };
    }
    categoryRevMap[cid].revenue += svc.revenue;
    categoryRevMap[cid].count += svc.count;
  }
  const totalCatRevenue = Object.values(categoryRevMap).reduce((s, c) => s + c.revenue, 0);
  const revenueByCategoryData = Object.entries(categoryRevMap).map(([id, c]) => ({
    categoryId: id,
    categoryName: c.name,
    revenue: c.revenue,
    bookingCount: c.count,
    pct: totalCatRevenue > 0 ? (c.revenue / totalCatRevenue) * 100 : 0,
  }));

  // ── Staff ratings ─────────────────────────────────────────────────────────

  const staffRatingMap: Record<string, { total: number; count: number }> = {};
  for (const rev of staffReviews) {
    if (!rev.staffId) continue;
    const sid = rev.staffId;
    if (!staffRatingMap[sid]) staffRatingMap[sid] = { total: 0, count: 0 };
    staffRatingMap[sid].total += rev.rating;
    staffRatingMap[sid].count += 1;
  }

  const staffRatingsData = staffPerformance.map((s) => {
    const ratings = staffRatingMap[s.staffId];
    return {
      staffId: s.staffId,
      name: s.name,
      avgRating: ratings && ratings.count > 0 ? ratings.total / ratings.count : 0,
      reviewCount: ratings?.count ?? 0,
      revenue: s.revenue,
      totalAppointments: s.totalAppointments,
      completedAppointments: s.completedAppointments,
    };
  });

  // ── Service cancellation analysis ─────────────────────────────────────────

  const serviceInfoMap = new Map(allServices.map((s) => [s.id, s]));
  const serviceCancellationMap: Record<
    string,
    { name: string; expectedDurationMins: number; total: number; cancelled: number }
  > = {};

  for (const appt of currentAppointments) {
    for (const asvc of appt.AppointmentService) {
      const sid = asvc.Service.id;
      if (!serviceCancellationMap[sid]) {
        const info = serviceInfoMap.get(sid);
        serviceCancellationMap[sid] = {
          name: asvc.Service.name,
          expectedDurationMins: info?.durationMins ?? asvc.Service.durationMins,
          total: 0,
          cancelled: 0,
        };
      }
      serviceCancellationMap[sid].total += 1;
      if (appt.status === "CANCELLED" || appt.status === "CANCELED") {
        serviceCancellationMap[sid].cancelled += 1;
      }
    }
  }

  const serviceAnalysisData = Object.entries(serviceCancellationMap)
    .filter(([, v]) => v.total > 0)
    .map(([id, v]) => ({
      serviceId: id,
      name: v.name,
      expectedDurationMins: v.expectedDurationMins,
      totalBookings: v.total,
      cancelledBookings: v.cancelled,
      cancellationRate: v.total > 0 ? (v.cancelled / v.total) * 100 : 0,
    }));

  // ── Payment method totals ─────────────────────────────────────────────────

  const periodRevenue = paymentMethodBreakdown.reduce(
    (s, m) => s + (m._sum.total ?? 0),
    0
  );

  const methodColors: Record<string, string> = {
    CASH: "hsl(var(--primary))",
    CARD: "#F48E16",
    CREDIT: "#F41666",
    DEBIT: "#F48E16",
    TRANSFER: "hsl(var(--primary) / 0.7)",
    UPI: "#3b82f6",
    WALLET: "#8b5cf6",
    OTHER: "hsl(var(--muted-foreground) / 0.6)",
  };

  // ── Export All data ───────────────────────────────────────────────────────

  const exportAllSections = [
    {
      title: "Revenue Summary",
      rows: [
        {
          Metric: "Total Revenue",
          Value: currentRevenue,
          "Prev Period": prevRevenue,
          "Change %": pctChange(currentRevenue, prevRevenue) != null ? pctChange(currentRevenue, prevRevenue)!.toFixed(1) : "N/A",
        },
        { Metric: "Total Expenses", Value: currentExpenses, "Prev Period": prevExpenses },
        { Metric: "Net Profit", Value: currentNetProfit, "Prev Period": prevNetProfit },
        { Metric: "Avg Invoice Value", Value: currentAvgTicket.toFixed(2) },
        { Metric: "Total Invoices", Value: currentInvoices.length },
      ],
    },
    {
      title: "Revenue by Payment Method",
      rows: paymentMethodBreakdown.map((m) => ({
        "Payment Method": m.paymentMethod,
        Revenue: m._sum.total ?? 0,
        Invoices: m._count,
        "% of Total":
          periodRevenue > 0
            ? (((m._sum.total ?? 0) / periodRevenue) * 100).toFixed(1)
            : "0",
      })),
    },
    {
      title: "Revenue by Service Category",
      rows: revenueByCategoryData.map((r) => ({
        Category: r.categoryName,
        Revenue: r.revenue,
        Bookings: r.bookingCount,
        "% of Total": r.pct.toFixed(1),
      })),
    },
    {
      title: "Top 10 Services by Revenue",
      rows: topServicesByRevenue.map((r, i) => ({
        Rank: i + 1,
        Service: r.name,
        Bookings: r.count,
        "Avg Price": r.avgPrice.toFixed(2),
        Revenue: r.revenue.toFixed(2),
      })),
    },
    {
      title: "Client Analytics",
      rows: [
        { Metric: "New Clients", Value: newClients },
        { Metric: "Returning Clients", Value: returningClients },
        { Metric: "Returning Ratio %", Value: returningRatio },
        { Metric: "Retention Rate %", Value: retentionRate },
      ],
    },
    {
      title: "Top 10 Clients by Spend",
      rows: topClients.map((r, i) => ({
        Rank: i + 1,
        Client: r.name,
        Visits: r.visitCount,
        "Avg Ticket": r.avgTicket.toFixed(2),
        "Total Spend": r.totalSpend.toFixed(2),
      })),
    },
    {
      title: "Staff Performance",
      rows: staffPerformance.map((s) => ({
        "Staff Member": s.name,
        "Total Appointments": s.totalAppointments,
        Completed: s.completedAppointments,
        "Completion %":
          s.totalAppointments > 0
            ? ((s.completedAppointments / s.totalAppointments) * 100).toFixed(1)
            : "0",
        Revenue: s.revenue.toFixed(2),
      })),
    },
    {
      title: "Staff Ratings",
      rows: staffRatingsData.map((s) => ({
        "Staff Member": s.name,
        "Avg Rating": s.avgRating > 0 ? s.avgRating.toFixed(1) : "N/A",
        Reviews: s.reviewCount,
        "Utilization %":
          s.totalAppointments > 0
            ? ((s.completedAppointments / s.totalAppointments) * 100).toFixed(1)
            : "0",
        Revenue: s.revenue.toFixed(2),
      })),
    },
    {
      title: "Service Cancellation Analysis",
      rows: serviceAnalysisData.map((s) => ({
        Service: s.name,
        "Expected Duration (min)": s.expectedDurationMins,
        "Total Bookings": s.totalBookings,
        Cancellations: s.cancelledBookings,
        "Cancellation Rate %": s.cancellationRate.toFixed(1),
      })),
    },
  ];

  // ── MoM growth badge ──────────────────────────────────────────────────────

  const momGrowth = pctChange(currentRevenue, prevRevenue);
  const momSign = momGrowth !== null && momGrowth > 0 ? "+" : "";
  const momLabel =
    momGrowth !== null ? `${momSign}${momGrowth.toFixed(1)}% vs prev period` : null;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports &amp; Analytics</h1>
          <p className="text-muted-foreground mt-1">Business performance overview</p>
        </div>
        <ExportAllButton sections={exportAllSections} dateFrom={from} dateTo={to} />
      </div>

      {/* Date range filter */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-1 flex-wrap">
          {PRESETS.map((preset) => {
            const isActive =
              activePreset === preset.id ||
              (preset.id === "thisMonth" && activePreset === "this-month") ||
              (preset.id === "lastMonth" && activePreset === "last-month") ||
              (preset.id === "last7days" && activePreset === "last-7-days") ||
              (preset.id === "last30days" && activePreset === "last-30-days") ||
              (preset.id === "last3Months" && activePreset === "last-3-months") ||
              (preset.id === "thisYear" && activePreset === "this-year") ||
              (!activePreset && preset.id === "thisMonth" && !sp.from);
            return (
              <Link
                key={preset.id}
                href={`?period=${preset.id}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {preset.label}
              </Link>
            );
          })}
          <Link
            href={`?from=${from}&to=${to}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !activePreset && sp.from
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Custom
          </Link>
        </div>

        <Suspense fallback={null}>
          <DateRangePicker from={from} to={to} />
        </Suspense>
      </div>

      {/* Period banner + MoM growth badge */}
      <div className="flex items-center gap-3 px-5 py-3 bg-primary/8 border border-primary/20 rounded-xl text-sm">
        <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-muted-foreground">
          Showing{" "}
          <span className="text-foreground font-medium">
            {from} → {to}
          </span>
          {" "}·{" "}compared to{" "}
          <span className="text-foreground font-medium">
            {prevFrom} → {prevTo}
          </span>
        </span>
        {momLabel && (
          <span
            className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
              (momGrowth ?? 0) >= 0
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-[#F41666]/15 text-[#F41666]"
            }`}
          >
            {momLabel}
          </span>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 · Revenue Report
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Revenue Report</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Total Revenue"
            value={fmt(currentRevenue)}
            changePct={pctChange(currentRevenue, prevRevenue)}
            icon={DollarSign}
            iconColor="text-primary"
            iconBg="bg-primary/10"
          />
          <KpiCard
            label="Total Expenses"
            value={fmt(currentExpenses)}
            changePct={pctChange(currentExpenses, prevExpenses)}
            invertTrend
            icon={TrendingDown}
            iconColor="text-[#F41666]"
            iconBg="bg-[#F41666]/10"
          />
          <KpiCard
            label="Net Profit"
            value={fmt(currentNetProfit)}
            changePct={pctChange(currentNetProfit, prevNetProfit)}
            icon={TrendingUp}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10"
          />
          <KpiCard
            label="Avg Invoice Value"
            value={fmt(currentAvgTicket)}
            changePct={pctChange(currentAvgTicket, prevAvgTicket)}
            icon={BarChart3}
            iconColor="text-primary"
            iconBg="bg-primary/10"
          />
        </div>

        <div className="mb-6">
          <RevenueChart data={revenueChartData} currency={currency} />
        </div>

        {paymentMethodBreakdown.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Revenue by Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentMethodBreakdown
                  .sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0))
                  .map((m) => {
                    const pct =
                      periodRevenue > 0
                        ? ((m._sum.total ?? 0) / periodRevenue) * 100
                        : 0;
                    const barColor =
                      methodColors[m.paymentMethod] ?? "hsl(var(--primary) / 0.6)";
                    return (
                      <div key={m.paymentMethod}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-foreground font-medium flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: barColor }}
                            />
                            {m.paymentMethod}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {fmt(m._sum.total ?? 0)}{" "}
                            <span className="text-foreground font-medium">
                              ({pct.toFixed(1)}%)
                            </span>
                            {" "}· {m._count} invoice{m._count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6">
          <RevenueByCategoryTable data={revenueByCategoryData} currency={currency} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 · Service Report
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Service Report</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
              Top 10 by Revenue
            </p>
            <TopServicesTable data={topServicesByRevenue} currency={currency} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
              Most Popular (by Booking Count)
            </p>
            <TopServicesTable data={topServicesByBookings} currency={currency} />
          </div>
        </div>
        <ServiceAnalysisTable data={serviceAnalysisData} />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3 · Client Report
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Client Report</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="New Clients"
            value={newClients}
            changePct={pctChange(newClients, prevNewClients)}
            icon={UserPlus}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10"
          />
          <KpiCard
            label="Returning Clients"
            value={returningClients}
            changePct={pctChange(returningClients, prevReturningClients)}
            icon={RefreshCw}
            iconColor="text-[#F48E16]"
            iconBg="bg-[#F48E16]/10"
          />
          <KpiCard
            label="Returning Ratio"
            value={`${returningRatio}%`}
            icon={Repeat2}
            iconColor="text-primary"
            iconBg="bg-primary/10"
          />
          <KpiCard
            label="Retention Rate"
            value={`${retentionRate}%`}
            icon={ShieldCheck}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10"
          />
        </div>

        <p className="text-xs text-muted-foreground mb-5">
          Returning ratio = returning ÷ all active clients. Retention rate = clients who visited more than once in the period.
        </p>

        <TopClientsTable data={topClients} currency={currency} />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4 · Staff Report
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Staff Report</h2>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <KpiCard
            label="Total Appointments"
            value={currentApptCount}
            changePct={pctChange(currentApptCount, prevApptCount)}
            icon={Calendar}
            iconColor="text-[#F41666]"
            iconBg="bg-[#F41666]/10"
          />
          <KpiCard
            label="Active Staff"
            value={staffPerformance.length}
            icon={Users}
            iconColor="text-primary"
            iconBg="bg-primary/10"
          />
          <KpiCard
            label="Cancellation Rate"
            value={`${cancelRateCurrent.toFixed(1)}%`}
            changePct={cancelRateChange}
            invertTrend
            icon={XCircle}
            iconColor="text-[#F41666]"
            iconBg="bg-[#F41666]/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <StaffRevenueChart data={staffRevenueChartData} currency={currency} />
          <StaffPerformanceTable data={staffPerformance} currency={currency} />
        </div>

        <StaffRatingsTable data={staffRatingsData} currency={currency} />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5 · Time-based Patterns
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Time-based Patterns</h2>

        {busiestDayLabel && (
          <p className="text-sm text-muted-foreground mb-4">
            Busiest day of week:{" "}
            <span className="font-semibold text-foreground">{busiestDayLabel}</span>
            {" "}with{" "}
            <span className="font-semibold text-foreground">
              {busiestDow?.count ?? 0}
            </span>{" "}
            appointments.
          </p>
        )}

        <div className="mb-6">
          <RevenueByDayChart data={revenueByDayData} currency={currency} />
        </div>

        <PeakHoursHeatmap data={peakHoursData} />
      </section>
    </div>
  );
}
