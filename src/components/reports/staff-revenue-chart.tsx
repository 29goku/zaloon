"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export interface StaffRevenueBar {
  staffId: string;
  name: string;
  revenue: number;
  appointments: number;
  avgTicket: number;
}

interface StaffRevenueChartProps {
  data: StaffRevenueBar[];
  currency: string;
}

export function StaffRevenueChart({ data, currency }: StaffRevenueChartProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const isEmpty = data.length === 0;

  // SVG horizontal bar chart
  const BAR_HEIGHT = 30;
  const BAR_GAP = 12;
  const LABEL_W = 120;
  const VALUE_W = 70;
  const CHART_W = 700;
  const PAD = { top: 8, right: VALUE_W + 8, bottom: 8, left: LABEL_W + 12 };
  const CHART_H = data.length * (BAR_HEIGHT + BAR_GAP) + PAD.top + PAD.bottom;
  const barW = CHART_W - LABEL_W - 12 - VALUE_W - 8;
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);

  const barColors = [
    "hsl(var(--primary))",
    "#F48E16",
    "#F41666",
    "hsl(var(--primary) / 0.7)",
    "#F48E16",
    "hsl(var(--primary) / 0.55)",
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Revenue by Staff
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No staff data for this period.</p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="w-full"
            aria-label="Revenue by staff member bar chart"
          >
            {data.map((row, i) => {
              const barLen = (row.revenue / maxRev) * barW;
              const y = PAD.top + i * (BAR_HEIGHT + BAR_GAP);
              const color = barColors[i % barColors.length];
              const truncated =
                row.name.length > 16 ? row.name.slice(0, 15) + "…" : row.name;

              return (
                <g key={row.staffId}>
                  {/* Name label */}
                  <text
                    x={LABEL_W}
                    y={y + BAR_HEIGHT / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={12}
                    fontWeight={500}
                    fill="hsl(var(--foreground))"
                  >
                    {truncated}
                  </text>

                  {/* Background track */}
                  <rect
                    x={LABEL_W + 12}
                    y={y}
                    width={barW}
                    height={BAR_HEIGHT}
                    rx={6}
                    fill="hsl(var(--secondary))"
                  />

                  {/* Filled bar */}
                  {row.revenue > 0 && (
                    <rect
                      x={LABEL_W + 12}
                      y={y}
                      width={Math.max(barLen, 4)}
                      height={BAR_HEIGHT}
                      rx={6}
                      fill={color}
                      opacity={0.9}
                    />
                  )}

                  {/* Avg ticket label inside bar */}
                  {barLen > 60 && (
                    <text
                      x={LABEL_W + 12 + 8}
                      y={y + BAR_HEIGHT / 2}
                      dominantBaseline="middle"
                      fontSize={10}
                      fill="white"
                      opacity={0.9}
                    >
                      avg {fmt(row.avgTicket)}
                    </text>
                  )}

                  {/* Revenue value */}
                  <text
                    x={LABEL_W + 12 + barW + 8}
                    y={y + BAR_HEIGHT / 2}
                    dominantBaseline="middle"
                    fontSize={11}
                    fill="hsl(var(--muted-foreground))"
                    textAnchor="start"
                  >
                    {fmt(row.revenue)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </CardContent>
    </Card>
  );
}
