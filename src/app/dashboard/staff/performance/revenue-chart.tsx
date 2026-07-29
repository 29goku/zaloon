"use client";

import React, { useId } from "react";

// ── types ─────────────────────────────────────────────────────────────────────

export interface RevenueChartData {
  staffId: string;
  name: string;
  months: Array<{
    label: string; // e.g. "May"
    revenue: number;
  }>;
}

interface RevenueChartProps {
  data: RevenueChartData[];
  months: string[]; // ordered month labels
  currency: string;
}

// ── palette — one color per staff member ─────────────────────────────────────

const CHART_COLORS = [
  "#F41666", // pink/primary
  "#6366f1", // indigo
  "#10b981", // emerald
  "#F48E16", // amber
  "#06b6d4", // cyan
  "#a855f7", // purple
  "#f97316", // orange
  "#84cc16", // lime
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── component ─────────────────────────────────────────────────────────────────

export function RevenueChart({ data, months, currency }: RevenueChartProps) {
  const uid = useId();

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      notation: "compact",
    }).format(n);

  // Find the max revenue value across all staff/months for scaling
  const allRevenues = data.flatMap((s) => s.months.map((m) => m.revenue));
  const maxRevenue = Math.max(...allRevenues, 1);

  const BAR_HEIGHT = 160; // px — height of chart area
  const BAR_GROUP_GAP = 24; // px between groups
  const BAR_INNER_GAP = 2; // px between bars in a group
  const BAR_MIN_WIDTH = 12;
  const BAR_MAX_WIDTH = 28;

  const numMonths = months.length;
  const numStaff = data.length;

  // Calculate bar width dynamically
  const barW = Math.max(BAR_MIN_WIDTH, Math.min(BAR_MAX_WIDTH, Math.floor((180 - BAR_GROUP_GAP) / Math.max(numStaff, 1))));
  const groupW = numStaff * barW + (numStaff - 1) * BAR_INNER_GAP;
  const totalW = numMonths * groupW + (numMonths - 1) * BAR_GROUP_GAP + 60; // 60 = left margin for y-axis

  const LEFT_MARGIN = 50;
  const TOP_MARGIN = 10;
  const BOTTOM_MARGIN = 36;
  const svgH = BAR_HEIGHT + TOP_MARGIN + BOTTOM_MARGIN;
  const svgW = totalW;

  // Y axis grid lines (4 lines)
  const yLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: TOP_MARGIN + BAR_HEIGHT * (1 - f),
    label: fmt(maxRevenue * f),
  }));

  return (
    <div className="w-full overflow-x-auto">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 pl-1">
        {data.map((s, i) => (
          <div key={s.staffId} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-xs text-muted-foreground">
              {s.name}
            </span>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width: "100%", maxWidth: svgW, height: svgH, minWidth: Math.min(svgW, 320) }}
        aria-label="Staff revenue comparison chart"
      >
        <defs>
          {data.map((s, i) => (
            <linearGradient
              key={`${uid}-grad-${i}`}
              id={`${uid}-grad-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity="0.9" />
              <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity="0.5" />
            </linearGradient>
          ))}
        </defs>

        {/* Y-axis grid lines */}
        {yLines.map(({ y, label }) => (
          <g key={y}>
            <line
              x1={LEFT_MARGIN}
              y1={y}
              x2={svgW - 4}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
              strokeDasharray={y === TOP_MARGIN + BAR_HEIGHT ? "none" : "3 3"}
            />
            <text
              x={LEFT_MARGIN - 6}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="currentColor"
              opacity="0.45"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Bars */}
        {months.map((month, mi) => {
          const groupX = LEFT_MARGIN + mi * (groupW + BAR_GROUP_GAP);
          const groupCenterX = groupX + groupW / 2;

          return (
            <g key={month}>
              {/* Month label */}
              <text
                x={groupCenterX}
                y={svgH - 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="currentColor"
                opacity="0.6"
              >
                {month}
              </text>

              {/* Bars per staff for this month */}
              {data.map((s, si) => {
                const rev = s.months.find((m) => m.label === month)?.revenue ?? 0;
                const barH = rev > 0 ? Math.max(3, (rev / maxRevenue) * BAR_HEIGHT) : 0;
                const barX = groupX + si * (barW + BAR_INNER_GAP);
                const barY = TOP_MARGIN + BAR_HEIGHT - barH;
                const color = CHART_COLORS[si % CHART_COLORS.length];
                const gradId = `${uid}-grad-${si}`;
                const isTopValue = rev === Math.max(...data.map((d) => d.months.find((m) => m.label === month)?.revenue ?? 0));

                return (
                  <g key={s.staffId}>
                    <rect
                      x={barX}
                      y={barY}
                      width={barW}
                      height={barH}
                      rx="3"
                      fill={`url(#${gradId})`}
                    />
                    {/* Hover tooltip — pure SVG title */}
                    <title>{`${s.name} — ${month}: ${fmt(rev)}`}</title>
                    {/* Highlight top value with a white dot */}
                    {isTopValue && rev > 0 && (
                      <circle
                        cx={barX + barW / 2}
                        cy={barY - 4}
                        r="2.5"
                        fill={color}
                        opacity="0.9"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* X-axis baseline */}
        <line
          x1={LEFT_MARGIN}
          y1={TOP_MARGIN + BAR_HEIGHT}
          x2={svgW - 4}
          y2={TOP_MARGIN + BAR_HEIGHT}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1"
        />
      </svg>

      {/* Staff name labels below */}
      <div className="flex flex-wrap gap-3 mt-3 pl-1">
        {data.map((s, i) => (
          <div key={s.staffId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + "25",
                color: CHART_COLORS[i % CHART_COLORS.length],
              }}
            >
              {getInitials(s.name)}
            </div>
            {s.months.length > 0 && (
              <span>
                {fmt(s.months[s.months.length - 1]?.revenue ?? 0)} this month
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
