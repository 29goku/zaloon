"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  currency: string;
}

export function RevenueChart({ data, currency }: RevenueChartProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const isEmpty = data.length === 0 || data.every((d) => d.revenue === 0);

  // Chart dimensions
  const W = 800;
  const H = 240;
  const PAD = { top: 20, right: 20, bottom: 40, left: 56 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  if (isEmpty) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Revenue Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No revenue data for this period.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const minRev = 0;
  const range = maxRev - minRev;

  // Scale helpers
  const xPos = (i: number) =>
    data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW;
  const yPos = (rev: number) =>
    chartH - ((rev - minRev) / range) * chartH;

  // Build SVG path
  const points = data.map((d, i) => `${xPos(i)},${yPos(d.revenue)}`);
  const linePath = "M " + points.join(" L ");

  // Area fill path (close shape at the bottom)
  const first = `${xPos(0)},${chartH}`;
  const last = `${xPos(data.length - 1)},${chartH}`;
  const areaPath = `M ${first} L ${points.join(" L ")} L ${last} Z`;

  // Y-axis tick values (4 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: minRev + t * range,
    y: chartH - t * chartH,
  }));

  // X-axis label: show at most 7 evenly spaced dates
  const xLabelIndices: number[] = [];
  if (data.length <= 7) {
    data.forEach((_, i) => xLabelIndices.push(i));
  } else {
    const step = Math.floor((data.length - 1) / 6);
    for (let i = 0; i <= 6; i++) {
      xLabelIndices.push(Math.min(i * step, data.length - 1));
    }
  }

  // Format date label as "Jan 5"
  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en", { month: "short", day: "numeric" });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Revenue Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: "260px" }}
          aria-label="Revenue over time line chart"
        >
          <defs>
            <linearGradient id="rev-area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <g transform={`translate(${PAD.left},${PAD.top})`}>
            {/* Y-axis grid lines + labels */}
            {yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={0}
                  y1={tick.y}
                  x2={chartW}
                  y2={tick.y}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={-8}
                  y={tick.y}
                  dominantBaseline="middle"
                  textAnchor="end"
                  fontSize={11}
                  fill="hsl(var(--muted-foreground))"
                >
                  {fmt(tick.value)}
                </text>
              </g>
            ))}

            {/* Area fill */}
            <path
              d={areaPath}
              fill="url(#rev-area-gradient)"
            />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data point circles */}
            {data.map((d, i) => (
              <circle
                key={d.date}
                cx={xPos(i)}
                cy={yPos(d.revenue)}
                r={d.revenue > 0 ? 3.5 : 2}
                fill={d.revenue > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              />
            ))}

            {/* X-axis labels */}
            {xLabelIndices.map((i) => (
              <text
                key={i}
                x={xPos(i)}
                y={chartH + 20}
                textAnchor="middle"
                fontSize={11}
                fill="hsl(var(--muted-foreground))"
              >
                {fmtDate(data[i].date)}
              </text>
            ))}
          </g>
        </svg>
      </CardContent>
    </Card>
  );
}
