"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { AppointmentWithRelations } from "@/app/actions/appointments";

// ── Constants ────────────────────────────────────────────────────────────────
const START_HOUR = 8;   // 8 am
const END_HOUR   = 20;  // 8 pm
const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-orange-500/20 border-l-2 border-orange-500 text-orange-200",
  COMPLETED: "bg-green-600/20 border-l-2 border-green-500 text-green-200",
  CANCELLED: "bg-rose-600/20 border-l-2 border-rose-500 text-rose-200",
  NO_SHOW:   "bg-zinc-600/20 border-l-2 border-zinc-500 text-zinc-400",
};

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-orange-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-rose-500",
  NO_SHOW:   "bg-zinc-500",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for the Monday of the ISO week that contains `date`. */
function getWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

/** Add `days` days to a YYYY-MM-DD string and return YYYY-MM-DD. */
function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** "HH:MM" → total minutes since midnight */
function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Format "HH:MM" → "9:30 AM" */
function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Top-offset % within the calendar grid for a given time string */
function topPct(startTime: string): number {
  const mins = timeToMins(startTime) - START_HOUR * 60;
  return Math.max(0, Math.min((mins / TOTAL_MINS) * 100, 100));
}

/** Height % for a duration in minutes */
function heightPct(durationMins: number): number {
  return Math.max(2, (durationMins / TOTAL_MINS) * 100);
}

/** Sum durations from services */
function totalDuration(appt: AppointmentWithRelations): number {
  const sum = appt.services.reduce((a, s) => a + s.service.durationMins, 0);
  return sum > 0 ? sum : 30;
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

function AppointmentTooltip({ appt, onClose }: { appt: AppointmentWithRelations; onClose: () => void }) {
  return (
    <div
      className="absolute z-50 w-56 bg-card border border-border rounded-xl shadow-xl p-3 text-xs"
      style={{ top: "110%", left: 0 }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="Close"
      >
        ✕
      </button>
      <p className="font-semibold text-foreground text-sm mb-1">
        {appt.client?.name ?? "Walk-in"}
      </p>
      <p className="text-muted-foreground mb-1">Staff: {appt.staff.name}</p>
      <p className="text-muted-foreground mb-1">
        Time: {fmt12(appt.startTime)}
      </p>
      <p className="text-muted-foreground mb-1">
        Services:{" "}
        {appt.services.map((s) => s.service.name).join(", ") || "—"}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[appt.status] ?? "bg-zinc-500"}`} />
        <span className="text-muted-foreground capitalize">{appt.status.toLowerCase()}</span>
      </div>
    </div>
  );
}

// ── Block ─────────────────────────────────────────────────────────────────────

function AppointmentBlock({ appt }: { appt: AppointmentWithRelations }) {
  const [open, setOpen] = useState(false);
  const top = topPct(appt.startTime);
  const height = heightPct(totalDuration(appt));
  const style = STATUS_STYLES[appt.status] ?? STATUS_STYLES.SCHEDULED;

  return (
    <div
      className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 cursor-pointer text-[10px] leading-tight overflow-hidden select-none ${style}`}
      style={{ top: `${top}%`, height: `${height}%` }}
      onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
    >
      <p className="font-semibold truncate">{appt.client?.name ?? "Walk-in"}</p>
      <p className="truncate opacity-80">{appt.staff.name}</p>
      <p className="truncate opacity-70">
        {appt.services.map((s) => s.service.name).join(", ") || "—"}
      </p>
      <p className="opacity-60">{fmt12(appt.startTime)}</p>
      {open && (
        <AppointmentTooltip appt={appt} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface AppointmentCalendarProps {
  appointments: AppointmentWithRelations[];
  weekStart: string; // YYYY-MM-DD (always a Monday)
}

export function AppointmentCalendar({ appointments, weekStart }: AppointmentCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (newWeekStart: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("week", newWeekStart);
      params.set("view", "calendar");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  // Build an array of 7 date strings for this week (Mon … Sun)
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group appointments by date
  const byDate = new Map<string, AppointmentWithRelations[]>();
  for (const appt of appointments) {
    const list = byDate.get(appt.date) ?? [];
    list.push(appt);
    byDate.set(appt.date, list);
  }

  // Hour labels on the left gutter
  const hours: string[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    hours.push(h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(prevWeek)}
          className="px-3 py-1.5 text-sm rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
        >
          &lt; Prev week
        </button>
        <span className="text-sm font-medium text-foreground">
          {new Date(weekStart + "T00:00:00").toLocaleDateString("en", {
            month: "long",
            day: "numeric",
          })}{" "}
          –{" "}
          {new Date(addDays(weekStart, 6) + "T00:00:00").toLocaleDateString("en", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <button
          onClick={() => navigate(nextWeek)}
          className="px-3 py-1.5 text-sm rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
        >
          Next week &gt;
        </button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day header row */}
          <div className="flex">
            {/* Gutter spacer */}
            <div className="w-12 flex-shrink-0" />
            {weekDates.map((date, i) => {
              const d = new Date(date + "T00:00:00");
              const isToday = date === new Date().toISOString().split("T")[0];
              return (
                <div
                  key={date}
                  className="flex-1 text-center py-2 text-xs font-semibold border-b border-border"
                >
                  <span className={isToday ? "text-primary" : "text-muted-foreground"}>
                    {DAYS[i]}
                  </span>
                  <span
                    className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="flex">
            {/* Hour labels gutter */}
            <div className="w-12 flex-shrink-0 relative" style={{ height: "600px" }}>
              {hours.map((label, i) => (
                <div
                  key={label}
                  className="absolute right-2 text-[10px] text-muted-foreground leading-none"
                  style={{ top: `${(i / (hours.length - 1)) * 100}%`, transform: "translateY(-50%)" }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDates.map((date) => {
              const dayAppts = byDate.get(date) ?? [];
              return (
                <div
                  key={date}
                  className="flex-1 relative border-l border-border"
                  style={{ height: "600px" }}
                >
                  {/* Hour grid lines */}
                  {hours.map((label, i) => (
                    <div
                      key={label}
                      className="absolute left-0 right-0 border-t border-border/40"
                      style={{ top: `${(i / (hours.length - 1)) * 100}%` }}
                    />
                  ))}
                  {/* Appointment blocks */}
                  {dayAppts.map((appt) => (
                    <AppointmentBlock key={appt.id} appt={appt} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {Object.entries(STATUS_DOT).map(([status, dot]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
