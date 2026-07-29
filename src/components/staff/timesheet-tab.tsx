"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { manualEntry, deleteEntry } from "@/app/actions/timetracking";
import type { TimeEntry } from "@/app/actions/timetracking";
import { Plus, Trash2, Clock, ChevronLeft, ChevronRight } from "lucide-react";

interface TimesheetTabProps {
  staffId: string;
  staffName: string;
  entries: TimeEntry[];
  shifts: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  initialYear: number;
  initialMonth: number; // 0-indexed
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function TimesheetTab({
  staffId,
  staffName,
  entries,
  shifts,
  initialYear,
  initialMonth,
}: TimesheetTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual entry form state
  const [manualDate, setManualDate] = useState("");
  const [manualClockIn, setManualClockIn] = useState("");
  const [manualClockOut, setManualClockOut] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(null);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfMonth(year, month);

  // Group entries by day-of-month for this month
  const entriesByDay: Record<number, TimeEntry[]> = {};
  for (const entry of entries) {
    const [ey, em, ed] = entry.date.split("-").map(Number);
    if (ey === year && em === month + 1) {
      if (!entriesByDay[ed]) entriesByDay[ed] = [];
      entriesByDay[ed].push(entry);
    }
  }

  // Compute total hours this month
  const totalMinutesMonth = entries
    .filter((e) => {
      const [ey, em] = e.date.split("-").map(Number);
      return ey === year && em === month + 1 && e.clockOut !== null;
    })
    .reduce((sum, e) => sum + (e.totalMinutes ?? 0), 0);

  // Compute scheduled hours from Shifts (days with shifts in this month)
  let scheduledMinutes = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay();
    const shift = shifts.find((s) => s.dayOfWeek === dow);
    if (shift) {
      const [sh, sm] = shift.startTime.split(":").map(Number);
      const [eh, em] = shift.endTime.split(":").map(Number);
      scheduledMinutes += (eh * 60 + em) - (sh * 60 + sm);
    }
  }

  const selectedEntries = selectedDay ? (entriesByDay[selectedDay] ?? []) : [];

  function handleAddManual() {
    setError(null);
    if (!manualDate || !manualClockIn || !manualClockOut) {
      setError("Date, clock-in, and clock-out are all required");
      return;
    }
    const ciISO = `${manualDate}T${manualClockIn}:00`;
    const coISO = `${manualDate}T${manualClockOut}:00`;

    startTransition(async () => {
      const result = await manualEntry(
        staffId,
        manualDate,
        ciISO,
        coISO,
        manualNotes || undefined
      );
      if (result.success) {
        setShowManual(false);
        setManualDate("");
        setManualClockIn("");
        setManualClockOut("");
        setManualNotes("");
        router.refresh();
      } else {
        setError(result.error ?? "Failed to save");
      }
    });
  }

  function handleDelete(entryId: string) {
    startTransition(async () => {
      await deleteEntry(entryId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Month summary bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Hours this month</p>
          <p className="text-3xl font-bold text-primary">
            {(totalMinutesMonth / 60).toFixed(1)}h
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatMinutes(totalMinutesMonth)} recorded
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Scheduled hours</p>
          <p className="text-3xl font-bold text-foreground">
            {(scheduledMinutes / 60).toFixed(1)}h
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            based on shift schedule
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card border border-border rounded-2xl p-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-base font-bold text-foreground">
            {MONTH_NAMES[month]} {year}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEntries = entriesByDay[day] ?? [];
            const hasEntries = dayEntries.length > 0;
            const totalMins = dayEntries.reduce(
              (sum, e) => sum + (e.totalMinutes ?? 0),
              0
            );
            const isSelected = selectedDay === day;
            const isToday =
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === day;

            return (
              <button
                key={day}
                onClick={() =>
                  setSelectedDay(isSelected ? null : day)
                }
                className={`
                  relative flex flex-col items-center justify-start rounded-xl p-1.5 min-h-[56px] text-xs transition-all
                  ${isSelected ? "ring-2 ring-primary bg-primary/10" : "hover:bg-secondary/60"}
                  ${isToday && !isSelected ? "bg-primary/5 ring-1 ring-primary/30" : ""}
                `}
              >
                <span
                  className={`font-semibold mb-0.5 ${
                    isToday ? "text-primary" : "text-foreground"
                  }`}
                >
                  {day}
                </span>
                {hasEntries && (
                  <span className="text-[10px] font-medium text-emerald-500 leading-tight">
                    {(totalMins / 60).toFixed(1)}h
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      {selectedDay !== null && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">
              {MONTH_NAMES[month]} {selectedDay}, {year}
            </h4>
            <button
              onClick={() => {
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
                setManualDate(dateStr);
                setShowManual(true);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add entry
            </button>
          </div>

          {selectedEntries.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <Clock className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No entries for this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 bg-secondary/40 rounded-xl p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {formatTime(entry.clockIn)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm font-medium text-foreground">
                        {entry.clockOut
                          ? formatTime(entry.clockOut)
                          : "Active"}
                      </span>
                    </div>
                    {entry.totalMinutes !== null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatMinutes(entry.totalMinutes)}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={isPending}
                    className="p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add manual entry form */}
      {showManual && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h4 className="font-semibold text-foreground">Add Manual Entry</h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium">Date</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium">Clock In</label>
              <input
                type="time"
                value={manualClockIn}
                onChange={(e) => setManualClockIn(e.target.value)}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium">Clock Out</label>
              <input
                type="time"
                value={manualClockOut}
                onChange={(e) => setManualClockOut(e.target.value)}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium">
              Notes (optional)
            </label>
            <input
              type="text"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="e.g. Overtime, adjusted entry..."
              className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleAddManual}
              disabled={isPending}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save Entry"}
            </button>
            <button
              onClick={() => {
                setShowManual(false);
                setError(null);
              }}
              className="px-5 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Global add button when no day selected */}
      {selectedDay === null && !showManual && (
        <button
          onClick={() => setShowManual(true)}
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add manual entry
        </button>
      )}
    </div>
  );
}
