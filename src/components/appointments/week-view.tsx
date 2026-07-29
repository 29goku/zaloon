"use client";

import { useState } from "react";
import type { AppointmentWithRelations } from "@/app/actions/appointments";
import { CalendarDetailSheet } from "./calendar-detail-sheet";
import { timeSlotsOverlap } from "@/lib/conflict-detection";

// ── Constants ──────────────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_CHIP: Record<string, string> = {
  SCHEDULED: "bg-blue-500/20 border-l-2 border-blue-500 text-blue-200",
  COMPLETED: "bg-green-600/20 border-l-2 border-green-500 text-green-200",
  CANCELLED: "bg-rose-600/20 border-l-2 border-rose-500 text-rose-200",
  NO_SHOW:   "bg-zinc-600/20 border-l-2 border-zinc-500 text-zinc-400",
};

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-blue-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-rose-500",
  NO_SHOW:   "bg-zinc-500",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Add `days` days to a YYYY-MM-DD string */
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** "HH:MM" → "9:30 AM" */
function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Overlap detection ──────────────────────────────────────────────────────────

/** Returns a Set of appointment IDs that overlap with another appointment from
 *  the same staff member on the same day. Excludes CANCELLED appointments. */
function findOverlappingIds(appts: AppointmentWithRelations[]): Set<string> {
  const overlapping = new Set<string>();
  const active = appts.filter((a) => a.status !== "CANCELLED");

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      // Only flag if same staff member
      if (a.Staff.id !== b.Staff.id) continue;

      const aDur = a.AppointmentService.reduce((s, as) => s + as.Service.durationMins, 0) || 30;
      const bDur = b.AppointmentService.reduce((s, as) => s + as.Service.durationMins, 0) || 30;

      const aEnd = addMinutesToTime(a.startTime, aDur);
      const bEnd = addMinutesToTime(b.startTime, bDur);

      if (
        timeSlotsOverlap(
          { startTime: a.startTime, endTime: aEnd, date: a.date },
          { startTime: b.startTime, endTime: bEnd, date: b.date }
        )
      ) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }
  return overlapping;
}

function addMinutesToTime(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// ── Appointment chip ───────────────────────────────────────────────────────────

function AppointmentChip({
  appt,
  onClick,
  isConflicting,
}: {
  appt: AppointmentWithRelations;
  onClick: (appt: AppointmentWithRelations) => void;
  isConflicting?: boolean;
}) {
  const chipStyle = STATUS_CHIP[appt.status] ?? STATUS_CHIP.SCHEDULED;
  const serviceName =
    appt.AppointmentService.length > 0
      ? appt.AppointmentService[0].Service.name
      : "—";
  const extraCount = appt.AppointmentService.length - 1;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(appt)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(appt);
        }
      }}
      className={`rounded-md px-1.5 py-1 cursor-pointer text-[10px] leading-tight overflow-hidden select-none mb-0.5 ${chipStyle}${isConflicting ? " border-2 border-red-500" : ""}`}
      title={isConflicting ? "Conflict: overlapping appointment for same staff" : undefined}
    >
      <p className="font-semibold truncate">{appt.Client?.name ?? "Walk-in"}</p>
      <p className="truncate opacity-80">{fmt12(appt.startTime)}</p>
      <p className="truncate opacity-70">
        {serviceName}
        {extraCount > 0 && (
          <span className="opacity-60"> +{extraCount}</span>
        )}
      </p>
    </div>
  );
}

// ── WeekView ───────────────────────────────────────────────────────────────────

export interface WeekViewProps {
  /** All appointments for the week */
  appointments: AppointmentWithRelations[];
  /** YYYY-MM-DD — Monday of the displayed week */
  weekStart: string;
  onNavigate: (newWeekStart: string) => void;
}

export function WeekView({ appointments, weekStart, onNavigate }: WeekViewProps) {
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleClick(appt: AppointmentWithRelations) {
    setSelected(appt);
    setSheetOpen(true);
  }

  const today = new Date().toISOString().split("T")[0];

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group appointments by date
  const byDate = new Map<string, AppointmentWithRelations[]>();
  for (const appt of appointments) {
    const list = byDate.get(appt.date) ?? [];
    list.push(appt);
    byDate.set(appt.date, list);
  }

  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const rangeLabel = `${new Date(weekStart + "T00:00:00").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  })} – ${new Date(addDays(weekStart, 6) + "T00:00:00").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate(prevWeek)}
          className="px-3 py-1.5 text-sm rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
        >
          &lt; Prev
        </button>
        <span className="text-sm font-medium text-foreground">{rangeLabel}</span>
        <button
          onClick={() => onNavigate(nextWeek)}
          className="px-3 py-1.5 text-sm rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
        >
          Next &gt;
        </button>
      </div>

      {/* 7-column grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[560px] grid grid-cols-7 border border-border rounded-xl overflow-hidden">
          {/* Day headers */}
          {weekDates.map((date, i) => {
            const d = new Date(date + "T00:00:00");
            const isToday = date === today;
            return (
              <div
                key={date}
                className={`text-center py-2 border-b border-border text-xs font-semibold ${
                  isToday ? "bg-primary/10" : ""
                }`}
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

          {/* Appointment cells */}
          {weekDates.map((date) => {
            const dayAppts = (byDate.get(date) ?? []).sort((a, b) =>
              a.startTime.localeCompare(b.startTime)
            );
            const overlappingIds = findOverlappingIds(dayAppts);
            const isToday = date === today;
            return (
              <div
                key={date}
                className={`min-h-[120px] p-1 border-l border-border first:border-l-0 align-top ${
                  isToday ? "bg-primary/5" : ""
                }`}
              >
                {dayAppts.length === 0 ? (
                  <div className="h-full min-h-[80px] flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/40">—</span>
                  </div>
                ) : (
                  dayAppts.map((appt) => (
                    <AppointmentChip
                      key={appt.id}
                      appt={appt}
                      onClick={handleClick}
                      isConflicting={overlappingIds.has(appt.id)}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {Object.entries(STATUS_DOT).map(([status, dot]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
            {status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}
          </span>
        ))}
      </div>

      {/* Detail sheet */}
      <CalendarDetailSheet
        appointment={selected}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setTimeout(() => setSelected(null), 300);
        }}
      />
    </div>
  );
}
