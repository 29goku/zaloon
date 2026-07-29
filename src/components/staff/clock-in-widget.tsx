"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clockIn, clockOut } from "@/app/actions/timetracking";

export interface ClockInWidgetProps {
  staffId: string;
  staffName: string;
  isClockedIn: boolean;
  clockInTime?: string;
}

function avatarColor(name: string): string {
  const colors = [
    "bg-violet-500/20 text-violet-600 dark:text-violet-400",
    "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    "bg-rose-500/20 text-rose-600 dark:text-rose-400",
    "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
    "bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function ClockInWidget({
  staffId,
  staffName,
  isClockedIn: initialClockedIn,
  clockInTime: initialClockInTime,
}: ClockInWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isClockedIn, setIsClockedIn] = useState(initialClockedIn);
  const [clockInTime, setClockInTime] = useState<string | undefined>(
    initialClockInTime
  );
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = isClockedIn && clockInTime
    ? now.getTime() - new Date(clockInTime).getTime()
    : 0;

  function handleClockIn() {
    setError(null);
    startTransition(async () => {
      const result = await clockIn(staffId);
      if (result.success && result.entry) {
        setIsClockedIn(true);
        setClockInTime(result.entry.clockIn);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to clock in");
      }
    });
  }

  function handleClockOut() {
    setError(null);
    startTransition(async () => {
      const result = await clockOut(staffId);
      if (result.success) {
        setIsClockedIn(false);
        setClockInTime(undefined);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to clock out");
      }
    });
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 ${avatarColor(staffName)}`}
        >
          {initials(staffName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm leading-tight truncate">
            {staffName}
          </p>
          {isClockedIn ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Clocked In
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Not clocked in</span>
          )}
        </div>
      </div>

      {/* Status body */}
      {isClockedIn && clockInTime ? (
        <div className="space-y-1 text-center bg-emerald-500/10 rounded-xl py-3 px-4">
          <p className="text-2xl font-bold text-emerald-500 tabular-nums">
            {formatDuration(elapsed)}
          </p>
          <p className="text-xs text-muted-foreground">
            since{" "}
            {new Date(clockInTime).toLocaleTimeString("en", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      ) : (
        <div className="text-center bg-secondary/40 rounded-xl py-3 px-4">
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {now.toLocaleTimeString("en", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-xs text-muted-foreground">current time</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 text-center -my-1">{error}</p>
      )}

      {/* Action button */}
      {isClockedIn ? (
        <button
          onClick={handleClockOut}
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Processing…" : "Clock Out"}
        </button>
      ) : (
        <button
          onClick={handleClockIn}
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Processing…" : "Clock In"}
        </button>
      )}
    </div>
  );
}
