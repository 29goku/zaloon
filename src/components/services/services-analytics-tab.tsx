"use client";

import * as React from "react";

interface TopService {
  id: string;
  name: string;
  count: number;
  revenue: number;
  durationMins: number;
}

interface ServicesAnalyticsTabProps {
  topServices: TopService[];
  fmt: (n: number) => string;
}

export function ServicesAnalyticsTab({
  topServices,
  fmt,
}: ServicesAnalyticsTabProps) {
  if (topServices.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground font-medium">No booking data yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Analytics will appear once appointments are recorded this month.
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...topServices.map((s) => s.count), 1);

  return (
    <div className="space-y-8">
      {/* Most popular services — SVG bar chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold mb-1">Most Popular Services</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Top services by appointment count — current month
        </p>

        <div className="space-y-3">
          {topServices.map((service, i) => {
            const barPct = (service.count / maxCount) * 100;
            return (
              <div key={service.id} className="flex items-center gap-3">
                {/* Rank */}
                <span className="text-xs font-semibold text-muted-foreground w-4 shrink-0 text-right">
                  {i + 1}
                </span>

                {/* Service name */}
                <div className="w-40 shrink-0">
                  <p className="text-sm font-medium truncate">{service.name}</p>
                </div>

                {/* Bar */}
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${barPct}%` }}
                  />
                </div>

                {/* Count */}
                <span className="text-sm font-semibold w-8 text-right shrink-0">
                  {service.count}
                </span>

                {/* Revenue */}
                <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
                  {fmt(service.revenue)}
                </span>
              </div>
            );
          })}
        </div>

        {/* SVG version for print / non-interactive context */}
        <div className="mt-6 hidden sm:block">
          <svg
            viewBox={`0 0 600 ${topServices.length * 36 + 20}`}
            className="w-full"
            aria-label="Bar chart of top services by booking count"
          >
            {topServices.map((service, i) => {
              const y = i * 36 + 10;
              const barW = Math.max(4, (service.count / maxCount) * 360);
              return (
                <g key={service.id}>
                  {/* Label */}
                  <text
                    x={0}
                    y={y + 14}
                    fontSize={11}
                    fill="currentColor"
                    className="fill-muted-foreground"
                    clipPath={`url(#clip-${i})`}
                  >
                    {service.name.length > 18
                      ? `${service.name.slice(0, 17)}…`
                      : service.name}
                  </text>
                  {/* Bar */}
                  <rect
                    x={160}
                    y={y}
                    width={barW}
                    height={22}
                    rx={4}
                    className="fill-primary opacity-80"
                  />
                  {/* Count */}
                  <text
                    x={160 + barW + 6}
                    y={y + 14}
                    fontSize={11}
                    fill="currentColor"
                    className="fill-foreground font-semibold"
                  >
                    {service.count}
                  </text>
                  {/* Revenue */}
                  <text
                    x={540}
                    y={y + 14}
                    fontSize={10}
                    textAnchor="end"
                    fill="currentColor"
                    className="fill-muted-foreground"
                  >
                    {fmt(service.revenue)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Revenue per service table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Revenue Breakdown</h2>
          <p className="text-xs text-muted-foreground">Revenue generated per service this month</p>
        </div>
        <div className="divide-y divide-border">
          {topServices.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between px-6 py-3"
            >
              <div>
                <p className="text-sm font-medium">{service.name}</p>
                <p className="text-xs text-muted-foreground">
                  {service.count} appointment{service.count !== 1 ? "s" : ""} &middot;{" "}
                  {service.durationMins} min each
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{fmt(service.revenue)}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(service.count > 0 ? service.revenue / service.count : 0)} avg
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
