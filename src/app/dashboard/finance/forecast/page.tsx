import { prisma } from "@/lib/prisma";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

// ── Forecasting helpers ────────────────────────────────────────────────────────

type MonthRevenue = { month: string; revenue: number };
type ForecastPoint = MonthRevenue & { isProjected: boolean };

function calculateForecast(historicalData: MonthRevenue[]): ForecastPoint[] {
  const result: ForecastPoint[] = historicalData.map((d) => ({
    ...d,
    isProjected: false,
  }));

  const WINDOW = 3;
  const GROWTH_RATE = 0.05; // 5% monthly growth trend

  let base = historicalData.slice(-WINDOW);
  const baseAvg =
    base.length > 0
      ? base.reduce((s, d) => s + d.revenue, 0) / base.length
      : 0;

  const MONTH_ABBREVS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const lastEntry = historicalData[historicalData.length - 1];
  const lastDate = lastEntry ? (() => {
    // month strings are like "Jan 2024" or "Jan"
    const parts = lastEntry.month.split(" ");
    const mIdx = MONTH_ABBREVS.indexOf(parts[0]);
    const yr = parts[1] ? parseInt(parts[1]) : new Date().getFullYear();
    return new Date(yr, mIdx === -1 ? new Date().getMonth() : mIdx, 1);
  })() : new Date();

  for (let i = 1; i <= 6; i++) {
    const projected = baseAvg * Math.pow(1 + GROWTH_RATE, i);
    const d = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
    result.push({
      month: `${MONTH_ABBREVS[d.getMonth()]} ${d.getFullYear()}`,
      revenue: Math.round(projected),
      isProjected: true,
    });
  }

  return result;
}

// ── Month label helpers ────────────────────────────────────────────────────────

