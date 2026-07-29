"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface KpiCardProps {
  label: string;
  value: string | number;
  /** Percentage change vs previous period. Positive = up, negative = down, null = no comparison. */
  changePct?: number | null;
  /** Optional icon component */
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  /** When true, a lower value is better (e.g. cancellation rate) */
  invertTrend?: boolean;
}

export function KpiCard({
  label,
  value,
  changePct,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  invertTrend = false,
}: KpiCardProps) {
  const hasChange = changePct !== null && changePct !== undefined;

  // Determine whether the direction is "good" or "bad" for the color
  const isPositive = (changePct ?? 0) > 0;
  const isNeutral = (changePct ?? 0) === 0;
  const isGood = invertTrend ? !isPositive : isPositive;

  const trendColor = isNeutral
    ? "text-muted-foreground"
    : isGood
    ? "text-emerald-500"
    : "text-[#F41666]";

  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  const fmtPct = (n: number) => {
    const abs = Math.abs(n);
    return abs >= 1000 ? ">1000%" : `${abs.toFixed(1)}%`;
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-muted-foreground leading-tight">{label}</p>
          {Icon && (
            <div className={`${iconBg} p-2 rounded-lg flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
          )}
        </div>

        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>

        {hasChange && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>
              {isPositive ? "+" : ""}{fmtPct(changePct!)} vs prev period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
