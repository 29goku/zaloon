"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyShiftToAll, setStandardWeek } from "@/app/actions/shifts";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Loader2, CalendarRange, Settings2, CheckCircle2, X } from "lucide-react";

// ─── Generate 30-min increment time options ────────────────────────────────────

function buildTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 6; h <= 22; h++) {
    options.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 22) options.push(`${String(h).padStart(2, "0")}:30`);
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

const DAYS = [
  { label: "Monday", dayOfWeek: 1 },
  { label: "Tuesday", dayOfWeek: 2 },
  { label: "Wednesday", dayOfWeek: 3 },
  { label: "Thursday", dayOfWeek: 4 },
  { label: "Friday", dayOfWeek: 5 },
  { label: "Saturday", dayOfWeek: 6 },
  { label: "Sunday", dayOfWeek: 0 },
];

// ─── Apply to All Staff Popover ───────────────────────────────────────────────

function ApplyToAllPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleApply() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await applyShiftToAll(selectedDay, startTime, endTime);
      if (result.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => {
          setSuccess(false);
          setOpen(false);
        }, 1200);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs h-8"
        >
          <CalendarRange className="w-3.5 h-3.5" />
          Apply to all staff
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30">
          <span className="text-xs font-semibold text-foreground">
            Apply shift to all staff
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
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Day
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            >
              {DAYS.map((d) => (
                <option key={d.dayOfWeek} value={d.dayOfWeek}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
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

          {success && (
            <p className="text-xs text-primary flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Applied!
            </p>
          )}

          <Button
            size="sm"
            onClick={handleApply}
            disabled={isPending || success}
            className="w-full h-7 text-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                Applying…
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1.5" />
                Applied!
              </>
            ) : (
              "Apply to all staff"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Set Standard Week Button ─────────────────────────────────────────────────

function SetStandardWeekButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !confirm(
        "Set standard week for ALL staff? (Mon–Fri 9:00–18:00, Sat 9:00–15:00, Sun off)\n\nThis will overwrite all existing shifts."
      )
    )
      return;

    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await setStandardWeek();
      if (result.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending || success}
        className="gap-2 text-xs h-8"
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : success ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Settings2 className="w-3.5 h-3.5" />
        )}
        {success ? "Standard week set!" : "Set standard week"}
      </Button>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}

// ─── Combined toolbar ─────────────────────────────────────────────────────────

export function ScheduleBulkTools() {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <ApplyToAllPopover />
      <SetStandardWeekButton />
    </div>
  );
}
