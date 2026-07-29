"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface CashFlowDay {
  date: string; // YYYY-MM-DD
  revenue: number;
  expenses: number;
  invoiceCount: number;
  expenseCount: number;
}

interface CashFlowChartProps {
  data: CashFlowDay[];
  currency: string;
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
}

export function CashFlowChart({ data, currency }: CashFlowChartProps) {
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  if (data.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Daily Cash Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No data for this period.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Compute running balance
  let running = 0;
  const points = data.map((d) => {
    running += d.revenue - d.expenses;
    return { ...d, balance: running };
  });

  const W = 800;
  const H = 220;
  const PAD_L = 72;
  const PAD_R = 20;
  const PAD_T = 24;
  const PAD_B = 36;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const maxBal = Math.max(...points.map((p) => p.balance), 1);
  const minBal = Math.min(...points.map((p) => p.balance), 0);
  const range = maxBal - minBal || 1;

  const xOf = (i: number) =>
    PAD_L + (i / Math.max(points.length - 1, 1)) * innerW;
  const yOf = (v: number) =>
    PAD_T + innerH - ((v - minBal) / range) * innerH;

  const polyPoints = points
    .map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.balance).toFixed(1)}`)
    .join(" ");

  // Area fill points (close to baseline)
  const zeroY = yOf(Math.max(minBal, 0));
  const areaPoints =
    `${xOf(0).toFixed(1)},${zeroY.toFixed(1)} ` +
    polyPoints +
    ` ${xOf(points.length - 1).toFixed(1)},${zeroY.toFixed(1)}`;

  // Grid lines (4)
  const GRIDS = 4;
  const gridValues = Array.from({ length: GRIDS + 1 }, (_, gi) => {
    return minBal + (gi / GRIDS) * range;
  });

  // X-axis labels: show every N-th label to avoid crowding
  const step = Math.max(1, Math.floor(points.length / 8));
  const xLabels = points.filter((_, i) => i % step === 0 || i === points.length - 1);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Daily Cash Flow — Running Balance
        </CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-primary inline-block rounded" />
            Balance
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-primary/30 inline-block" />
            Data point
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ minWidth: "480px" }}
            aria-label="Daily cash flow running balance chart"
            onMouseLeave={() => setTooltipIdx(null)}
          >
            {/* Grid lines */}
            {gridValues.map((v, gi) => {
              const gy = yOf(v);
              return (
                <g key={`grid-${gi}`}>
                  <line
                    x1={PAD_L}
                    y1={gy}
                    x2={W - PAD_R}
                    y2={gy}
                    stroke="currentColor"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                    className="text-border"
                  />
                  <text
                    x={PAD_L - 6}
                    y={gy + 4}
                    textAnchor="end"
                    fontSize="9"
                    className="fill-muted-foreground"
                  >
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency,
                      notation: "compact",
                      minimumFractionDigits: 0,
                    }).format(v)}
                  </text>
                </g>
              );
            })}

            {/* Zero line */}
            {minBal < 0 && maxBal > 0 && (
              <line
                x1={PAD_L}
                y1={yOf(0)}
                x2={W - PAD_R}
                y2={yOf(0)}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="4 2"
                opacity="0.5"
              />
            )}

            {/* Area fill */}
            <polygon
              points={areaPoints}
              fill="currentColor"
              className="text-primary"
              opacity="0.08"
            />

            {/* Line */}
            <polyline
              points={polyPoints}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="text-primary"
            />

            {/* Data points + invisible hit areas */}
            {points.map((p, i) => {
              const cx = xOf(i);
              const cy = yOf(p.balance);
              const isHovered = tooltipIdx === i;
              return (
                <g key={`pt-${i}`}>
                  {/* Hit area */}
                  <rect
                    x={cx - 10}
                    y={PAD_T}
                    width={20}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setTooltipIdx(i)}
                  />
                  {/* Dot */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5 : 3}
                    fill={p.balance >= 0 ? "#6366f1" : "#ef4444"}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-background transition-all"
                    pointerEvents="none"
                  />
                  {/* Tooltip */}
                  {isHovered && (
                    <g>
                      {/* Vertical guide line */}
                      <line
                        x1={cx}
                        y1={PAD_T}
                        x2={cx}
                        y2={PAD_T + innerH}
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="3 2"
                        className="text-muted-foreground"
                        opacity="0.6"
                      />
                      {/* Tooltip box */}
                      {(() => {
                        const boxW = 160;
                        const boxH = 72;
                        const boxX = Math.min(cx + 8, W - PAD_R - boxW);
                        const boxY = Math.max(PAD_T, cy - boxH / 2);
                        const net = p.revenue - p.expenses;
                        return (
                          <g>
                            <rect
                              x={boxX}
                              y={boxY}
                              width={boxW}
                              height={boxH}
                              rx={6}
                              fill="currentColor"
                              className="text-card"
                              stroke="currentColor"
                              strokeWidth="1"
                              style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }}
                            />
                            <text
                              x={boxX + 10}
                              y={boxY + 16}
                              fontSize="10"
                              fontWeight="600"
                              className="fill-foreground"
                            >
                              {formatDate(p.date)}
                            </text>
                            <text
                              x={boxX + 10}
                              y={boxY + 31}
                              fontSize="9"
                              className="fill-muted-foreground"
                            >
                              {net >= 0 ? "+" : ""}{fmt(net)} ({p.invoiceCount} inv, {p.expenseCount} exp)
                            </text>
                            <text
                              x={boxX + 10}
                              y={boxY + 46}
                              fontSize="9"
                              className="fill-muted-foreground"
                            >
                              Balance: {fmt(p.balance)}
                            </text>
                            <text
                              x={boxX + 10}
                              y={boxY + 61}
                              fontSize="9"
                              className="fill-muted-foreground"
                            >
                              Rev: {fmt(p.revenue)} · Exp: {fmt(p.expenses)}
                            </text>
                          </g>
                        );
                      })()}
                    </g>
                  )}
                </g>
              );
            })}

            {/* X axis labels */}
            {xLabels.map((p) => {
              const i = points.indexOf(p);
              return (
                <text
                  key={`xlabel-${i}`}
                  x={xOf(i)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="9"
                  className="fill-muted-foreground"
                >
                  {formatDate(p.date)}
                </text>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
