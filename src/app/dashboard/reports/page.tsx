import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Calendar, DollarSign } from "lucide-react";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { RevenueChart } from "@/components/reports/revenue-chart";
import { TopServicesChart } from "@/components/reports/top-services-chart";
import { StaffPerformanceTable } from "@/components/reports/staff-performance-table";

export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29); // last 30 days inclusive
  return { from: toDateString(from), to: toDateString(to) };
}

/** Enumerate every ISO date between from and to (inclusive). */
function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(toDateString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const defaults = defaultRange();

  const rawFrom = typeof sp.from === "string" ? sp.from : defaults.from;
  const rawTo = typeof sp.to === "string" ? sp.to : defaults.to;

  // Clamp: from ≤ to
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;

  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // ── parallel data fetching ─────────────────────────────────────────────────

  const [
    // All-time summary (not filtered by date)
    totalInvoices,
    totalClients,
    totalAppts,
    // Date-filtered invoices (used for revenue chart + summary)
    filteredInvoices,
    // Date-filtered appointments (used for staff performance)
    filteredAppointments,
    // Payment method breakdown (all-time)
    byMethod,
  ] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { total: true }, _count: true }),
    prisma.client.count(),
    prisma.appointment.count(),

    prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: new Date(from + "T00:00:00.000Z"),
          lte: new Date(to + "T23:59:59.999Z"),
        },
      },
      select: {
        total: true,
        createdAt: true,
        Appointment: {
          select: {
            staffId: true,
            Staff: { select: { id: true, name: true } },
            AppointmentService: {
              select: { Service: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),

    prisma.appointment.findMany({
      where: {
        date: { gte: from, lte: to },
      },
      select: {
        staffId: true,
        status: true,
        Staff: { select: { id: true, name: true } },
        Invoice: { select: { total: true } },
      },
    }),

    prisma.invoice.groupBy({
      by: ["paymentMethod"],
      _count: true,
      _sum: { total: true },
    }),
  ]);

  // ── compute summary stats ──────────────────────────────────────────────────

  const allTimeRevenue = totalInvoices._sum.total ?? 0;
  const allTimeAvg =
    totalInvoices._count > 0 ? allTimeRevenue / totalInvoices._count : 0;

  const filteredRevenue = filteredInvoices.reduce((s, inv) => s + inv.total, 0);

  const stats = [
    {
      title: "Total Revenue (All Time)",
      value: fmt(allTimeRevenue),
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Total Clients",
      value: totalClients,
      icon: Users,
      color: "text-[#F48E16]",
      bg: "bg-[#F48E16]/10",
    },
    {
      title: "Total Appointments",
      value: totalAppts,
      icon: Calendar,
      color: "text-[#F41666]",
      bg: "bg-[#F41666]/10",
    },
    {
      title: "Avg. Invoice (All Time)",
      value: fmt(allTimeAvg),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  // ── revenue by day ─────────────────────────────────────────────────────────

  const revenueByDay: Record<string, number> = {};
  for (const inv of filteredInvoices) {
    const day = toDateString(new Date(inv.createdAt));
    revenueByDay[day] = (revenueByDay[day] ?? 0) + inv.total;
  }

  const revenueChartData = dateRange(from, to).map((date) => ({
    date,
    revenue: revenueByDay[date] ?? 0,
  }));

  // ── top 5 services by revenue ──────────────────────────────────────────────

  const serviceRevMap: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const inv of filteredInvoices) {
    if (!inv.Appointment) continue;
    const perService =
      inv.Appointment.AppointmentService.length > 0
        ? inv.total / inv.Appointment.AppointmentService.length
        : 0;
    for (const svc of inv.Appointment.AppointmentService) {
      const sid = svc.Service.id;
      if (!serviceRevMap[sid]) {
        serviceRevMap[sid] = { name: svc.Service.name, revenue: 0, count: 0 };
      }
      serviceRevMap[sid].revenue += perService;
      serviceRevMap[sid].count += 1;
    }
  }

  const topServices = Object.values(serviceRevMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ── staff performance ──────────────────────────────────────────────────────

  type StaffAccum = {
    staffId: string;
    name: string;
    totalAppointments: number;
    completedAppointments: number;
    revenue: number;
  };

  const staffMap: Record<string, StaffAccum> = {};

  for (const appt of filteredAppointments) {
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
    if (appt.status === "COMPLETED") {
      staffMap[sid].completedAppointments += 1;
    }
    if (appt.Invoice) {
      staffMap[sid].revenue += appt.Invoice.total;
    }
  }

  const staffPerformance = Object.values(staffMap).sort(
    (a, b) => b.revenue - a.revenue
  );

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      {/* Header + date range picker */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Business overview &amp; analytics</p>
        </div>
        <Suspense fallback={null}>
          <DateRangePicker from={from} to={to} />
        </Suspense>
      </div>

      {/* All-time summary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.title} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{s.title}</p>
                <div className={`${s.bg} p-2 rounded-lg`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtered period summary bar */}
      <div className="mb-8 flex items-center gap-3 px-5 py-3 bg-primary/8 border border-primary/20 rounded-xl text-sm">
        <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-muted-foreground">
          Period{" "}
          <span className="text-foreground font-medium">
            {from} → {to}
          </span>
          {" "}·{" "}
          <span className="text-primary font-semibold">{fmt(filteredRevenue)}</span>
          {" "}revenue from{" "}
          <span className="text-foreground font-medium">{filteredInvoices.length}</span>
          {" "}invoice{filteredInvoices.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Revenue over time line chart */}
      <div className="mb-8">
        <RevenueChart data={revenueChartData} currency={currency} />
      </div>

      {/* Top services + staff performance — side by side on wide screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <TopServicesChart data={topServices} currency={currency} />
        <StaffPerformanceTable data={staffPerformance} currency={currency} />
      </div>

      {/* Payment method breakdown (all-time, existing) */}
      {byMethod.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Revenue by Payment Method (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byMethod.map((m) => {
                const pct =
                  allTimeRevenue > 0
                    ? ((m._sum.total ?? 0) / allTimeRevenue) * 100
                    : 0;
                return (
                  <div key={m.paymentMethod}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">
                        {m.paymentMethod}
                      </span>
                      <span className="text-muted-foreground">
                        {fmt(m._sum.total ?? 0)} · {m._count} invoice
                        {m._count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
