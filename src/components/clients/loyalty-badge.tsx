"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export function getLoyaltyTier(points: number): LoyaltyTier {
  if (points >= 1000) return "Platinum";
  if (points >= 500) return "Gold";
  if (points >= 100) return "Silver";
  return "Bronze";
}

const tierStyles: Record<LoyaltyTier, { bg: string; text: string; border: string; star: string }> = {
  Bronze: {
    bg: "bg-amber-900/10 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-700/30 dark:border-amber-400/30",
    star: "text-amber-600 dark:text-amber-400",
  },
  Silver: {
    bg: "bg-slate-400/10 dark:bg-slate-400/20",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-400/30 dark:border-slate-300/30",
    star: "text-slate-500 dark:text-slate-300",
  },
  Gold: {
    bg: "bg-yellow-400/10 dark:bg-yellow-400/20",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-400/30 dark:border-yellow-400/30",
    star: "text-yellow-500 dark:text-yellow-400",
  },
  Platinum: {
    bg: "bg-cyan-400/10 dark:bg-cyan-400/20",
    text: "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-400/30 dark:border-cyan-400/30",
    star: "text-cyan-500 dark:text-cyan-400",
  },
};

interface LoyaltyBadgeProps {
  points: number;
  /** compact shows just icon + points, full shows tier label too */
  variant?: "compact" | "full";
  className?: string;
}

export function LoyaltyBadge({ points, variant = "full", className }: LoyaltyBadgeProps) {
  const tier = getLoyaltyTier(points);
  const styles = tierStyles[tier];

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-xs font-medium",
          styles.text,
          className
        )}
        title={`${tier} — ${points} pts`}
      >
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
        <p className={cn("text-sm font-bold leading-none", styles.text)}>{points} pts</p>
        <p className={cn("text-xs mt-0.5 font-medium", styles.text)}>{tier}</p>
      </div>
    </div>
  );
}
