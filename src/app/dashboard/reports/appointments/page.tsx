import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ── types ─────────────────────────────────────────────────────────────────────

type Period = "week" | "month" | "quarter" | "year";

// ── date helpers ──────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

function fmtMonthLabel(dateStr: string): string {
  const [, m] = dateStr.split("-").map(Number);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return MONTHS[m - 1];
}

function fmtDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTHS[m - 1]} ${d}`;
}

// ── period constants ──────────────────────────────────────────────────────────

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
];

// ── status helpers ────────────────────────────────────────────────────────────

function isCompleted(s: string) { return s === "COMPLETED"; }
function isCancelled(s: string) { return s === "CANCELLED" || s === "CANCELED"; }
function isNoShow(s: string) { return s === "NO_SHOW"; }
function isScheduled(s: string) { return s === "SCHEDULED"; }

// ── SVG Donut ─────────────────────────────────────────────────────────────────

type DonutSlice = { label: string; count: number; color: string };

function StatusDonut({ slices, total }: { slices: DonutSlice[]; total: number }) {
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No appointment data for this period
      </div>
    );
  }

  const R = 60;
  const r = 38;
  const cx = 80;
  const cy = 80;
  const GAP = 0.025; // radians gap between slices

  type ArcEntry = { d: string; color: string; label: string; count: number; pct: number };
  const arcs: ArcEntry[] = [];
  let startAngle = -Math.PI / 2;

  for (const slice of slices) {
    if (slice.count === 0) continue;
    const pct = slice.count / total;
    const sweepAngle = pct * 2 * Math.PI - GAP;
    const endAngle = startAngle + sweepAngle;

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const ix1 = cx + r * Math.cos(endAngle);
    const iy1 = cy + r * Math.sin(endAngle);
    const ix2 = cx + r * Math.cos(startAngle);
    const iy2 = cy + r * Math.sin(startAngle);

    const largeArc = sweepAngle > Math.PI ? 1 : 0;

    const d = [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${ix1.toFixed(2)} ${iy1.toFixed(2)}`,
      `A ${r} ${r} 0 ${largeArc} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)}`,
      "Z",
    ].join(" ");

    arcs.push({ d, color: slice.color, label: slice.label, count: slice.count, pct: pct * 100 });
    startAngle += pct * 2 * Math.PI;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      {/* Donut SVG */}
      <div className="flex-shrink-0">
        <svg viewBox="0 0 160 160" width="160" height="160" aria-label="Status distribution donut">
          {arcs.map((arc) => (
            <path key={arc.label} d={arc.d} fill={arc.color}>
              <title>{`${arc.label}: ${arc.count} (${arc.pct.toFixed(1)}%)`}</title>
            </path>
          ))}
          {/* Center label */}
          <text x={cx} y={cy - 7} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.5">
            Total
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">
            {total}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3 min-w-0 w-full">
        {arcs.map((arc) => (
          <div key={arc.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: arc.color }}
            />
            <span className="text-foreground font-medium flex-1">{arc.label}</span>
            <span className="tabular-nums text-foreground font-semibold">{arc.count}</span>
            <span className="text-muted-foreground tabular-nums w-14 text-right">
              {arc.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8..21
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// JS getDay(): 0=Sun,1=Mon,...,6=Sat  → we want 0=Mon..6=Sun
function jsDay_to_colIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function HeatmapGrid({
  grid,
  maxCount,
}: {
  grid: number[][]; // grid[hourIndex][dayIndex]
  maxCount: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        {/* Header row */}
        <div className="grid gap-1" style={{ gridTemplateColumns: "3.5rem repeat(7, 1fr)" }}>
          <div /> {/* empty corner */}
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Data rows */}
        <div className="flex flex-col gap-1 mt-1">
          {HOURS.map((hour, hi) => {
            const hourLabel = hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`;
            return (
              <div
                key={hour}
                className="grid gap-1 items-center"
                style={{ gridTemplateColumns: "3.5rem repeat(7, 1fr)" }}
              >
                <div className="text-xs text-muted-foreground text-right pr-2">{hourLabel}</div>
                {DAY_LABELS.map((_, di) => {
                  const count = grid[hi]?.[di] ?? 0;
                  const intensity = maxCount > 0 ? count / maxCount : 0;
                  const alpha = intensity === 0 ? 0 : Math.max(0.12, intensity);
                  return (
                    <div
                      key={di}
                      className="h-8 rounded flex items-center justify-center text-[10px] font-medium transition-colors"
                      style={{
                        backgroundColor: `hsl(var(--primary) / ${alpha})`,
                        color: intensity > 0.6 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                      }}
                      title={`${hourLabel} ${DAY_LABELS[di]}: ${count} appt${count !== 1 ? "s" : ""}`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Day-of-Week Horizontal Bar Chart (SVG) ────────────────────────────────────

function DayOfWeekBarChart({ dayCounts }: { dayCounts: number[] }) {
  // dayCounts[0]=Mon ... [6]=Sun
  const W = 500;
  const H = 220;
  const PAD = { top: 12, bottom: 12, left: 44, right: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const barH = Math.floor(chartH / 7) - 4;
  const gap = Math.floor(chartH / 7);
  const maxCount = Math.max(...dayCounts, 1);
  const busyIdx = dayCounts.indexOf(Math.max(...dayCounts));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Appointments by day of week" role="img">
      {/* Dashed gridlines at 25%, 50%, 75% */}
      {[0.25, 0.5, 0.75, 1].map((pct) => {
        const x = PAD.left + pct * chartW;
        return (
          <g key={pct}>
            <line
              x1={x} y1={PAD.top}
              x2={x} y2={PAD.top + chartH}
              stroke="currentColor" strokeOpacity="0.08" strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text
              x={x} y={PAD.top + chartH + 10}
              textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.4"
            >
              {Math.round(pct * maxCount)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {dayCounts.map((count, i) => {
        const barW = maxCount > 0 ? (count / maxCount) * chartW : 0;
        const y = PAD.top + i * gap + (gap - barH) / 2;
        const isBusiest = i === busyIdx && count > 0;

        return (
          <g key={i}>
            {/* Background track */}
            <rect
              x={PAD.left} y={y}
              width={chartW} height={barH}
              rx="3" fill="currentColor" fillOpacity="0.04"
            />
            {/* Filled bar */}
            {count > 0 && (
              <rect
                x={PAD.left} y={y}
                width={barW} height={barH}
                rx="3"
                fill={isBusiest ? "#f59e0b" : "hsl(var(--primary) / 0.75)"}
              >
                <title>{`${DAY_LABELS[i]}: ${count} appointments`}</title>
              </rect>
            )}
            {/* Day label */}
            <text
              x={PAD.left - 6} y={y + barH / 2}
              textAnchor="end" dominantBaseline="middle"
              fontSize="11" fill="currentColor" fillOpacity="0.7"
              fontWeight={isBusiest ? "600" : "400"}
            >
              {DAY_LABELS[i]}
            </text>
            {/* Count label */}
            <text
              x={PAD.left + barW + 6} y={y + barH / 2}
              textAnchor="start" dominantBaseline="middle"
              fontSize="11" fill="currentColor"
              fillOpacity={count > 0 ? "0.85" : "0.3"}
              fontWeight={isBusiest ? "600" : "400"}
            >
              {count}
            </text>
            {isBusiest && (
              <text
                x={PAD.left + barW + 28} y={y + barH / 2}
                textAnchor="start" dominantBaseline="middle"
                fontSize="9" fill="#f59e0b"
              >
                ★
              </text>
            )}
          </g>
        );
      })}

      {/* X axis base */}
      <line
        x1={PAD.left} y1={PAD.top + chartH}
        x2={PAD.left + chartW} y2={PAD.top + chartH}
        stroke="currentColor" strokeOpacity="0.12" strokeWidth="1"
      />
    </svg>
  );
}

// ── Cancellation Rate Trend Line Chart (SVG) ──────────────────────────────────

type MonthTrend = { label: string; cancRate: number; total: number };

function CancellationTrendChart({ months }: { months: MonthTrend[] }) {
  if (months.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No trend data available
      </div>
    );
  }

  const W = 600;
  const H = 180;
  const PAD = { top: 20, bottom: 36, left: 44, right: 20 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxRate = Math.max(...months.map((m) => m.cancRate), 30);
  const niceMax = Math.ceil(maxRate / 10) * 10 || 30;

  const n = months.length;
  const xStep = n > 1 ? chartW / (n - 1) : chartW / 2;

  const pts = months.map((m, i) => ({
    x: PAD.left + i * xStep,
    y: PAD.top + chartH - (m.cancRate / niceMax) * chartH,
    ...m,
  }));

  const pointsStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Gridlines at 10%, 20%, 30% (up to niceMax)
  const gridRates = Array.from({ length: Math.floor(niceMax / 10) + 1 }, (_, i) => i * 10).filter(
    (v) => v <= niceMax
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      aria-label="Cancellation rate trend"
      role="img"
    >
      {/* Dashed gridlines */}
      {gridRates.map((rate) => {
        const y = PAD.top + chartH - (rate / niceMax) * chartH;
        return (
          <g key={rate}>
            <line
              x1={PAD.left} y1={y}
              x2={PAD.left + chartW} y2={y}
              stroke="currentColor" strokeOpacity="0.08" strokeWidth="1"
              strokeDasharray="5 4"
            />
            <text
              x={PAD.left - 6} y={y}
              textAnchor="end" dominantBaseline="middle"
              fontSize="9" fill="currentColor" fillOpacity="0.45"
            >
              {rate}%
            </text>
          </g>
        );
      })}

      {/* Area fill under line */}
      {pts.length > 1 && (
        <polygon
          points={[
            ...pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
            `${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)}`,
            `${pts[0].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)}`,
          ].join(" ")}
          fill="#F41666"
          fillOpacity="0.08"
        />
      )}

      {/* Line */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke="#F41666"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points + labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#F41666" />
          <circle cx={p.x} cy={p.y} r="2.5" fill="hsl(var(--card))" />
          {/* Month label */}
          <text
            x={p.x} y={PAD.top + chartH + 14}
            textAnchor="middle" fontSize="10"
            fill="currentColor" fillOpacity="0.55"
          >
            {p.label}
          </text>
          {/* Rate label above point */}
          <text
            x={p.x} y={p.y - 9}
            textAnchor="middle" fontSize="10"
            fill="#F41666" fontWeight="600"
          >
            {p.cancRate.toFixed(1)}%
          </text>
        </g>
      ))}

      {/* X axis base */}
      <line
        x1={PAD.left} y1={PAD.top + chartH}
        x2={PAD.left + chartW} y2={PAD.top + chartH}
        stroke="currentColor" strokeOpacity="0.12" strokeWidth="1"
      />
    </svg>
  );
}

// ── No-Show Rate by Staff table ───────────────────────────────────────────────

type StaffRow = {
  staffId: string;
  name: string;
  total: number;
  noShows: number;
  rate: number;
};

function NoShowTable({ rows }: { rows: StaffRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground text-center">
        No staff data for this period
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Staff
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Appts
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
              No-Shows
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
              No-Show Rate
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell w-36">
              Indicator
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isHigh = row.rate >= 20;
            const isMed = row.rate >= 10 && row.rate < 20;
            const rateColor = isHigh
              ? "text-[#F41666]"
              : isMed
              ? "text-[#F48E16]"
              : "text-emerald-500";
            const barColor = isHigh ? "#F41666" : isMed ? "#F48E16" : "#10b981";

            return (
              <tr
                key={row.staffId}
                className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
              >
                <td className="px-4 py-3 text-foreground font-medium">{row.name}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {row.total}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {row.noShows}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums font-semibold ${rateColor}`}>
                  {row.rate.toFixed(1)}%
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(row.rate, 100)}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AppointmentReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawPeriod = typeof sp.period === "string" ? sp.period : undefined;
  const period: Period =
    rawPeriod === "week" || rawPeriod === "quarter" || rawPeriod === "year"
      ? rawPeriod
      : "month";

  // ── Date ranges ────────────────────────────────────────────────────────────

  const { from, to } = getPeriodRange(period);
  const fromStr = toDateString(from);
  const toStr = toDateString(to);

  // Six months ago for the trend chart
  const today = new Date();
  const todayStr = toDateString(today);
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const sixMonthsAgoStart = toDateString(sixMonthsAgo);

  // ── Salon ──────────────────────────────────────────────────────────────────

  const salon = await prisma.salon.findFirst();
  const salonId = salon?.id ?? "";

  // ── Data fetching ──────────────────────────────────────────────────────────

  const [appointments, sixMonthsAppts] = await Promise.all([
    prisma.appointment.findMany({
      where: { salonId, date: { gte: fromStr, lte: toStr } },
      select: {
        id: true,
        status: true,
        date: true,
        startTime: true,
        staffId: true,
        Staff: { select: { id: true, name: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { salonId, date: { gte: sixMonthsAgoStart, lte: todayStr } },
      select: { status: true, date: true },
    }),
  ]);

  // ── Status distribution ────────────────────────────────────────────────────

  const total = appointments.length;
  let completed = 0;
  let cancelled = 0;
  let noShow = 0;
  let scheduled = 0;

  for (const a of appointments) {
    if (isCompleted(a.status)) completed++;
    else if (isCancelled(a.status)) cancelled++;
    else if (isNoShow(a.status)) noShow++;
    else if (isScheduled(a.status)) scheduled++;
  }

  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;
  const noShowRate = total > 0 ? (noShow / total) * 100 : 0;

  const donutSlices = [
    { label: "Completed", count: completed, color: "#10b981" },       // emerald-500
    { label: "Cancelled", count: cancelled, color: "#F41666" },
    { label: "No-Show", count: noShow, color: "#F48E16" },
    { label: "Scheduled", count: scheduled, color: "hsl(var(--primary))" },
  ];

  // ── Hourly × Day-of-week heatmap ───────────────────────────────────────────
  // grid[hourIndex 0..13][dayIndex 0..6 Mon-Sun]

  const heatGrid: number[][] = Array.from({ length: 14 }, () => Array(7).fill(0));
  let heatMax = 0;

  for (const a of appointments) {
    const hour = parseInt(a.startTime.split(":")[0], 10);
    if (hour < 8 || hour > 21) continue;
    const hi = hour - 8;

    const [yStr, mStr, dStr] = a.date.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    const jsDay = new Date(y, m - 1, d).getDay(); // 0=Sun
    const di = jsDay_to_colIndex(jsDay);

    heatGrid[hi][di]++;
    if (heatGrid[hi][di] > heatMax) heatMax = heatGrid[hi][di];
  }

  // ── Day-of-week distribution ───────────────────────────────────────────────
  // dayCounts[0]=Mon ... [6]=Sun

  const dayCounts: number[] = Array(7).fill(0);
  for (const a of appointments) {
    const [yStr, mStr, dStr] = a.date.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    const jsDay = new Date(y, m - 1, d).getDay();
    const di = jsDay_to_colIndex(jsDay);
    dayCounts[di]++;
  }

  // ── Cancellation rate trend (last 6 months) ────────────────────────────────

  // Build a map: "YYYY-MM" -> { total, cancelled }
  const monthTrendMap: Record<string, { total: number; cancelled: number }> = {};
  for (const a of sixMonthsAppts) {
    const ym = a.date.slice(0, 7); // "YYYY-MM"
    if (!monthTrendMap[ym]) monthTrendMap[ym] = { total: 0, cancelled: 0 };
    monthTrendMap[ym].total++;
    if (isCancelled(a.status)) monthTrendMap[ym].cancelled++;
  }

  // Build ordered array of last 6 months
  const trendMonths: MonthTrend[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const ym = toDateString(d).slice(0, 7);
    const data = monthTrendMap[ym] ?? { total: 0, cancelled: 0 };
    trendMonths.push({
      label: fmtMonthLabel(ym + "-01"),
      cancRate: data.total > 0 ? (data.cancelled / data.total) * 100 : 0,
      total: data.total,
    });
  }

  // ── No-show rate by staff ──────────────────────────────────────────────────

  const staffMap: Record<string, { name: string; total: number; noShows: number }> = {};
  for (const a of appointments) {
    const sid = a.staffId;
    if (!staffMap[sid]) {
      staffMap[sid] = { name: a.Staff?.name ?? "Unknown", total: 0, noShows: 0 };
    }
    staffMap[sid].total++;
    if (isNoShow(a.status)) staffMap[sid].noShows++;
  }

  const staffRows: StaffRow[] = Object.entries(staffMap)
    .map(([staffId, v]) => ({
      staffId,
      name: v.name,
      total: v.total,
      noShows: v.noShows,
      rate: v.total > 0 ? (v.noShows / v.total) * 100 : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  // ── Legend color badge ─────────────────────────────────────────────────────

  const busyDay = dayCounts.indexOf(Math.max(...dayCounts));
  const busyDayLabel = DAY_LABELS[busyDay];
  const busyHourIdx = heatGrid.reduce(
    (best, row, hi) => {
      const rowSum = row.reduce((s, v) => s + v, 0);
      return rowSum > best.sum ? { hi, sum: rowSum } : best;
    },
    { hi: 0, sum: -1 }
  ).hi;
  const busyHour = HOURS[busyHourIdx];
  const busyHourLabel =
    busyHour < 12 ? `${busyHour}am` : busyHour === 12 ? "12pm" : `${busyHour - 12}pm`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* ── Header + Breadcrumb ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-1">
            <Link
              href="/dashboard/reports"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Reports
            </Link>
            <span className="text-muted-foreground/50 text-sm">/</span>
            <span className="text-foreground text-sm font-medium">Appointments</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-[#F48E16]" />
            Appointment Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Period:{" "}
            <span className="text-foreground font-medium">
              {fmtDateLabel(fromStr)} — {fmtDateLabel(toStr)}
            </span>
          </p>
        </div>
      </div>

      {/* ── Period filter pills ───────────────────────────────────────────────── */}
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

      {/* ── KPI Cards ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Appointments"
          value={total.toLocaleString()}
          sub={`${fromStr} to ${toStr}`}
          icon={Calendar}
          iconBg="bg-[#F48E16]/15"
          iconColor="text-[#F48E16]"
        />
        <KpiCard
          label="Completion Rate"
          value={`${completionRate.toFixed(1)}%`}
          sub={`${completed} completed`}
          icon={CheckCircle}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-500"
        />
        <KpiCard
          label="Cancellation Rate"
          value={`${cancellationRate.toFixed(1)}%`}
          sub={`${cancelled} cancelled`}
          icon={XCircle}
          iconBg="bg-[#F41666]/15"
          iconColor="text-[#F41666]"
        />
        <KpiCard
          label="No-Show Rate"
          value={`${noShowRate.toFixed(1)}%`}
          sub={`${noShow} no-shows`}
          icon={AlertTriangle}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-500"
        />
      </div>

      {/* ── Row 1: Status donut + Day-of-week bar chart ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Donut */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonut slices={donutSlices} total={total} />
            <p className="text-xs text-muted-foreground mt-4 text-center">
              {total > 0
                ? `${total} total appointments for this period`
                : "No appointment data for this period"}
            </p>
          </CardContent>
        </Card>

        {/* Day of Week Bar Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Appointments by Day of Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                No data for this period
              </div>
            ) : (
              <>
                <DayOfWeekBarChart dayCounts={dayCounts} />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Amber bar = busiest day ({busyDayLabel})
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Heatmap ────────────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Appointment Heatmap (Hour × Day of Week)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              No appointment data for this period
            </div>
          ) : (
            <>
              <HeatmapGrid grid={heatGrid} maxCount={heatMax} />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: "hsl(var(--primary) / 0.12)" }}
                    />
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: "hsl(var(--primary) / 0.55)" }}
                    />
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: "hsl(var(--primary) / 1)" }}
                    />
                    <span>High</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Busiest hour: <span className="text-foreground font-medium">{busyHourLabel}</span>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Row 2: Cancellation Trend + No-Show Rate by Staff ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cancellation Rate Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-[#F41666]" />
              Cancellation Rate — Last 6 Months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CancellationTrendChart months={trendMonths} />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Monthly cancellation rate (%) across all statuses
            </p>
          </CardContent>
        </Card>

        {/* No-Show Rate by Staff */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              No-Show Rate by Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <NoShowTable rows={staffRows} />
            <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
              <span className="text-[#F41666] font-medium">Red</span> ≥20% ·{" "}
              <span className="text-[#F48E16] font-medium">Amber</span> 10–19% ·{" "}
              <span className="text-emerald-500 font-medium">Green</span> &lt;10%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        Appointment data reflects the selected period only. Cancellation trend uses rolling 6-month
        window regardless of period filter.
      </p>
    </div>
  );
}
