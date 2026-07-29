"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors } from "lucide-react";

export interface ServiceRevenueData {
  name: string;
  revenue: number;
  count: number;
}

interface TopServicesChartProps {
  data: ServiceRevenueData[];
  currency: string;
}

export function TopServicesChart({ data, currency }: TopServicesChartProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const isEmpty = data.length === 0;

  // Chart dimensions
  const BAR_HEIGHT = 28;
  const BAR_GAP = 16;
  const LABEL_W = 140;
  const VALUE_W = 60;
  const PAD = { top: 12, right: VALUE_W + 8, bottom: 12, left: LABEL_W + 12 };
  const CHART_W = 800;
  const CHART_H =
    data.length * (BAR_HEIGHT + BAR_GAP) + PAD.top + PAD.bottom;

  if (isEmpty) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#F48E16]" />
            Top Services by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No service data for this period.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const barW = CHART_W - LABEL_W - 12 - VALUE_W - 8;

  // Bar colors cycling through the design palette
  const barColors = [
    "hsl(var(--primary))",
    "#F48E16",
    "#F41666",
    "hsl(var(--primary) / 0.7)",
    "#F48E16aa",
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Scissors className="w-4 h-4 text-[#F48E16]" />
          Top Services by Revenue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full"
          aria-label="Top services by revenue bar chart"
        >
          {data.map((item, i) => {
            const barLen = (item.revenue / maxRev) * barW;
            const y = PAD.top + i * (BAR_HEIGHT + BAR_GAP);
            const color = barColors[i % barColors.length];
            const truncatedName =
              item.name.length > 20
                ? item.name.slice(0, 19) + "…"
                : item.name;

            return (
              <g key={item.name}>
                {/* Service name label */}
                <text
                  x={LABEL_W}
                  y={y + BAR_HEIGHT / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill="hsl(var(--foreground))"
                  fontWeight={500}
                >
                  {truncatedName}
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
                <rect
                  x={LABEL_W + 12}
                  y={y}
                  width={Math.max(barLen, 4)}
                  height={BAR_HEIGHT}
                  rx={6}
                  fill={color}
                  opacity={0.85}
                />

                {/* Revenue label */}
                <text
                  x={LABEL_W + 12 + barW + 8}
                  y={y + BAR_HEIGHT / 2}
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="hsl(var(--muted-foreground))"
                  textAnchor="start"
                >
                  {fmt(item.revenue)}
                </text>

                {/* Count badge inside bar */}
                {barLen > 40 && (
                  <text
                    x={LABEL_W + 12 + 8}
                    y={y + BAR_HEIGHT / 2}
                    dominantBaseline="middle"
                    fontSize={10}
                    fill="white"
                    opacity={0.9}
                  >
                    {item.count}x
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
