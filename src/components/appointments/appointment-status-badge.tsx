"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  NO_SHOW: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

interface AppointmentStatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export function AppointmentStatusBadge({
  status,
  className,
  showDot = false,
}: AppointmentStatusBadgeProps) {
  const colorClass = STATUS_CLASS[status] ?? "bg-muted text-muted-foreground border-border";
  const label = STATUS_LABEL[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border select-none",
        colorClass,
        className
      )}
    >
      {showDot && status === "IN_PROGRESS" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
        </span>
      )}
      {label}
    </span>
  );
}
