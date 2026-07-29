"use client";

import { useState } from "react";
import type { AppointmentWithRelations } from "@/app/actions/appointments";
import { CalendarDetailSheet } from "./calendar-detail-sheet";

// ── Constants ──────────────────────────────────────────────────────────────────
const START_HOUR = 7;  // 7 am
const END_HOUR   = 21; // 9 pm
const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;
const GRID_HEIGHT = 840; // px — 1px per min

// ── Status colour maps ─────────────────────────────────────────────────────────
const STATUS_BG: Record<string, string> = {
  SCHEDULED: "bg-blue-500/20 border-l-2 border-blue-500 text-blue-200",
  COMPLETED: "bg-green-600/20 border-l-2 border-green-500 text-green-200",
  CANCELLED: "bg-rose-600/20 border-l-2 border-rose-500 text-rose-200",
  NO_SHOW:   "bg-zinc-600/20 border-l-2 border-zinc-500 text-zinc-400",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** "HH:MM" → minutes since midnight */
function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** "HH:MM" → "9:30 AM" */
function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** top offset in px for a time string */
function topPx(time: string): number {
  const mins = timeToMins(time) - START_HOUR * 60;
  return Math.max(0, Math.min((mins / TOTAL_MINS) * GRID_HEIGHT, GRID_HEIGHT));
}

/** height in px for duration in minutes */
function heightPx(durationMins: number): number {
  return Math.max(24, (durationMins / TOTAL_MINS) * GRID_HEIGHT);
}

/** sum of service durations, fallback 30 min */
function totalDuration(appt: AppointmentWithRelations): number {
  const sum = appt.AppointmentService.reduce(
    (a, s) => a + s.Service.durationMins,
    0
  );
  return sum > 0 ? sum : 30;
}

// ── Appointment block ──────────────────────────────────────────────────────────

function AppointmentBlock({
  appt,
  onClick,
  columnCount,
  columnIndex,
}: {
  appt: AppointmentWithRelations;
  onClick: (appt: AppointmentWithRelations) => void;
  columnCount: number;
  columnIndex: number;
}) {
  const top = topPx(appt.startTime);
  const height = heightPx(totalDuration(appt));
  const style = STATUS_BG[appt.status] ?? STATUS_BG.SCHEDULED;

  // Lay out overlapping appointments side-by-side
  const widthPct = 100 / columnCount;
  const leftPct = widthPct * columnIndex;

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
      className={`absolute rounded-md px-1.5 py-0.5 cursor-pointer text-[10px] leading-tight overflow-hidden select-none ${style}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `${leftPct}%`,
        width: `calc(${widthPct}% - 2px)`,
      }}
    >
      <p className="font-semibold truncate">{appt.Client?.name ?? "Walk-in"}</p>
      <p className="truncate opacity-80">{appt.Staff.name}</p>
      <p className="truncate opacity-70">
        {appt.AppointmentService.map((s) => s.Service.name).join(", ") || "—"}
      </p>
      <p className="opacity-60">{fmt12(appt.startTime)}</p>
    </div>
  );
}

// ── Staff column layout ────────────────────────────────────────────────────────

/**
 * Simple overlap detection: group appointments that share time ranges into
 * "collision groups" so we can assign each a column index.
 */
function assignColumns(
  appts: AppointmentWithRelations[]
): { appt: AppointmentWithRelations; col: number; colCount: number }[] {
  // Sort by start time
  const sorted = [...appts].sort(
    (a, b) => timeToMins(a.startTime) - timeToMins(b.startTime)
  );

  type Slot = {
    appt: AppointmentWithRelations;
    col: number;
    endMins: number;
  };

  const results: Slot[] = [];
  const columns: number[] = []; // tracks end time of last appointment in each column

  for (const appt of sorted) {
    const startMins = timeToMins(appt.startTime);
    const dur = totalDuration(appt);
    const endMins = startMins + dur;

    // Find first free column
    let col = columns.findIndex((end) => end <= startMins);
    if (col === -1) {
      col = columns.length;
      columns.push(endMins);
    } else {
      columns[col] = endMins;
    }

    results.push({ appt, col, endMins });
  }

  const maxCol = columns.length;

  return results.map(({ appt, col }) => ({
    appt,
    col,
    colCount: maxCol,
  }));
}

// ── DayView ────────────────────────────────────────────────────────────────────

export interface DayViewProps {
  /** All appointments for the selected date, possibly across multiple staff */
  appointments: AppointmentWithRelations[];
  /** YYYY-MM-DD */
  date: string;
  /** If true, show per-staff columns instead of a single merged column */
  splitByStaff?: boolean;
}

export function DayView({ appointments, date, splitByStaff = false }: DayViewProps) {
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleClick(appt: AppointmentWithRelations) {
    setSelected(appt);
    setSheetOpen(true);
  }

  // Hour labels
  const hours: string[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    hours.push(
      h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`
    );
  }

  // Build columns: either split by staff or a single merged column
  let staffColumns: { label: string; appts: AppointmentWithRelations[] }[];

  if (splitByStaff) {
    const byStaff = new Map<string, AppointmentWithRelations[]>();
    for (const appt of appointments) {
      const key = appt.Staff.id;
      if (!byStaff.has(key)) byStaff.set(key, []);
      byStaff.get(key)!.push(appt);
    }
    staffColumns = Array.from(byStaff.entries()).map(([, appts]) => ({
      label: appts[0].Staff.name,
      appts,
    }));
    if (staffColumns.length === 0) staffColumns = [{ label: "All Staff", appts: [] }];
  } else {
    staffColumns = [{ label: "All Staff", appts: appointments }];
  }

  const todayLabel = new Date(date + "T00:00:00").toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-2">
      {/* Date heading */}
      <p className="text-sm font-semibold text-foreground px-1">{todayLabel}</p>

      <div className="overflow-x-auto">
        <div className="flex min-w-[500px]">
          {/* Hour gutter */}
          <div
            className="w-12 flex-shrink-0 relative"
            style={{ height: `${GRID_HEIGHT}px` }}
          >
            {hours.map((label, i) => (
              <div
                key={label}
                className="absolute right-2 text-[10px] text-muted-foreground leading-none"
                style={{
                  top: `${(i / (hours.length - 1)) * GRID_HEIGHT}px`,
                  transform: "translateY(-50%)",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Staff columns */}
          {staffColumns.map(({ label, appts }) => {
            const placed = assignColumns(appts);
            return (
              <div key={label} className="flex-1 flex flex-col">
                {/* Column header */}
                <div className="text-center text-xs font-semibold text-muted-foreground pb-1 border-b border-border">
                  {label}
                </div>
                {/* Time grid */}
                <div
                  className="relative border-l border-border"
                  style={{ height: `${GRID_HEIGHT}px` }}
                >
                  {/* Hour lines */}
                  {hours.map((hlabel, i) => (
                    <div
                      key={hlabel}
                      className="absolute left-0 right-0 border-t border-border/40"
                      style={{
                        top: `${(i / (hours.length - 1)) * GRID_HEIGHT}px`,
                      }}
                    />
                  ))}
                  {/* Half-hour lines */}
                  {hours.slice(0, -1).map((hlabel, i) => (
                    <div
                      key={`half-${hlabel}`}
                      className="absolute left-0 right-0 border-t border-border/20"
                      style={{
                        top: `${((i + 0.5) / (hours.length - 1)) * GRID_HEIGHT}px`,
                      }}
                    />
                  ))}
                  {/* Appointment blocks */}
                  {placed.map(({ appt, col, colCount }) => (
                    <AppointmentBlock
                      key={appt.id}
                      appt={appt}
                      onClick={handleClick}
                      columnCount={colCount}
                      columnIndex={col}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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