const MONTH_ABBREVS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthLabel(d: Date) {
  return `${MONTH_ABBREVS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

function LineChart({
  data,
  currency,
  currentMonthIndex,
}: {
  data: ForecastPoint[];
  currency: string;
  currentMonthIndex: number;
}) {
  const W = 800;
  const H = 280;
  const PAD_LEFT = 72;
  const PAD_RIGHT = 24;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 48;
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  // nice round ceiling
  const step = Math.pow(10, Math.floor(Math.log10(maxRev)));
  const niceCeil = Math.ceil(maxRev / step) * step;
  const GRIDLINES = 5;

  const xOf = (i: number) =>
    PAD_LEFT + (i / (data.length - 1)) * innerW;

  const yOf = (rev: number) =>
    PAD_TOP + innerH - (rev / niceCeil) * innerH;

  // Split historical and projected
  const historical = data.filter((d) => !d.isProjected);
  const projected = data.filter((d) => d.isProjected);

  const histPts = historical
    .map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.revenue).toFixed(1)}`)
    .join(" ");

  const projStartIdx = historical.length - 1;
  const projPts = data
    .slice(projStartIdx)
    .map((d, i) =>
      `${xOf(projStartIdx + i).toFixed(1)},${yOf(d.revenue).toFixed(1)}`
    )
    .join(" ");

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      notation: "compact",
      minimumFractionDigits: 0,
    }).format(n);

  // Current month marker x
  const currentX =
    currentMonthIndex >= 0 && currentMonthIndex < data.length
      ? xOf(currentMonthIndex)
      : null;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: "480px" }}
        aria-label="Revenue forecast chart"
      >
        {/* Gridlines */}
        {Array.from({ length: GRIDLINES + 1 }, (_, gi) => {
          const v = (gi / GRIDLINES) * niceCeil;
          const gy = yOf(v);
          return (
            <g key={`grid-${gi}`}>
              <line
                x1={PAD_LEFT}
                y1={gy}
                x2={W - PAD_RIGHT}
                y2={gy}
                stroke="currentColor"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                className="text-border"
              />
              <text
                x={PAD_LEFT - 6}
                y={gy + 4}
                textAnchor="end"
                fontSize="10"
                className="fill-muted-foreground"
              >
                {fmt(v)}
              </text>
            </g>
          );
        })}

        {/* Current month marker */}
        {currentX !== null && (
          <line
            x1={currentX}
            y1={PAD_TOP}
            x2={currentX}
            y2={PAD_TOP + innerH}
            stroke="#F48E16"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
        )}

        {/* Historical line (solid amber) */}
        {historical.length > 1 && (
          <polyline
            points={histPts}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Projected line (dashed amber) */}
        {projected.length > 0 && (
          <polyline
            points={projPts}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="7 4"
            opacity="0.65"
          />
        )}

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={`dot-${i}`}
            cx={xOf(i)}
            cy={yOf(d.revenue)}
            r={d.isProjected ? 3 : 4}
            fill={d.isProjected ? "#F59E0B66" : "#F59E0B"}
            stroke="currentColor"
            strokeWidth="1"
            className="text-background"
          />
        ))}

        {/* X axis labels */}
        {data.map((d, i) => {
          const label = d.month.split(" ")[0]; // Just "Jan" etc
          return (
            <text
              key={`xlabel-${i}`}
              x={xOf(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              className={d.isProjected ? "fill-muted-foreground/60" : "fill-muted-foreground"}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── Progress Bar ───────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = "bg-amber-500" }: { pct: number; color?: string }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ForecastPage() {
  const now = new Date();

  const salon = await prisma.salon.findFirst({ select: { id: true, currency: true, businessHours: true } });
  const currency = salon?.currency ?? "USD";
  const salonId = salon?.id ?? "";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  // ── Fetch last 6 months of actual revenue ──────────────────────────────────
  const historicalData: MonthRevenue[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    const agg = await prisma.invoice.aggregate({
      where: {
        salonId,
        status: "PAID",
        createdAt: { gte: mStart, lte: mEnd },
      },
      _sum: { total: true },
    });

    historicalData.push({
      month: monthLabel(d),
      revenue: agg._sum.total ?? 0,
    });
  }

  // ── Current month actual so far ────────────────────────────────────────────
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthActualAgg = await prisma.invoice.aggregate({
    where: {
      salonId,
      status: "PAID",
      createdAt: { gte: thisMonthStart, lte: now },
    },
    _sum: { total: true },
  });
  const thisMonthActual = thisMonthActualAgg._sum.total ?? 0;

  // ── Calculate forecast ─────────────────────────────────────────────────────
  const allData = calculateForecast(historicalData);

  // Current month is last historical entry (index 5)
  const currentMonthIndex = historicalData.length - 1;

  // ── KPI projections ────────────────────────────────────────────────────────
  const projectedThisMonth = allData[currentMonthIndex]?.revenue ?? 0;
  const projectedNextMonth = allData[currentMonthIndex + 1]?.revenue ?? 0;

  // Annual: sum actual months already passed + projected future months
  const monthsPassed = now.getMonth(); // 0-indexed
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const yearActualAgg = await prisma.invoice.aggregate({
    where: {
      salonId,
      status: "PAID",
      createdAt: { gte: startOfYear, lte: now },
    },
    _sum: { total: true },
  });
  const yearActualSoFar = yearActualAgg._sum.total ?? 0;

  // Remaining months' projections
  const remainingMonths = 11 - monthsPassed; // months after current
  const projectedNextMonthsSum = allData
    .filter((d) => d.isProjected)
    .slice(0, remainingMonths)
    .reduce((s, d) => s + d.revenue, 0);
  const projectedAnnualTotal = yearActualSoFar + projectedNextMonthsSum;

  const monthProgressPct =
    projectedThisMonth > 0
      ? Math.min(Math.round((thisMonthActual / projectedThisMonth) * 100), 100)
      : 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  const kpiCards = [
    {
      label: "Projected This Month",
      value: fmt(projectedThisMonth),
      sub: `Actual so far: ${fmt(thisMonthActual)}`,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Projected Next Month",
      value: fmt(projectedNextMonth),
      sub: "Based on 3-month moving average + 5% growth",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Projected Annual Total",
      value: fmt(projectedAnnualTotal),
      sub: `Actual YTD: ${fmt(yearActualSoFar)}`,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Monthly Progress",
      value: `${monthProgressPct}%`,
      sub: `${fmt(thisMonthActual)} of ${fmt(projectedThisMonth)} projected`,
      color: monthProgressPct >= 75 ? "text-emerald-500" : "text-amber-500",
      bg: monthProgressPct >= 75 ? "bg-emerald-500/10" : "bg-amber-500/10",
      progress: monthProgressPct,
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-amber-500" />
          Revenue Forecast
        </h1>
        <p className="text-muted-foreground mt-1">
          6-month history · 6-month projection · 3-month moving average with 5% growth trend
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.label} className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className={`w-9 h-9 rounded-full ${card.bg} flex items-center justify-center mb-3`}>
                <TrendingUp className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mt-1">
                {card.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              {"progress" in card && typeof card.progress === "number" && (
                <div className="mt-3">
                  <ProgressBar pct={card.progress} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 12-month Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            12-Month Revenue Chart
          </CardTitle>
          {/* Legend */}
          <div className="flex items-center gap-6 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1.5">
              <svg width="24" height="4" aria-hidden="true">
                <line x1="0" y1="2" x2="24" y2="2" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Historical (actual)
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="24" height="4" aria-hidden="true">
                <line x1="0" y1="2" x2="24" y2="2" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 3" opacity="0.65" />
              </svg>
              Projected
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" aria-hidden="true">
                <line x1="6" y1="0" x2="6" y2="12" stroke="#F48E16" strokeWidth="1.5" strokeDasharray="4 2" />
              </svg>
              Current month
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <LineChart
            data={allData}
            currency={currency}
            currentMonthIndex={currentMonthIndex}
          />
        </CardContent>
      </Card>

      {/* Monthly breakdown table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            Monthly Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                    Month
                  </th>
                  <th className="text-right pb-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                    Revenue
                  </th>
                  <th className="text-right pb-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {allData.map((row, i) => (
                  <tr
                    key={`${row.month}-${i}`}
                    className={`hover:bg-secondary/30 transition-colors ${
                      i === currentMonthIndex ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <td className="py-2.5 font-medium text-foreground flex items-center gap-2">
                      {i === currentMonthIndex && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block flex-shrink-0" />
                      )}
                      {row.month}
                      {i === currentMonthIndex && (
                        <span className="text-[10px] text-amber-500 font-semibold ml-1">Current</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-foreground">
                      {fmt(row.revenue)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          row.isProjected
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {row.isProjected ? "Projected" : "Actual"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
