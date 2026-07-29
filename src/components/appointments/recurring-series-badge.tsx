"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, X, ChevronRight } from "lucide-react";
import { cancelRecurringSeries } from "@/app/actions/appointments";
import { toast } from "@/components/ui/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecurringMeta {
  pattern: "weekly" | "biweekly" | "monthly";
  seriesId: string;
  occurrence: number;
  total: number;
}

interface RecurringSeriesBadgeProps {
  appointment: {
    id: string;
    notes: string | null;
    date: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRecurring(notes: string | null): RecurringMeta | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    const r = parsed?.__recurring;
    if (r?.seriesId && r?.occurrence != null && r?.total != null && r?.pattern) {
      return r as RecurringMeta;
    }
  } catch {
    // not JSON or no __recurring key
  }
  return null;
}

function patternLabel(pattern: RecurringMeta["pattern"]): string {
  if (pattern === "weekly") return "Weekly";
  if (pattern === "biweekly") return "Every 2 weeks";
  return "Monthly";
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return date.toISOString().split("T")[0];
}

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1 + months, d);
  // clamp overflow
  if (date.getMonth() !== ((m - 1 + months) % 12 + 12) % 12) {
    date.setDate(0);
  }
  return date.toISOString().split("T")[0];
}

function nextOccurrenceDate(
  currentDate: string,
  pattern: RecurringMeta["pattern"]
): string {
  if (pattern === "weekly") return addDays(currentDate, 7);
  if (pattern === "biweekly") return addDays(currentDate, 14);
  return addMonths(currentDate, 1);
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RecurringSeriesBadge({ appointment }: RecurringSeriesBadgeProps) {
  const router = useRouter();
  const meta = parseRecurring(appointment.notes);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Close popover on outside click
  React.useEffect(() => {
    if (!popoverOpen) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popoverOpen]);

  if (!meta) return null;

  const isLastOccurrence = meta.occurrence >= meta.total;
  const nextDate = isLastOccurrence
    ? null
    : nextOccurrenceDate(appointment.date, meta.pattern);

  async function handleCancel(mode: "this" | "future") {
    setCancelling(true);
    try {
      const result = await cancelRecurringSeries(
        meta!.seriesId,
        mode,
        appointment.id
      );
      if (result.success) {
        toast.add({
          title:
            mode === "this"
              ? "Appointment cancelled"
              : `${result.cancelled} appointment${result.cancelled !== 1 ? "s" : ""} cancelled`,
          type: "success",
        });
        setPopoverOpen(false);
        router.refresh();
      } else {
        toast.add({ title: "Failed to cancel", type: "error" });
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Badge */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setPopoverOpen((v) => !v);
        }}
        className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 text-violet-400 px-2 py-0.5 text-[10px] font-semibold hover:bg-violet-500/25 transition-colors select-none"
        title="Recurring appointment — click for details"
      >
        <RefreshCw className="w-2.5 h-2.5" />
        Recurring &middot; {meta.occurrence}/{meta.total}
      </button>

      {/* Popover */}
      {popoverOpen && (
        <div
          className="absolute z-50 left-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-card shadow-xl p-3 space-y-2.5 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
              Recurring Series
            </span>
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Details */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="text-foreground font-medium">This appointment:</span>{" "}
              #{meta.occurrence} of {meta.total}
            </p>
            <p>
              <span className="text-foreground font-medium">Pattern:</span>{" "}
              {patternLabel(meta.pattern)}
            </p>
            {nextDate && (
              <p>
                <span className="text-foreground font-medium">Next occurrence:</span>{" "}
                {fmtDate(nextDate)}
              </p>
            )}
            {isLastOccurrence && (
              <p className="text-violet-400 font-medium">Last occurrence in series</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-1.5 pt-1 border-t border-border">
            <button
              type="button"
              disabled={cancelling}
              onClick={() => handleCancel("this")}
              className="w-full text-left text-xs rounded-md px-2.5 py-1.5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              Cancel this appointment only
            </button>
            {!isLastOccurrence && (
              <button
                type="button"
                disabled={cancelling}
                onClick={() => handleCancel("future")}
                className="w-full text-left text-xs rounded-md px-2.5 py-1.5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                Cancel this &amp; all future
              </button>
            )}
            <a
              href={`/dashboard/appointments?series=${meta.seriesId}`}
              className="w-full flex items-center gap-1 text-xs rounded-md px-2.5 py-1.5 text-violet-400 hover:bg-violet-500/10 transition-colors"
              onClick={() => setPopoverOpen(false)}
            >
              View all in series
              <ChevronRight className="w-3 h-3 ml-auto" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
