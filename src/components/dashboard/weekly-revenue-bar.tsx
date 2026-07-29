"use client";

import { useState } from "react";

type DayRevenue = { day: string; revenue: number };

type Props = {
  data: DayRevenue[];
  currency?: string;
};

export function WeeklyRevenueBar({ data, currency = "USD" }: Props) {
  const [tooltip, setTooltip] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        No revenue this week
      </div>
    );
  }

  const allZero = data.every((d) => d.revenue === 0);
  if (allZero) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        No revenue this week
      </div>
    );
  }

  // Today's day abbreviation — Mon, Tue, etc.
  const todayDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date().getDay()
  ];

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  // SVG dimensions
  const W = 280;
  const H = 80;
  const BOTTOM_LABEL = 16; // space for day labels
  const chartH = H - BOTTOM_LABEL;
  const barCount = data.length;
  const gap = 6;
  const barW = (W - gap * (barCount - 1)) / barCount;

  return (
    <div className="relative select-none">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible"
        aria-label="Weekly revenue bar chart"
        onMouseLeave={() => setTooltip(null)}
      >
        {data.map((d, i) => {
          const barH = Math.max((d.revenue / maxRevenue) * chartH, d.revenue > 0 ? 2 : 0);
          const x = i * (barW + gap);
          const y = chartH - barH;
          const isToday = d.day === todayDay;
          const isHovered = tooltip?.index === i;

          return (
            <g key={d.day}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                className={
                  isToday
                    ? "fill-primary"
                    : isHovered
                    ? "fill-muted-foreground/60"
                    : "fill-muted-foreground/25"
                }
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
                  setTooltip({ index: i, x: rect.left + rect.width / 2, y: rect.top });
                }}
              />
              {/* Day label */}
              <text
                x={x + barW / 2}
                y={H - 2}
                textAnchor="middle"
                fontSize={9}
                className={
                  isToday
                    ? "fill-primary font-semibold"
                    : "fill-muted-foreground"
                }
                fontWeight={isToday ? 700 : 400}
              >
                {d.day}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip !== null && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg bg-popover border border-border shadow-md px-2.5 py-1.5 text-xs font-medium text-popover-foreground -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          <span className="text-muted-foreground mr-1">{data[tooltip.index].day}:</span>
          {fmt(data[tooltip.index].revenue)}
        </div>
      )}
    </div>
  );
}
