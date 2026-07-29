"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export interface RevenueByDayPoint {
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  revenue: number;
  count: number;
}

interface RevenueByDayChartProps {
  data: RevenueByDayPoint[];
  currency: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RevenueByDayChart({ data, currency }: RevenueByDayChartProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // Build a full 7-day array even if some days are missing
  const days = DAY_LABELS.map((label, dow) => {
    const found = data.find((d) => d.dayOfWeek === dow);
    return {
      label,
      revenue: found?.revenue ?? 0,
      count: found?.count ?? 0,
    };
  });

  const maxRev = Math.max(...days.map((d) => d.revenue), 1);
  const isEmpty = days.every((d) => d.revenue === 0);

  // SVG dimensions
  const W = 700;
  const H = 220;
  const PAD = { top: 20, right: 16, bottom: 44, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const barCount = 7;
  const totalGaps = barCount + 1;
  const gapRatio = 0.3; // gap = 30% of slot
  const slotW = chartW / barCount;
  const barW = slotW * (1 - gapRatio);
  const gapW = slotW * gapRatio;

  const xPos = (i: number) => PAD.left + gapW / 2 + i * slotW;
  const barH = (rev: number) => (rev / maxRev) * chartH;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: t * maxRev,
    y: PAD.top + chartH - t * chartH,
  }));

  // Bar color: highlight the tallest bar
  const maxIdx = days.reduce(
    (best, d, i) => (d.revenue > days[best].revenue ? i : best),
    0
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Revenue by Day of Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No revenue data for this period.</p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ maxHeight: "220px" }}
            aria-label="Revenue by day of week bar chart"
          >
            {/* Y-axis grid lines + labels */}
            {yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={PAD.left}
                  y1={tick.y}
                  x2={W - PAD.right}
                  y2={tick.y}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={PAD.left - 8}
                  y={tick.y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="hsl(var(--muted-foreground))"
                >
                  {fmt(tick.value)}
                </text>
              </g>
            ))}

            {/* Bars */}
            {days.map((day, i) => {
              const bH = barH(day.revenue);
              const x = xPos(i);
              const y = PAD.top + chartH - bH;
              const isHighlight = i === maxIdx && day.revenue > 0;

              return (
                <g key={day.label}>
                  {/* Background track */}
                  <rect
                    x={x}
                    y={PAD.top}
                    width={barW}
                    height={chartH}
                    rx={5}
                    fill="hsl(var(--secondary))"
                    opacity={0.5}
                  />

                  {/* Revenue bar */}
                  {day.revenue > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={bH}
                      rx={5}
                      fill={
                        isHighlight
                          ? "hsl(var(--primary))"
                          : "hsl(var(--primary) / 0.55)"
                      }
                    />
                  )}

                  {/* Revenue label above bar */}
                  {day.revenue > 0 && bH > 24 && (
                    <text
                      x={x + barW / 2}
                      y={y + 14}
                      textAnchor="middle"
                      fontSize={10}
                      fill="white"
                      fontWeight={600}
                    >
                      {fmt(day.revenue)}
                    </text>
                  )}

                  {/* Day label below */}
                  <text
                    x={x + barW / 2}
                    y={PAD.top + chartH + 16}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={isHighlight ? 700 : 400}
                    fill={
                      isHighlight
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground))"
                    }
                  >
                    {day.label}
                  </text>

                  {/* Booking count below day label */}
                  {day.count > 0 && (
                    <text
                      x={x + barW / 2}
                      y={PAD.top + chartH + 32}
                      textAnchor="middle"
                      fontSize={10}
                      fill="hsl(var(--muted-foreground))"
                      opacity={0.7}
                    >
                      {day.count}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </CardContent>
    </Card>
  );
}
