"use client";

import { useState, useTransition } from "react";
import { setStaffShifts } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2 } from "lucide-react";

const DAYS = [
  { label: "Monday", dayOfWeek: 1 },
  { label: "Tuesday", dayOfWeek: 2 },
  { label: "Wednesday", dayOfWeek: 3 },
  { label: "Thursday", dayOfWeek: 4 },
  { label: "Friday", dayOfWeek: 5 },
  { label: "Saturday", dayOfWeek: 6 },
  { label: "Sunday", dayOfWeek: 0 },
];

interface DayState {
  active: boolean;
  startTime: string;
  endTime: string;
}

interface ExistingShift {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ShiftEditorProps {
  staffId: string;
  initialShifts?: ExistingShift[];
}

function buildInitialState(initialShifts: ExistingShift[]): Record<number, DayState> {
  const state: Record<number, DayState> = {};
  for (const day of DAYS) {
    const existing = initialShifts.find((s) => s.dayOfWeek === day.dayOfWeek);
    state[day.dayOfWeek] = {
      active: !!existing,
      startTime: existing?.startTime ?? "09:00",
      endTime: existing?.endTime ?? "18:00",
    };
  }
  return state;
}

export function ShiftEditor({ staffId, initialShifts = [] }: ShiftEditorProps) {
  const [days, setDays] = useState<Record<number, DayState>>(() =>
    buildInitialState(initialShifts)
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setDayField<K extends keyof DayState>(
    dayOfWeek: number,
    field: K,
    value: DayState[K]
  ) {
    setSaved(false);
    setError(null);
    setDays((prev) => ({
      ...prev,
      [dayOfWeek]: { ...prev[dayOfWeek], [field]: value },
    }));
  }

  function handleSave() {
    const shifts = DAYS.filter((d) => days[d.dayOfWeek]?.active).map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: days[d.dayOfWeek].startTime,
      endTime: days[d.dayOfWeek].endTime,
    }));

    startTransition(async () => {
      const result = await setStaffShifts(staffId, shifts);
      if (result.success) {
        setSaved(true);
        setError(null);
      } else {
        setError(result.error);
        setSaved(false);
      }
    });
  }

  return (
    <div className="space-y-3">
      {DAYS.map((day) => {
        const state = days[day.dayOfWeek];
        return (
          <div
            key={day.dayOfWeek}
            className={`rounded-xl border px-4 py-3 transition-colors ${
              state.active
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-secondary/20"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              {/* Day toggle */}
              <div className="flex items-center gap-3 min-w-[110px]">
                <Switch
                  id={`day-${day.dayOfWeek}`}
                  checked={state.active}
                  onCheckedChange={(checked) => setDayField(day.dayOfWeek, "active", checked)}
                  disabled={isPending}
                />
                <Label
                  htmlFor={`day-${day.dayOfWeek}`}
                  className={`text-sm font-semibold cursor-pointer ${
                    state.active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {day.label}
                </Label>
              </div>

              {/* Time range */}
              {state.active ? (
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <Input
                    type="time"
                    value={state.startTime}
                    onChange={(e) => setDayField(day.dayOfWeek, "startTime", e.target.value)}
                    disabled={isPending}
                    className="w-32 text-sm h-8"
                    aria-label={`${day.label} start time`}
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input
                    type="time"
                    value={state.endTime}
                    onChange={(e) => setDayField(day.dayOfWeek, "endTime", e.target.value)}
                    disabled={isPending}
                    className="w-32 text-sm h-8"
                    aria-label={`${day.label} end time`}
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground ml-auto">Day off</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Save button + feedback */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          onClick={handleSave}
          disabled={isPending}
          size="sm"
          className="min-w-[100px]"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Shifts"
          )}
        </Button>

        {saved && !isPending && (
          <span className="flex items-center gap-1.5 text-sm text-primary">
            <CheckCircle2 className="w-4 h-4" />
            Saved
          </span>
        )}

        {error && !isPending && (
          <span className="text-sm text-destructive">{error}</span>
        )}
      </div>
    </div>
  );
}
