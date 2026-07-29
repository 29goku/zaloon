"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { updateShift, removeShift } from "@/app/actions/shifts";
import { Loader2, X } from "lucide-react";

// ─── Generate 30-min increment time options from 6:00 to 22:00 ───────────────

function buildTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 6; h <= 22; h++) {
    options.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 22) options.push(`${String(h).padStart(2, "0")}:30`);
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShiftCellPopoverProps {
  staffId: string;
  /** 0=Sun, 1=Mon, …, 6=Sat */
  dayOfWeek: number;
  dayLabel: string;
  currentShift?: { startTime: string; endTime: string } | null;
  colorBg: string;
  colorText: string;
  colorBorder: string;
  isToday: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShiftCellPopover({
  staffId,
  dayOfWeek,
  dayLabel,
  currentShift,
  colorBg,
  colorText,
  colorBorder,
  isToday,
}: ShiftCellPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState(
    currentShift?.startTime ?? "09:00"
  );
  const [endTime, setEndTime] = useState(currentShift?.endTime ?? "18:00");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateShift(staffId, dayOfWeek, startTime, endTime);
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeShift(staffId, dayOfWeek);
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const triggerLabel = currentShift
    ? `${currentShift.startTime}–${currentShift.endTime}`
    : "Day off";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`
            w-full rounded-lg px-1.5 py-1 text-[11px] font-medium leading-tight transition-all
            hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
            ${isToday ? "ring-1 ring-primary/40" : ""}
            ${
              currentShift
                ? `flex flex-col items-center justify-center ${colorBg} ${colorText} border ${colorBorder}`
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
            }
          `}
          title={`Edit ${dayLabel} shift`}
        >
          {currentShift ? (
            <>
              <span>{currentShift.startTime}</span>
              <span className="opacity-50">–</span>
              <span>{currentShift.endTime}</span>
            </>
          ) : (
            <span>Day off</span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        className="w-56 p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30">
          <span className="text-xs font-semibold text-foreground">
            {dayLabel} shift
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3 space-y-3">
          {/* Time selects */}
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Start
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                End
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 h-7 text-xs"
            >
              {isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>

            {currentShift && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                disabled={isPending}
                className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
                title="Set as day off"
              >
                <X className="w-3 h-3" />
                <span className="sr-only">Set day off</span>
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
