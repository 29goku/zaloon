"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BlackoutDate } from "@/app/actions/settings";
import { addBlackoutDate, removeBlackoutDate } from "@/app/actions/settings";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isDateBlocked(date: Date, blackouts: BlackoutDate[]): { blocked: boolean; recurring: boolean } {
  const dateStr = toDateStr(date);
  const year = date.getFullYear();

  for (const b of blackouts) {
    if (b.recurring) {
      // Match month-day only
      const startMD = b.startDate.slice(5); // "MM-DD"
      const endMD = b.endDate.slice(5);
      const checkMD = dateStr.slice(5);
      // Build synthetic date range for current year
      const synthStart = `${year}-${startMD}`;
      const synthEnd = `${year}-${endMD}`;
      if (checkMD >= synthStart.slice(5) && checkMD <= synthEnd.slice(5)) {
        return { blocked: true, recurring: true };
      }
    } else {
      if (dateStr >= b.startDate && dateStr <= b.endDate) {
        return { blocked: true, recurring: false };
      }
    }
  }
  return { blocked: false, recurring: false };
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateType(b: BlackoutDate): string {
  if (b.recurring) return "Recurring";
  if (b.startDate === b.endDate) return "Single day";
  return "Range";
}

// ─── Mini calendar grid ───────────────────────────────────────────────────────

function CalendarMonth({
  year,
  month,
  blackouts,
  onDayClick,
}: {
  year: number;
  month: number; // 0-based
  blackouts: BlackoutDate[];
  onDayClick: (dateStr: string) => void;
}) {
  const firstOfMonth = new Date(year, month, 1);
  const startDow = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: Array<number | null> = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4 select-none">
      <p className="text-sm font-semibold text-foreground mb-3 text-center">{monthLabel}</p>
      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-0.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const date = new Date(year, month, day);
          const dateStr = toDateStr(date);
          const { blocked, recurring } = isDateBlocked(date, blackouts);
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDayClick(dateStr)}
              title={blocked ? "Click to unblock this date" : "Click to block this date"}
              className={[
                "mx-auto w-8 h-8 rounded-full text-xs flex items-center justify-center transition-all duration-150 font-medium",
                blocked && recurring
                  ? "bg-amber-500/25 text-amber-800 dark:text-amber-300 hover:bg-amber-500/40"
                  : blocked
                  ? "bg-destructive/25 text-destructive hover:bg-destructive/40"
                  : "text-foreground hover:bg-accent",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  initialBlackouts: BlackoutDate[];
}

export function BlackoutDatesClient({ initialBlackouts }: Props) {
  const router = useRouter();
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>(initialBlackouts);
  const [isPending, startTransition] = useTransition();

  // Calendar view: current month + next month
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth();
  const nextMonthDate = new Date(thisYear, thisMonth + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();

  // Add form state
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formRecurring, setFormRecurring] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  function handleDayClick(dateStr: string) {
    // Check if this date is already blocked by a single-day entry
    const existing = blackouts.find(
      (b) => !b.recurring && b.startDate === dateStr && b.endDate === dateStr
    );
    if (existing) {
      // Unblock it
      handleRemove(existing.id);
    } else {
      // Pre-fill the add form
      setFormStartDate(dateStr);
      setFormEndDate(dateStr);
      setFormError(null);
      setFormSuccess(false);
    }
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await removeBlackoutDate(id);
      if (res.success) {
        setBlackouts((prev) => prev.filter((b) => b.id !== id));
        router.refresh();
      }
    });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    if (!formStartDate) { setFormError("Start date is required"); return; }
    if (!formEndDate) { setFormError("End date is required"); return; }
    if (formEndDate < formStartDate) { setFormError("End date must be on or after start date"); return; }

    startTransition(async () => {
      const res = await addBlackoutDate({
        startDate: formStartDate,
        endDate: formEndDate,
        reason: formReason || undefined,
        recurring: formRecurring,
      });
      if (res.success) {
        setFormSuccess(true);
        setFormStartDate("");
        setFormEndDate("");
        setFormReason("");
        setFormRecurring(false);
        // Optimistically add the new entry — router.refresh() will sync authoritative state
        const tempEntry: BlackoutDate = {
          id: `temp-${Date.now()}`,
          startDate: formStartDate,
          endDate: formEndDate,
          reason: formReason || undefined,
          recurring: formRecurring,
        };
        setBlackouts((prev) => [...prev, tempEntry]);
        router.refresh();
      } else {
        setFormError(res.error ?? "Failed to add blackout date");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-destructive/25 border border-destructive/40 inline-block" />
          <span className="text-xs text-muted-foreground">Blocked (one-time)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-amber-500/25 border border-amber-500/40 inline-block" />
          <span className="text-xs text-muted-foreground">Recurring (yearly)</span>
        </div>
        <p className="text-xs text-muted-foreground">Click a date to block or unblock it quickly.</p>
      </div>

      {/* ── 2-month calendar ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CalendarMonth year={thisYear} month={thisMonth} blackouts={blackouts} onDayClick={handleDayClick} />
        <CalendarMonth year={nextYear} month={nextMonth} blackouts={blackouts} onDayClick={handleDayClick} />
      </div>

      {/* ── Add Blackout form ──────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Add Blackout Date</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Start Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                End Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={formEndDate}
                min={formStartDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Reason <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="e.g. Public holiday, Staff training, Renovation..."
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formRecurring}
              onChange={(e) => setFormRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground">
              Repeat every year on these dates
              <span className="ml-1 text-xs text-muted-foreground">(e.g. public holiday)</span>
            </span>
          </label>

          {formError && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{formError}</p>
          )}
          {formSuccess && (
            <p className="text-sm text-green-700 dark:text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">Blackout date added successfully.</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Add Blackout Date"}
          </button>
        </form>
      </div>

      {/* ── Blackout list table ────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">All Blackout Dates</h2>
        </div>

        {blackouts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No blackout dates configured.</p>
            <p className="text-xs mt-1">Add one above to block dates from online booking.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date / Range</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {blackouts.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                      {b.startDate === b.endDate
                        ? formatDate(b.startDate)
                        : `${formatDate(b.startDate)} – ${formatDate(b.endDate)}`}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {b.reason ?? <span className="italic text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={[
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          b.recurring
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : b.startDate === b.endDate
                            ? "bg-destructive/15 text-destructive"
                            : "bg-blue-500/15 text-blue-700 dark:text-blue-400",
                        ].join(" ")}
                      >
                        {getDateType(b)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(b.id)}
                        disabled={isPending}
                        className="text-xs text-destructive hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
