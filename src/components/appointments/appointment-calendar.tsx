"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { AppointmentWithRelations } from "@/app/actions/appointments";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";

// ── Helpers ────────────────────────────────────────────────────────────────────

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
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ── Main Component ────────────────────────────────────────────────────────────

interface AppointmentCalendarProps {
  appointments: AppointmentWithRelations[];
  /** YYYY-MM-DD — always a Monday */
  weekStart: string;
}

export function AppointmentCalendar({
  appointments,
  weekStart,
}: AppointmentCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // "week" or "day"
  const [calMode, setCalMode] = useState<"week" | "day">("week");

  // Selected day for day view — defaults to today if it falls within the week,
  // otherwise the week's Monday.
  const today = new Date().toISOString().split("T")[0];
  const weekMonday = getWeekMonday(new Date(weekStart + "T00:00:00"));
  const weekSunday = addDays(weekMonday, 6);
  const defaultDay =
    today >= weekMonday && today <= weekSunday ? today : weekMonday;
  const [selectedDay, setSelectedDay] = useState<string>(defaultDay);

  const navigate = useCallback(
    (newWeekStart: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("week", newWeekStart);
      params.set("view", "calendar");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Filter appointments for the selected day (used in day view)
  const dayAppointments = appointments.filter(
    (appt) => appt.date === selectedDay
  );

  // Days of the week for the day-picker tab bar
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col gap-4">
      {/* View mode toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            onClick={() => setCalMode("week")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              calMode === "week"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setCalMode("day")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              calMode === "day"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Day
          </button>
        </div>

        {/* Day picker — only shown in day mode */}
        {calMode === "day" && (
          <div className="flex rounded-lg overflow-hidden border border-border">
            {weekDates.map((date) => {
              const d = new Date(date + "T00:00:00");
              const isActive = date === selectedDay;
              const isToday = date === today;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDay(date)}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors flex flex-col items-center min-w-[36px] ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="text-[10px] opacity-70">
                    {d.toLocaleDateString("en", { weekday: "short" }).slice(0, 2)}
                  </span>
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mt-0.5 ${
                      isToday && !isActive ? "text-primary font-bold" : ""
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Week or Day view */}
      {calMode === "week" ? (
        <WeekView
          appointments={appointments}
          weekStart={weekStart}
          onNavigate={navigate}
        />
      ) : (
        <DayView
          appointments={dayAppointments}
          date={selectedDay}
          splitByStaff
        />
      )}
    </div>
  );
}
