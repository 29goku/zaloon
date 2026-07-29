import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, CalendarDays, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

// ── types ─────────────────────────────────────────────────────────────────────

type Period = "week" | "month" | "quarter" | "year";

// ── date helpers ──────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(d.getDate() + n);
  return copy;
}

function getPeriodRange(period: Period): { from: Date; to: Date; days: number } {
  const now = new Date();
  // Strip time — work at midnight local
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "week": {
      const from = addDays(today, -6);
      return { from, to: today, days: 7 };
    }
    case "quarter": {
      const from = addDays(today, -89);
      return { from, to: today, days: 90 };
    }
    case "year": {
      const from = new Date(today.getFullYear(), 0, 1);
      const days = Math.round((today.getTime() - from.getTime()) / 86400000) + 1;
      return { from, to: today, days };
    }
    case "month":
    default: {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const days = today.getDate();
      return { from, to: today, days };
    }
  }
}

function getPreviousPeriodRange(from: Date, days: number): { prevFrom: Date; prevTo: Date } {
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return { prevFrom, prevTo };
}

function dateRangeArray(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    dates.push(toDateString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── currency formatter factory ────────────────────────────────────────────────

function makeFmt(currency: string) {
  return (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

// Format date label abbreviation
function fmtDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${MONTHS[m - 1]} ${d}`;
}

function fmtMonthLabel(dateStr: string): string {
  const [, m] = dateStr.split("-").map(Number);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return MONTHS[m - 1];
}

// ── SVG Bar Chart (Revenue by Day) ────────────────────────────────────────────

function RevenueBarChart({
  data,
  fmt,
  todayStr,
}: {
  data: { date: string; revenue: number }[];
  fmt: (n: number) => string;
  todayStr: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No revenue data for this period
      </div>
    );
  }

  const W = 800;
  const H = 220;
  const PADDING = { top: 20, right: 20, bottom: 50, left: 60 };
  const chartW = W - PADDING.left - PADDING.right;
  const chartH = H - PADDING.top - PADDING.bottom;

  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  // Round max up to a nice number
  const niceMax = Math.ceil(maxRev / 100) * 100 || 100;

  const barCount = data.length;
  const barGap = Math.max(1, Math.floor(chartW / barCount / 10));
  const barWidth = (chartW - barGap * (barCount - 1)) / barCount;

  // Y gridlines: 4 lines at 0%, 25%, 50%, 75%, 100%
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: PADDING.top + chartH - pct * chartH,
    label: fmt(pct * niceMax),
  }));

  // Decide which date labels to show to avoid crowding
  // For large datasets, show every Nth
  const maxLabels = Math.min(barCount, 12);
  const labelInterval = Math.max(1, Math.ceil(barCount / maxLabels));
  const useLongLabel = barCount <= 31;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      aria-label="Revenue by day bar chart"
      role="img"
    >
      {/* Gridlines */}
      {gridLines.map(({ y, label }) => (
        <g key={y}>
          <line
            x1={PADDING.left}
            y1={y}
            x2={PADDING.left + chartW}
            y2={y}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
          <text
            x={PADDING.left - 8}
            y={y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="10"
            fill="currentColor"
            fillOpacity="0.5"
          >
            {label}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map(({ date, revenue }, i) => {
        const barH = Math.max((revenue / niceMax) * chartH, revenue > 0 ? 2 : 0);
        const x = PADDING.left + i * (barWidth + barGap);
        const y = PADDING.top + chartH - barH;
        const isToday = date === todayStr;
        const showLabel = i % labelInterval === 0 || i === barCount - 1;
        const label = useLongLabel ? fmtDateLabel(date) : fmtMonthLabel(date);

        return (
          <g key={date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx="2"
              ry="2"
              fill={isToday ? "#f59e0b" : "hsl(var(--primary) / 0.75)"}
              className="transition-opacity"
            >
              <title>{`${fmtDateLabel(date)}: ${fmt(revenue)}`}</title>
            </rect>

            {showLabel && (
              <text
                x={x + barWidth / 2}
                y={PADDING.top + chartH + 14}
                textAnchor="middle"
                fontSize="9"
                fill="currentColor"
                fillOpacity="0.5"
                transform={barCount > 20 ? `rotate(-40, ${x + barWidth / 2}, ${PADDING.top + chartH + 14})` : undefined}
              >
                {label}
              </text>
            )}
          </g>
        );
      })}

      {/* X axis base line */}
      <line
        x1={PADDING.left}
        y1={PADDING.top + chartH}
        x2={PADDING.left + chartW}
        y2={PADDING.top + chartH}
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="1"
      />
    </svg>
  );
}

// ── SVG Donut (Payment Methods) ───────────────────────────────────────────────

function PaymentDonut({
  slices,
  fmt,
}: {
  slices: { label: string; amount: number; color: string }[];
  fmt: (n: number) => string;
}) {
  const total = slices.reduce((s, x) => s + x.amount, 0);
  if (total === 0 || slices.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No payment data
      </div>
    );
  }

  const R = 60; // outer radius
  const r = 38; // inner radius (donut hole)
  const cx = 80;
  const cy = 80;
  const gap = 0.02; // radians gap between slices

  // Build arc paths
  type Slice = { d: string; color: string; label: string; amount: number; pct: number };
  const arcs: Slice[] = [];
  let startAngle = -Math.PI / 2; // start at top

  for (const slice of slices) {
    const pct = slice.amount / total;
    const angle = pct * 2 * Math.PI - gap;
    const endAngle = startAngle + angle;

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const ix1 = cx + r * Math.cos(endAngle);
    const iy1 = cy + r * Math.sin(endAngle);
    const ix2 = cx + r * Math.cos(startAngle);
    const iy2 = cy + r * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${r} ${r} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");

    arcs.push({ d, color: slice.color, label: slice.label, amount: slice.amount, pct: pct * 100 });
    startAngle += pct * 2 * Math.PI;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Donut */}
      <div className="flex-shrink-0">
        <svg viewBox="0 0 160 160" width="160" height="160" aria-label="Payment methods donut chart">
          {arcs.map((arc) => (
            <path key={arc.label} d={arc.d} fill={arc.color}>
              <title>{`${arc.label}: ${fmt(arc.amount)} (${arc.pct.toFixed(1)}%)`}</title>
            </path>
          ))}
          {/* Center text */}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.5">
            Total
          </text>
          <text x={cx} y={cy + 9} textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">
            {fmt(total)}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 min-w-0">
        {arcs.map((arc) => (
          <div key={arc.label} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: arc.color }}
            />
            <span className="text-foreground font-medium truncate">{arc.label}</span>
            <span className="text-muted-foreground ml-auto pl-3 tabular-nums whitespace-nowrap">
              {fmt(arc.amount)}
              <span className="text-muted-foreground/70 ml-1">({arc.pct.toFixed(1)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  changePct,
  icon: Icon,
  iconBg,
  iconColor,
  invertTrend = false,
}: {
  label: string;
  value: string;
  sub?: string;
  changePct?: number | null;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  invertTrend?: boolean;
}) {
  const hasChange = changePct !== null && changePct !== undefined;
  const isPositive = hasChange ? (invertTrend ? changePct! < 0 : changePct! >= 0) : false;
  const sign = hasChange && changePct! > 0 ? "+" : "";

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        {hasChange && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPositive
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-[#F41666]/15 text-[#F41666]"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {sign}{changePct!.toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

// ── Period pill nav ───────────────────────────────────────────────────────────

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RevenueReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const rawPeriod = sp.period;
  const period: Period =
    rawPeriod === "week" || rawPeriod === "quarter" || rawPeriod === "year"
      ? rawPeriod
      : "month";

  // ── Date ranges ─────────────────────────────────────────────────────────────

  const { from, to, days } = getPeriodRange(period);
  const { prevFrom, prevTo } = getPreviousPeriodRange(from, days);
  const todayStr = toDateString(new Date());
  const fromStr = toDateString(from);
  const toStr = toDateString(to);
  const prevFromStr = toDateString(prevFrom);
  const prevToStr = toDateString(prevTo);

  // ── Salon ────────────────────────────────────────────────────────────────────

  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";
  const salonId = salon?.id ?? "";

  const fmt = makeFmt(currency);

  // ── Fetch current + previous paid invoices ──────────────────────────────────

  const [currentInvoices, prevInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        salonId,
        status: "PAID",
        createdAt: {
          gte: new Date(fromStr + "T00:00:00.000Z"),
          lte: new Date(toStr + "T23:59:59.999Z"),
        },
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        paymentMethod: true,
        status: true,
        Appointment: {
          select: {
            AppointmentService: {
              select: {
                Service: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
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
        salonId,
        status: "PAID",
        createdAt: {
          gte: new Date(prevFromStr + "T00:00:00.000Z"),
          lte: new Date(prevToStr + "T23:59:59.999Z"),
        },
      },
      select: { total: true, createdAt: true },
    }),
  ]);

  // ── Revenue KPIs ─────────────────────────────────────────────────────────────

  const totalRevenue = currentInvoices.reduce((s, inv) => s + inv.total, 0);
  const prevTotalRevenue = prevInvoices.reduce((s, inv) => s + inv.total, 0);

  const avgDailyRevenue = days > 0 ? totalRevenue / days : 0;

  // Best day by revenue
  const revenueByDay: Record<string, number> = {};
  for (const inv of currentInvoices) {
    const day = toDateString(new Date(inv.createdAt));
    revenueByDay[day] = (revenueByDay[day] ?? 0) + inv.total;
  }
  const bestDayEntry = Object.entries(revenueByDay).reduce<[string, number] | null>(
    (best, [d, rev]) => (best === null || rev > best[1] ? [d, rev] : best),
    null
  );
  const bestDayLabel = bestDayEntry
    ? `${fmtDateLabel(bestDayEntry[0])} · ${fmt(bestDayEntry[1])}`
    : "N/A";

  const revChangePct =
    prevTotalRevenue > 0
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
      : null;

  // ── Revenue chart data ────────────────────────────────────────────────────────

  const allDates = dateRangeArray(from, to);
  const revenueChartData = allDates.map((date) => ({
    date,
    revenue: revenueByDay[date] ?? 0,
  }));

  // ── Revenue by service category ───────────────────────────────────────────────

  // Map: categoryId -> { name, revenue, count }
  const categoryRevMap: Record<string, { name: string; revenue: number; count: number }> = {};

  for (const inv of currentInvoices) {
    if (!inv.Appointment) continue;
    const services = inv.Appointment.AppointmentService;
    if (services.length === 0) continue;
    const perService = inv.total / services.length;

    for (const asSvc of services) {
      const cat = asSvc.Service.ServiceCategory;
      const catId = cat?.id ?? "uncategorized";
      const catName = cat?.name ?? "Uncategorized";

      if (!categoryRevMap[catId]) {
        categoryRevMap[catId] = { name: catName, revenue: 0, count: 0 };
      }
      categoryRevMap[catId].revenue += perService;
      categoryRevMap[catId].count += 1;
    }
  }

  const totalCatRevenue = Object.values(categoryRevMap).reduce((s, c) => s + c.revenue, 0);
  const categoryBreakdown = Object.entries(categoryRevMap)
    .map(([id, c]) => ({
      id,
      name: c.name,
      revenue: c.revenue,
      count: c.count,
      pct: totalCatRevenue > 0 ? (c.revenue / totalCatRevenue) * 100 : 0,
      avgTicket: c.count > 0 ? c.revenue / c.count : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Payment methods ───────────────────────────────────────────────────────────

  const paymentMap: Record<string, number> = {};
  for (const inv of currentInvoices) {
    const method = inv.paymentMethod ?? "OTHER";
    paymentMap[method] = (paymentMap[method] ?? 0) + inv.total;
  }

  const METHOD_COLORS: Record<string, string> = {
    CASH: "#10b981",
    CARD: "#F48E16",
    CREDIT: "#3b82f6",
    DEBIT: "#8b5cf6",
    TRANSFER: "#06b6d4",
    UPI: "#ec4899",
    WALLET: "#f59e0b",
    OTHER: "#6b7280",
  };

  const paymentSlices = Object.entries(paymentMap)
    .sort(([, a], [, b]) => b - a)
    .map(([label, amount]) => ({
      label,
      amount,
      color: METHOD_COLORS[label] ?? "#6b7280",
    }));

  // ── Top 10 services by revenue ────────────────────────────────────────────────

  const serviceRevMap: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const inv of currentInvoices) {
    if (!inv.Appointment) continue;
    const services = inv.Appointment.AppointmentService;
    if (services.length === 0) continue;
    const perService = inv.total / services.length;

    for (const asSvc of services) {
      const svc = asSvc.Service;
      if (!serviceRevMap[svc.id]) {
        serviceRevMap[svc.id] = { name: svc.name, revenue: 0, count: 0 };
      }
      serviceRevMap[svc.id].revenue += perService;
      serviceRevMap[svc.id].count += 1;
    }
  }

  const topServices = Object.values(serviceRevMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const maxServiceRevenue = topServices[0]?.revenue ?? 1;

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/reports"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Reports
            </Link>
            <span className="text-muted-foreground/50 text-sm">/</span>
            <span className="text-foreground text-sm font-medium">Revenue</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-500" />
            Revenue Report
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Period:{" "}
            <span className="text-foreground font-medium">
              {fmtDateLabel(fromStr)} — {fmtDateLabel(toStr)}
            </span>
            {" "}·{" "}
            <span className="text-muted-foreground/70">
              prev: {fmtDateLabel(prevFromStr)} — {fmtDateLabel(prevToStr)}
            </span>
          </p>
        </div>
      </div>

      {/* Period filter pills */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {PERIODS.map(({ id, label }) => (
          <Link
            key={id}
            href={`?period=${id}`}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={fmt(totalRevenue)}
          sub={`${currentInvoices.length} paid invoice${currentInvoices.length !== 1 ? "s" : ""}`}
          icon={DollarSign}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-500"
        />
        <KpiCard
          label="Avg Daily Revenue"
          value={fmt(avgDailyRevenue)}
          sub={`over ${days} day${days !== 1 ? "s" : ""}`}
          icon={BarChart3}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <KpiCard
          label="Best Day"
          value={bestDayEntry ? fmtDateLabel(bestDayEntry[0]) : "N/A"}
          sub={bestDayEntry ? fmt(bestDayEntry[1]) : undefined}
          icon={CalendarDays}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-500"
        />
        <KpiCard
          label="vs Last Period"
          value={
            revChangePct !== null
              ? `${revChangePct >= 0 ? "+" : ""}${revChangePct.toFixed(1)}%`
              : "N/A"
          }
          sub={prevTotalRevenue > 0 ? `prev: ${fmt(prevTotalRevenue)}` : "no prior data"}
          changePct={revChangePct}
          icon={revChangePct !== null && revChangePct >= 0 ? TrendingUp : TrendingDown}
          iconBg={
            revChangePct === null
              ? "bg-muted/30"
              : revChangePct >= 0
              ? "bg-emerald-500/15"
              : "bg-[#F41666]/15"
          }
          iconColor={
            revChangePct === null
              ? "text-muted-foreground"
              : revChangePct >= 0
              ? "text-emerald-500"
              : "text-[#F41666]"
          }
        />
      </div>

      {/* ── Revenue by day bar chart ───────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Revenue by Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueBarChart data={revenueChartData} fmt={fmt} todayStr={todayStr} />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Highlighted bar = today · Paid invoices only
          </p>
        </CardContent>
      </Card>

      {/* ── Two-column: category table + payment donut ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by service category */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Revenue by Service Category</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {categoryBreakdown.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                No category data for this period
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Category
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Revenue
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      % Share
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      Appts
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                      Avg Ticket
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((cat, idx) => (
                    <tr
                      key={cat.id}
                      className={`border-b border-border/50 ${
                        idx === 0 ? "bg-primary/5" : ""
                      } hover:bg-secondary/40 transition-colors`}
                    >
                      <td className="px-4 py-3 text-foreground font-medium">{cat.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground font-semibold">
                        {fmt(cat.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                        {cat.pct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                        {cat.count}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                        {fmt(cat.avgTicket)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Payment methods donut */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentDonut slices={paymentSlices} fmt={fmt} />
          </CardContent>
        </Card>
      </div>

      {/* ── Top 10 services by revenue ─────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Top 10 Services by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topServices.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              No service revenue data for this period
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-8">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Service
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Revenue
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                    Bookings
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    Avg Price
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell w-40">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {topServices.map((svc, i) => {
                  const barPct =
                    maxServiceRevenue > 0 ? (svc.revenue / maxServiceRevenue) * 100 : 0;
                  const avgPrice = svc.count > 0 ? svc.revenue / svc.count : 0;
                  const isTop3 = i < 3;

                  return (
                    <tr
                      key={svc.name}
                      className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {isTop3 ? (
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                              i === 0
                                ? "bg-amber-500 text-white"
                                : i === 1
                                ? "bg-zinc-400 text-white"
                                : "bg-amber-700 text-white"
                            }`}
                          >
                            {i + 1}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{i + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">{svc.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground font-semibold">
                        {fmt(svc.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                        {svc.count}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                        {fmt(avgPrice)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground text-xs tabular-nums w-10 text-right">
                            {barPct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        Revenue figures are based on paid invoices only. Service revenue is split equally across
        services in the same appointment.
      </p>
    </div>
  );
}
