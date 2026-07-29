export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Scissors,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(d.getDate() + n);
  return c;
}

function makeFmt(currency: string) {
  return (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
}

// ── types ─────────────────────────────────────────────────────────────────────

type SortKey = "revenue" | "appointments" | "price";

interface ServiceStat {
  id: string;
  name: string;
  category: string;
  price: number;
  appointments: number;
  revenue: number;
  avgPrice: number;
  lastMonthAppts: number;
  rank: number;
}

interface CategoryStat {
  name: string;
  revenue: number;
  appointments: number;
}

interface UnderperformingService {
  id: string;
  name: string;
  category: string;
  price: number;
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

const BAR_COLORS = [
  "var(--primary)",
  "#F48E16",
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#a855f7", // purple-500
  "#F41666",
];

function CategoryBarChart({
  data,
  fmt,
}: {
  data: CategoryStat[];
  fmt: (n: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No category data for this period.
      </div>
    );
  }

  const rowHeight = 44;
  const paddingTop = 16;
  const paddingBottom = 16;
  const labelWidth = 140;
  const amountWidth = 80;
  const barAreaWidth = 600 - labelWidth - amountWidth - 24; // 24 = gaps
  const svgHeight = paddingTop + data.length * rowHeight + paddingBottom;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <svg
      viewBox={`0 0 600 ${svgHeight}`}
      width="100%"
      aria-label="Revenue by Category bar chart"
      role="img"
    >
      {data.map((cat, i) => {
        const barWidth = Math.max((cat.revenue / maxRevenue) * barAreaWidth, 4);
        const y = paddingTop + i * rowHeight;
        const barY = y + rowHeight / 2 - 10;
        const color = BAR_COLORS[i % BAR_COLORS.length];

        return (
          <g key={cat.name}>
            {/* Category label */}
            <text
              x={labelWidth - 8}
              y={barY + 14}
              textAnchor="end"
              fontSize={12}
              fill="currentColor"
              className="fill-foreground/80"
            >
              {cat.name.length > 18 ? cat.name.slice(0, 17) + "…" : cat.name}
            </text>

            {/* Bar background */}
            <rect
              x={labelWidth}
              y={barY}
              width={barAreaWidth}
              height={20}
              rx={4}
              fill="currentColor"
              className="fill-foreground/5"
            />

            {/* Bar fill */}
            <rect
              x={labelWidth}
              y={barY}
              width={barWidth}
              height={20}
              rx={4}
              fill={color}
              opacity={0.85}
            >
              <title>
                {cat.name}: {fmt(cat.revenue)} ({cat.appointments} appts)
              </title>
            </rect>

            {/* Revenue label */}
            <text
              x={labelWidth + barAreaWidth + 8}
              y={barY + 14}
              textAnchor="start"
              fontSize={11}
              fill="currentColor"
              className="fill-foreground/70"
            >
              {fmt(cat.revenue)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ServicesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const sp = await searchParams;
  const rawSort = sp.sort ?? "revenue";
  const sortKey: SortKey =
    rawSort === "appointments" || rawSort === "price" ? rawSort : "revenue";

  // ── data fetching ──────────────────────────────────────────────────────────

  const salon = await prisma.salon.findFirst();
  const salonId = salon?.id ?? "";
  const currency = salon?.currency ?? "USD";
  const fmt = makeFmt(currency);

  const now = new Date();
  const currMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const currMonthEnd = toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
  const lastMonthEnd = toDateString(
    new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0)
  );

  const thirtyDaysAgo = toDateString(addDays(new Date(), -30));
  const todayStr = toDateString(new Date());

  const [allServices, currMonthAppts, lastMonthAppts, recentAppts] =
    await Promise.all([
      prisma.service.findMany({
        where: { salonId },
        select: {
          id: true,
          name: true,
          price: true,
          durationMins: true,
          active: true,
          categoryId: true,
          ServiceCategory: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      }),

      prisma.appointment.findMany({
        where: {
          salonId,
          date: { gte: currMonthStart, lte: currMonthEnd },
        },
        select: {
          id: true,
          status: true,
          AppointmentService: { select: { serviceId: true } },
          Invoice: { select: { total: true, status: true } },
        },
      }),

      prisma.appointment.findMany({
        where: {
          salonId,
          date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        select: {
          id: true,
          status: true,
          AppointmentService: { select: { serviceId: true } },
        },
      }),

      prisma.appointment.findMany({
        where: {
          salonId,
          date: { gte: thirtyDaysAgo, lte: todayStr },
        },
        select: {
          AppointmentService: { select: { serviceId: true } },
        },
      }),
    ]);

  // ── calculations ───────────────────────────────────────────────────────────

  // Service stats (current month)
  const serviceMap = new Map(allServices.map((s) => [s.id, s]));

  // Accumulate appt count + revenue per service for current month
  const currApptCount = new Map<string, number>();
  const currRevenue = new Map<string, number>();

  for (const appt of currMonthAppts) {
    if (appt.status !== "COMPLETED" && appt.status !== "SCHEDULED") continue;
    const services = appt.AppointmentService;
    if (services.length === 0) continue;

    const invoiceTotal = appt.Invoice?.total ?? 0;
    const revenuePerService = invoiceTotal / services.length;

    for (const svc of services) {
      currApptCount.set(svc.serviceId, (currApptCount.get(svc.serviceId) ?? 0) + 1);
      currRevenue.set(svc.serviceId, (currRevenue.get(svc.serviceId) ?? 0) + revenuePerService);
    }
  }

  // Last month appt count per service
  const lastApptCount = new Map<string, number>();
  for (const appt of lastMonthAppts) {
    if (appt.status !== "COMPLETED" && appt.status !== "SCHEDULED") continue;
    for (const svc of appt.AppointmentService) {
      lastApptCount.set(svc.serviceId, (lastApptCount.get(svc.serviceId) ?? 0) + 1);
    }
  }

  // Recent appts (last 30 days) per service
  const recentCount = new Map<string, number>();
  for (const appt of recentAppts) {
    for (const svc of appt.AppointmentService) {
      recentCount.set(svc.serviceId, (recentCount.get(svc.serviceId) ?? 0) + 1);
    }
  }

  // Build service stats list
  const serviceStats: ServiceStat[] = allServices.map((s) => {
    const appts = currApptCount.get(s.id) ?? 0;
    const revenue = currRevenue.get(s.id) ?? 0;
    const avgPrice = appts > 0 ? revenue / appts : s.price;
    return {
      id: s.id,
      name: s.name,
      category: s.ServiceCategory?.name ?? "Uncategorized",
      price: s.price,
      appointments: appts,
      revenue,
      avgPrice,
      lastMonthAppts: lastApptCount.get(s.id) ?? 0,
      rank: 0,
    };
  });

  // Sort by revenue desc to assign rank
  const byRevenue = [...serviceStats].sort((a, b) => b.revenue - a.revenue);
  byRevenue.forEach((s, i) => {
    s.rank = i + 1;
  });

  // Apply sort
  const sorted = [...serviceStats].sort((a, b) => {
    if (sortKey === "appointments") return b.appointments - a.appointments;
    if (sortKey === "price") return b.price - a.price;
    return b.revenue - a.revenue;
  });

  // Category comparison
  const categoryMap = new Map<string, CategoryStat>();
  for (const s of serviceStats) {
    const cat = s.category;
    const existing = categoryMap.get(cat) ?? { name: cat, revenue: 0, appointments: 0 };
    existing.revenue += s.revenue;
    existing.appointments += s.appointments;
    categoryMap.set(cat, existing);
  }
  const categoryStats: CategoryStat[] = Array.from(categoryMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  // Growing / declining services
  const growing = serviceStats
    .filter((s) => s.appointments > s.lastMonthAppts)
    .sort((a, b) => b.appointments - a.appointments - (b.lastMonthAppts - a.lastMonthAppts))
    .slice(0, 5);

  const declining = serviceStats
    .filter((s) => s.appointments < s.lastMonthAppts)
    .sort((a, b) => a.appointments - a.lastMonthAppts - (b.appointments - b.lastMonthAppts))
    .slice(0, 5);

  // Underperforming: active services with 0 bookings in last 30 days
  const underperforming: UnderperformingService[] = allServices
    .filter((s) => s.active && (recentCount.get(s.id) ?? 0) === 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      category: s.ServiceCategory?.name ?? "Uncategorized",
      price: s.price,
    }));

  const monthLabel = now.toLocaleString("en", { month: "long", year: "numeric" });

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/reports" className="hover:text-foreground transition-colors">
          Reports
        </Link>
        <ArrowRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Services</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Scissors className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Service Performance</h1>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </div>
      </div>

      {/* Sort pills */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { key: "revenue", label: "Revenue" },
            { key: "appointments", label: "Appointments" },
            { key: "price", label: "Avg Price" },
          ] as { key: SortKey; label: string }[]
        ).map(({ key, label }) => (
          <Link
            key={key}
            href={`?sort=${key}`}
            className={[
              "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              sortKey === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Service Stats Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Service Stats — {monthLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground px-6">
              No services found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium w-12">#</th>
                    <th className="px-4 py-3 text-left font-medium">Service</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Appts</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">
                      Avg Price
                    </th>
                    <th className="px-4 py-3 text-center font-medium hidden sm:table-cell">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((svc, idx) => {
                    const trendDiff = svc.appointments - svc.lastMonthAppts;
                    const isZebra = idx % 2 === 1;

                    return (
                      <tr
                        key={svc.id}
                        className={[
                          "border-b border-border/50 hover:bg-muted/40 transition-colors",
                          isZebra ? "bg-muted/20" : "",
                        ].join(" ")}
                      >
                        {/* Rank */}
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {svc.rank}
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3 font-medium">{svc.name}</td>

                        {/* Category */}
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {svc.category}
                        </td>

                        {/* Appointments */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          {svc.appointments}
                        </td>

                        {/* Revenue */}
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {fmt(svc.revenue)}
                        </td>

                        {/* Avg Price */}
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                          {fmt(svc.avgPrice)}
                        </td>

                        {/* Trend */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex justify-center">
                            {trendDiff > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                                <TrendingUp className="h-3 w-3" />+{trendDiff}
                              </span>
                            ) : trendDiff < 0 ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{
                                  background: "rgba(244,22,102,0.10)",
                                  color: "#F41666",
                                }}
                              >
                                <TrendingDown className="h-3 w-3" />
                                {trendDiff}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Category Bar Chart ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" style={{ color: "#F48E16" }} />
            Revenue by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBarChart data={categoryStats} fmt={fmt} />
        </CardContent>
      </Card>

      {/* ── Growing / Declining two-column ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Growing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-emerald-500">
              <TrendingUp className="h-4 w-4" />
              Growing Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            {growing.length === 0 ? (
              <p className="text-sm text-muted-foreground">No growing services this month.</p>
            ) : (
              <ul className="space-y-2">
                {growing.map((svc) => {
                  const diff = svc.appointments - svc.lastMonthAppts;
                  return (
                    <li
                      key={svc.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">{svc.category}</p>
                      </div>
                      <span className="ml-3 shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">
                        <TrendingUp className="h-3 w-3" />+{diff} appts
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Declining */}
        <Card>
          <CardHeader>
            <CardTitle
              className="flex items-center gap-2 text-base"
              style={{ color: "#F41666" }}
            >
              <TrendingDown className="h-4 w-4" />
              Declining Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            {declining.length === 0 ? (
              <p className="text-sm text-muted-foreground">No declining services this month.</p>
            ) : (
              <ul className="space-y-2">
                {declining.map((svc) => {
                  const diff = svc.appointments - svc.lastMonthAppts;
                  return (
                    <li
                      key={svc.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">{svc.category}</p>
                      </div>
                      <span
                        className="ml-3 shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          background: "rgba(244,22,102,0.10)",
                          color: "#F41666",
                        }}
                      >
                        <TrendingDown className="h-3 w-3" />
                        {diff} appts
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Underperforming Services ── */}
      {underperforming.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-500">
              <AlertCircle className="h-4 w-4" />
              Underperforming Services
              <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
                {underperforming.length} service{underperforming.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Active services with <strong className="text-foreground">0 bookings</strong> in
              the last 30 days.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Service</th>
                    <th className="pb-2 text-left font-medium hidden sm:table-cell">Category</th>
                    <th className="pb-2 text-right font-medium">Price</th>
                    <th className="pb-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {underperforming.map((svc, i) => (
                    <tr
                      key={svc.id}
                      className={[
                        "border-b border-border/30 hover:bg-muted/30 transition-colors",
                        i % 2 === 1 ? "bg-muted/10" : "",
                      ].join(" ")}
                    >
                      <td className="py-2.5 pr-4 font-medium">{svc.name}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground hidden sm:table-cell">
                        {svc.category}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{fmt(svc.price)}</td>
                      <td className="py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                          <Scissors className="h-3 w-3" />
                          No bookings
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
