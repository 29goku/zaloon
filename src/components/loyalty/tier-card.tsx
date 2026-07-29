"use client";

import { cn } from "@/lib/utils";

export type TierName = "Bronze" | "Silver" | "Gold" | "Platinum";

interface TierCardProps {
  tier: TierName;
  pointRange: string;
  memberCount: number;
  totalPoints: number;
  className?: string;
}

const tierConfig: Record<
  TierName,
  {
    bg: string;
    border: string;
    label: string;
    labelBg: string;
    dot: string;
  }
> = {
  Bronze: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-300 dark:border-amber-700/50",
    label: "text-amber-800 dark:text-amber-300",
    labelBg: "bg-amber-100 dark:bg-amber-900/40",
    dot: "bg-amber-500",
  },
  Silver: {
    bg: "bg-slate-50 dark:bg-slate-800/20",
    border: "border-slate-300 dark:border-slate-600/50",
    label: "text-slate-700 dark:text-slate-300",
    labelBg: "bg-slate-100 dark:bg-slate-700/40",
    dot: "bg-slate-400",
  },
  Gold: {
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    border: "border-yellow-300 dark:border-yellow-700/50",
    label: "text-yellow-800 dark:text-yellow-300",
    labelBg: "bg-yellow-100 dark:bg-yellow-900/40",
    dot: "bg-yellow-500",
  },
  Platinum: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-300 dark:border-purple-700/50",
    label: "text-purple-800 dark:text-purple-300",
    labelBg: "bg-purple-100 dark:bg-purple-900/40",
    dot: "bg-purple-500",
  },
};

export function TierCard({
  tier,
  pointRange,
  memberCount,
  totalPoints,
  className,
}: TierCardProps) {
  const cfg = tierConfig[tier];

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 flex flex-col gap-3",
        cfg.bg,
        cfg.border,
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", cfg.dot)} />
        <span className={cn("text-sm font-bold", cfg.label)}>{tier}</span>
        <span
          className={cn(
            "ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
            cfg.labelBg,
            cfg.label
          )}
        >
          {pointRange} pts
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-1">
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">
            {memberCount.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Members</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">
            {totalPoints.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total pts held</p>
        </div>
      </div>
    </div>
  );
}
