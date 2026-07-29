"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "lucide-react";
import { ExportButton } from "./export-button";

export interface CategoryRevenueRow {
  categoryId: string;
  categoryName: string;
  revenue: number;
  bookingCount: number;
  pct: number;
}

interface RevenueByCategoryTableProps {
  data: CategoryRevenueRow[];
  currency: string;
}

const BAR_COLORS = [
  "hsl(var(--primary))",
  "#F48E16",
  "#F41666",
  "hsl(var(--primary) / 0.7)",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#ec4899",
];

export function RevenueByCategoryTable({ data, currency }: RevenueByCategoryTableProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Revenue by Service Category
          </CardTitle>
          <ExportButton
            label="revenue-by-category"
            getData={() =>
              sorted.map((r) => ({
                Category: r.categoryName,
                Revenue: r.revenue,
                Bookings: r.bookingCount,
                "% of Total": r.pct.toFixed(1) + "%",
              }))
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No category data for this period.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((row, i) => {
              const color = BAR_COLORS[i % BAR_COLORS.length];
              return (
                <div key={row.categoryId}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2 text-foreground font-medium">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      {row.categoryName}
                    </span>
                    <span className="text-muted-foreground tabular-nums flex items-center gap-3">
                      <span className="text-muted-foreground/70">{row.bookingCount} bookings</span>
                      <span className="text-foreground font-semibold">{fmt(row.revenue)}</span>
                      <span className="w-12 text-right font-medium" style={{ color }}>
                        {row.pct.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${row.pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
