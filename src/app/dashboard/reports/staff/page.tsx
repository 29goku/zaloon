import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  BarChart3,
  Award,
  CheckCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = "week" | "month" | "quarter" | "year";
type SortKey = "revenue" | "appointments" | "rating";

// ── Date helpers ──────────────────────────────────────────────────────────────

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

// ── Currency formatter ────────────────────────────────────────────────────────

function makeFmt(currency: string) {
  return (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
}

// ── Label helpers ─────────────────────────────────────────────────────────────

function fmtDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${MONTHS[m - 1]} ${d}`;
}

// ── SVG Horizontal Bar Chart ──────────────────────────────────────────────────

const BAR_COLORS = [
  "hsl(var(--primary))",
  "#F48E16",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#F41666",
];

function StaffRevenueChart({
  data,
  fmt,
}: {
  data: { name: string; revenue: number }[];
  fmt: (n: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No revenue data for this period
      </div>
    );
  }

  const ROW_H = 36;
  const LABEL_W = 140;
  const VALUE_W = 72;
  const PAD_TOP = 8;
  const PAD_BOTTOM = 8;
  const PAD_RIGHT = 8;
  const W = 600;
  const chartW = W - LABEL_W - VALUE_W - PAD_RIGHT;
  const H = data.length * ROW_H + PAD_TOP + PAD_BOTTOM;

  const maxRev = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      aria-label="Revenue by staff horizontal bar chart"
      role="img"
    >
      {data.map(({ name, revenue }, i) => {
        const barW = Math.max((revenue / maxRev) * chartW, revenue > 0 ? 3 : 0);
        const y = PAD_TOP + i * ROW_H;
        const barY = y + ROW_H / 2 - 10;
        const color = BAR_COLORS[i % BAR_COLORS.length];

        return (
          <g key={name}>
            {/* Staff name label */}
            <text
              x={LABEL_W - 8}
              y={y + ROW_H / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="11"
              fill="currentColor"
              fillOpacity="0.85"
            >
              {name.length > 16 ? name.slice(0, 15) + "…" : name}
            </text>

            {/* Track */}
            <rect
              x={LABEL_W}
              y={barY}
              width={chartW}
              height={20}
              rx="4"
              fill="currentColor"
              fillOpacity="0.06"
            />

            {/* Bar */}
            <rect
              x={LABEL_W}
              y={barY}
              width={barW}
              height={20}
              rx="4"
              fill={color}
              fillOpacity="0.85"
            >
              <title>{`${name}: ${fmt(revenue)}`}</title>
            </rect>

            {/* Value label */}
            <text
              x={LABEL_W + chartW + 6}
              y={y + ROW_H / 2}
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="600"
              fill="currentColor"
              fillOpacity="0.75"
            >
              {fmt(revenue)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG Stars ─────────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= filled ? "text-amber-400" : "text-muted-foreground/30"}
          style={{ fontSize: "13px", lineHeight: 1 }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// ── Utilization color ─────────────────────────────────────────────────────────

function utilizationColor(pct: number): string {
  if (pct >= 80) return "text-emerald-500";
  if (pct >= 60) return "text-[#F48E16]";
  return "text-[#F41666]";
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

// ── Inline utilization progress bar ──────────────────────────────────────────

function UtilBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const fill =
    clamped >= 80 ? "#10b981" : clamped >= 60 ? "#F48E16" : "#F41666";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden min-w-[48px]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, backgroundColor: fill }}
        />
      </div>
      <span className="tabular-nums text-xs text-muted-foreground w-9 text-right">
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}

// ── Period pills ──────────────────────────────────────────────────────────────

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
];

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "revenue", label: "Revenue" },
  { id: "appointments", label: "Appointments" },
  { id: "rating", label: "Rating" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StaffReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // ── Parse params ────────────────────────────────────────────────────────────
  const rawPeriod = typeof sp.period === "string" ? sp.period : undefined;
  const period: Period =
    rawPeriod === "week" || rawPeriod === "quarter" || rawPeriod === "year"
      ? rawPeriod
      : "month";

  const rawSort = typeof sp.sort === "string" ? sp.sort : undefined;
  const sort: SortKey =
    rawSort === "appointments" || rawSort === "rating" ? rawSort : "revenue";

  // ── Date ranges ─────────────────────────────────────────────────────────────
  const { from, to } = getPeriodRange(period);
  const fromStr = toDateString(from);
  const toStr = toDateString(to);

  // ── Salon ────────────────────────────────────────────────────────────────────
  const salon = await prisma.salon.findFirst();
  const salonId = salon?.id ?? "";
  const currency = salon?.currency ?? "USD";
  const fmt = makeFmt(currency);

  // ── Staff list ───────────────────────────────────────────────────────────────
  const allStaff = await prisma.staff.findMany({
    where: { salonId },
    select: { id: true, name: true, commissionPct: true },
  });

  // ── Appointments in period ───────────────────────────────────────────────────
  const appointments = await prisma.appointment.findMany({
    where: {
      salonId,
      date: { gte: fromStr, lte: toStr },
    },
    select: {
      id: true,
      staffId: true,
      status: true,
      clientId: true,
      Staff: { select: { id: true, name: true } },
      Invoice: { select: { total: true, status: true } },
    },
  });

  // ── Reviews in period ────────────────────────────────────────────────────────
  const reviews = await prisma.review.findMany({
    where: {
      salonId,
      staffId: { not: null },
      createdAt: {
        gte: new Date(fromStr + "T00:00:00.000Z"),
        lte: new Date(toStr + "T23:59:59.999Z"),
      },
    },
    select: { staffId: true, rating: true },
  });

  // ── Compute per-staff metrics ─────────────────────────────────────────────────

  interface StaffMetrics {
    id: string;
    name: string;
    commissionPct: number;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    revenue: number;
    avgTicket: number;
    utilization: number;
    uniqueClients: number;
    commissionEarned: number;
    avgRating: number | null;
    reviewCount: number;
  }

  const staffMetrics: StaffMetrics[] = allStaff.map((staff) => {
    const staffAppts = appointments.filter((a) => a.staffId === staff.id);
    const totalAppointments = staffAppts.length;

    const completedAppointments = staffAppts.filter(
      (a) => a.status === "COMPLETED"
    ).length;

    const cancelledAppointments = staffAppts.filter(
      (a) => a.status === "CANCELLED" || a.status === "CANCELED"
    ).length;

    const noShowAppointments = staffAppts.filter(
      (a) => a.status === "NO_SHOW"
    ).length;

    // Revenue: sum Invoice.total for COMPLETED appointments with a paid invoice
    const revenue = staffAppts
      .filter((a) => a.status === "COMPLETED" && a.Invoice != null)
      .reduce((sum, a) => sum + (a.Invoice?.total ?? 0), 0);

    const avgTicket =
      completedAppointments > 0 ? revenue / completedAppointments : 0;

    const utilization =
      totalAppointments > 0
        ? (completedAppointments / totalAppointments) * 100
        : 0;

    const uniqueClients = new Set(
      staffAppts.map((a) => a.clientId).filter(Boolean)
    ).size;

    const commissionEarned = revenue * ((staff.commissionPct ?? 0) / 100);

    const staffReviews = reviews.filter((r) => r.staffId === staff.id);
    const reviewCount = staffReviews.length;
    const avgRating =
      reviewCount > 0
        ? staffReviews.reduce((s, r) => s + r.rating, 0) / reviewCount
        : null;

    return {
      id: staff.id,
      name: staff.name,
      commissionPct: staff.commissionPct ?? 0,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      revenue,
      avgTicket,
      utilization,
      uniqueClients,
      commissionEarned,
      avgRating,
      reviewCount,
    };
  });

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const sortedStaff = [...staffMetrics].sort((a, b) => {
    if (sort === "appointments") return b.totalAppointments - a.totalAppointments;
    if (sort === "rating") {
      const ra = a.avgRating ?? -1;
      const rb = b.avgRating ?? -1;
      return rb - ra;
    }
    return b.revenue - a.revenue;
  });

  // ── KPI aggregates ───────────────────────────────────────────────────────────
  const activeStaff = staffMetrics.filter((s) => s.totalAppointments > 0);
  const totalActiveStaff = activeStaff.length;

  const totalRevenue = staffMetrics.reduce((s, m) => s + m.revenue, 0);

  const avgCompletionRate =
    activeStaff.length > 0
      ? activeStaff.reduce((s, m) => s + m.utilization, 0) / activeStaff.length
      : 0;

  const ratedStaff = staffMetrics.filter((s) => s.avgRating !== null);
  const avgRatingOverall =
    ratedStaff.length > 0
      ? ratedStaff.reduce((s, m) => s + (m.avgRating ?? 0), 0) / ratedStaff.length
      : null;

  // ── Chart data (sorted by revenue desc) ─────────────────────────────────────
  const chartData = [...staffMetrics]
    .sort((a, b) => b.revenue - a.revenue)
    .map((m) => ({ name: m.name, revenue: m.revenue }));

  // ── Ratings table (staff with reviews, sorted by rating desc) ───────────────
  const ratingRows = staffMetrics
    .filter((m) => m.avgRating !== null)
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* ── Header & breadcrumb ─────────────────────────────────────────────── */}
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
            <span className="text-foreground text-sm font-medium">Staff</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Staff Performance Report
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Period:{" "}
            <span className="text-foreground font-medium">
              {fmtDateLabel(fromStr)} — {fmtDateLabel(toStr)}
            </span>
            {" "}·{" "}
            <span className="text-muted-foreground/60 text-xs">
              {allStaff.length} staff member{allStaff.length !== 1 ? "s" : ""}
            </span>
          </p>
        </div>
      </div>

      {/* ── Period pills ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {PERIODS.map(({ id, label }) => (
          <Link
            key={id}
            href={`?period=${id}&sort=${sort}`}
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

      {/* ── KPI cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Staff"
          value={String(totalActiveStaff)}
          sub={`of ${allStaff.length} total`}
          icon={Users}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <KpiCard
          label="Total Revenue Generated"
          value={fmt(totalRevenue)}
          sub="from completed appts"
          icon={TrendingUp}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-500"
        />
        <KpiCard
          label="Avg Completion Rate"
          value={`${avgCompletionRate.toFixed(1)}%`}
          sub="across active staff"
          icon={CheckCircle}
          iconBg="bg-[#F48E16]/15"
          iconColor="text-[#F48E16]"
        />
        <KpiCard
          label="Avg Staff Rating"
          value={
            avgRatingOverall !== null
              ? avgRatingOverall.toFixed(2)
              : "—"
          }
          sub={
            ratedStaff.length > 0
              ? `from ${ratedStaff.length} rated staff`
              : "no reviews yet"
          }
          icon={Star}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-500"
        />
      </div>

      {/* ── Staff Performance Table ──────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Staff Performance
            </CardTitle>
            {/* Sort pills */}
            <div className="flex items-center gap-1 bg-secondary/40 border border-border rounded-lg p-1 w-fit">
              {SORT_OPTIONS.map(({ id, label }) => (
                <Link
                  key={id}
                  href={`?period=${period}&sort=${id}`}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    sort === id
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedStaff.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              No staff data for this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { label: "Staff", align: "left" },
                      { label: "Appts", align: "right" },
                      { label: "Completed", align: "right" },
                      { label: "Utilization", align: "left" },
                      { label: "Revenue", align: "right" },
                      { label: "Avg Ticket", align: "right" },
                      { label: "Rating", align: "right" },
                      { label: "Commission", align: "right" },
                    ].map(({ label, align }) => (
                      <th
                        key={label}
                        className={`px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap ${
                          align === "right" ? "text-right" : "text-left"
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedStaff.map((m, idx) => (
                    <tr
                      key={m.id}
                      className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${
                        idx === 0 && sort === "revenue" ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {idx === 0 && sort === "revenue" && (
                            <Award className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                          )}
                          <span className="font-medium text-foreground">{m.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {m.uniqueClients} client{m.uniqueClients !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {m.totalAppointments}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground font-medium">
                        {m.completedAppointments}
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <UtilBar pct={m.utilization} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground font-semibold">
                        {fmt(m.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {fmt(m.avgTicket)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {m.avgRating !== null ? (
                          <span className="flex items-center justify-end gap-1">
                            <span className="text-amber-400 text-sm">★</span>
                            <span className="tabular-nums text-foreground font-medium text-sm">
                              {m.avgRating.toFixed(1)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {fmt(m.commissionEarned)}
                        <span className="text-xs text-muted-foreground/60 ml-1">
                          ({m.commissionPct.toFixed(0)}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Revenue by Staff — SVG horizontal bar chart ──────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Revenue by Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StaffRevenueChart data={chartData} fmt={fmt} />
        </CardContent>
      </Card>

      {/* ── Staff Ratings ────────────────────────────────────────────────────── */}
      {ratingRows.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              Staff Ratings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Staff", "Stars", "Avg Rating", "Reviews"].map((label, i) => (
                    <th
                      key={label}
                      className={`px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide ${
                        i === 0 ? "text-left" : "text-right"
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ratingRows.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                    <td className="px-4 py-3 text-right">
                      <StarRow rating={m.avgRating ?? 0} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="text-amber-400 text-sm mr-0.5">★</span>
                      <span className="font-semibold text-foreground">
                        {(m.avgRating ?? 0).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">/ 5</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {m.reviewCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Staff Utilization breakdown ──────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#F48E16]" />
            Staff Utilization
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {staffMetrics.filter((m) => m.totalAppointments > 0).length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              No appointment data for this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { label: "Staff", align: "left" },
                      { label: "Total Appts", align: "right" },
                      { label: "Completed", align: "right" },
                      { label: "Cancelled", align: "right" },
                      { label: "No-Show", align: "right" },
                      { label: "Completion %", align: "right" },
                      { label: "Cancellation %", align: "right" },
                      { label: "No-Show %", align: "right" },
                    ].map(({ label, align }) => (
                      <th
                        key={label}
                        className={`px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap ${
                          align === "right" ? "text-right" : "text-left"
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffMetrics
                    .filter((m) => m.totalAppointments > 0)
                    .sort((a, b) => b.utilization - a.utilization)
                    .map((m) => {
                      const completionPct = m.utilization;
                      const cancellationPct =
                        m.totalAppointments > 0
                          ? (m.cancelledAppointments / m.totalAppointments) * 100
                          : 0;
                      const noShowPct =
                        m.totalAppointments > 0
                          ? (m.noShowAppointments / m.totalAppointments) * 100
                          : 0;

                      return (
                        <tr
                          key={m.id}
                          className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {m.totalAppointments}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-emerald-500 font-medium">
                            {m.completedAppointments}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-[#F48E16]">
                            {m.cancelledAppointments}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-[#F41666]">
                            {m.noShowAppointments}
                          </td>
                          <td
                            className={`px-4 py-3 text-right tabular-nums font-semibold ${utilizationColor(
                              completionPct
                            )}`}
                          >
                            {completionPct.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-[#F48E16]">
                            {cancellationPct.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-[#F41666]">
                            {noShowPct.toFixed(1)}%
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
    </div>
  );
}
