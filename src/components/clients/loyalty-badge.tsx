"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLoyaltyTier } from "@/lib/loyalty-utils";
import type { LoyaltyTierName } from "@/lib/loyalty-utils";
export type { LoyaltyTierName } from "@/lib/loyalty-utils";
export { getLoyaltyTier } from "@/lib/loyalty-utils";

const tierStyles: Record<
  LoyaltyTierName,
  { bg: string; text: string; border: string; star: string; dot: string }
> = {
  Bronze: {
    bg: "bg-amber-900/10 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-700/30 dark:border-amber-400/30",
    star: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-600",
  },
  Silver: {
    bg: "bg-slate-400/10 dark:bg-slate-400/20",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-400/30 dark:border-slate-300/30",
    star: "text-slate-500 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  Gold: {
    bg: "bg-yellow-400/10 dark:bg-yellow-400/20",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-400/30 dark:border-yellow-400/30",
    star: "text-yellow-500 dark:text-yellow-400",
    dot: "bg-yellow-500",
  },
  Platinum: {
    bg: "bg-purple-400/10 dark:bg-purple-400/20",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-400/30 dark:border-purple-400/30",
    star: "text-purple-500 dark:text-purple-400",
    dot: "bg-purple-500",
  },
};

interface LoyaltyBadgeProps {
  points: number;
  /** compact shows just icon + points, full shows tier label too */
  variant?: "compact" | "full";
  /** optional override — when passed, the badge reflects this tier regardless of points */
  tier?: string;
  className?: string;
}

export function LoyaltyBadge({
  points,
  variant = "full",
  tier: tierProp,
  className,
}: LoyaltyBadgeProps) {
  const resolvedTier: LoyaltyTierName = isValidTier(tierProp)
    ? tierProp
    : getLoyaltyTier(points);
  const styles = tierStyles[resolvedTier];

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium",
          styles.text,
          className
        )}
        title={`${resolvedTier} — ${points} pts`}
      >
        {/* tier color dot */}
        <span
          className={cn("inline-block w-2 h-2 rounded-full shrink-0", styles.dot)}
        />
        <Star className={cn("w-3 h-3 fill-current", styles.star)} />
        {points}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 border",
        styles.bg,
        styles.border,
        className
      )}
    >
      <Star className={cn("w-4 h-4 fill-current flex-shrink-0", styles.star)} />
      <div>
        <p className={cn("text-sm font-bold leading-none", styles.text)}>
          {points} pts
        </p>
        <p className={cn("text-xs mt-0.5 font-medium", styles.text)}>
          {resolvedTier}
        </p>
      </div>
    </div>
  );
}

function isValidTier(value: string | undefined): value is LoyaltyTierName {
  return (
    value === "Bronze" ||
    value === "Silver" ||
    value === "Gold" ||
    value === "Platinum"
  );
}
