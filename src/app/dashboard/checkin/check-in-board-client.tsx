"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  UserCheck,
  CheckCircle2,
  UserX,
  Clock,
  CalendarDays,
  Users,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { checkInClient, completeAppointment, markNoShow } from "@/app/actions/appointments";
import { QuickActionPanel, type QuickActionAppointment } from "@/components/appointments/quick-action-panel";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

type Service = { id: string; name: string; durationMins: number; price: number };
type AppointmentEntry = {
  id: string;
  status: string;
  startTime: string;
  date: string;
  notes: string | null;
  totalAmount: number;
  client: { id: string; name: string; phone?: string | null } | null;
  staff: { id: string; name: string };
  services: { service: Service }[];
};

interface CheckInBoardClientProps {
  appointments: AppointmentEntry[];
  currency: string;
  today: string;
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  COMPLETED: "bg-green-500",
  NO_SHOW: "bg-zinc-500",
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  SCHEDULED: "text-blue-400",
  IN_PROGRESS: "text-amber-400",
  COMPLETED: "text-green-400",
  CANCELLED: "text-zinc-400",
  NO_SHOW: "text-rose-400",
};

const STATUS_BG: Record<string, string> = {
  SCHEDULED: "bg-blue-500/10 border-blue-500/20",
  IN_PROGRESS: "bg-amber-500/10 border-amber-500/20",
  COMPLETED: "bg-green-500/10 border-green-500/20",
  CANCELLED: "bg-zinc-500/10 border-zinc-500/20",
  NO_SHOW: "bg-rose-500/10 border-rose-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getCheckedInAt(notes: string | null): string | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    return parsed.__checkedInAt ?? null;
  } catch {
    return null;
  }
}

function getElapsedLabel(checkedInAt: string): string {
  const diff = Math.floor((Date.now() - new Date(checkedInAt).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff === 1) return "1 min ago";
  return `${diff} min ago`;
}

// ── Timeline component ─────────────────────────────────────────────────────────

const HOUR_START = 8; // 8am
const HOUR_END = 21; // 9pm
const TOTAL_HOURS = HOUR_END - HOUR_START;

function TimelineGrid({
  appointments,
  onSelect,
}: {
  appointments: AppointmentEntry[];
  onSelect: (appt: AppointmentEntry) => void;
}) {
  // Group by staff
  const staffMap = new Map<string, { name: string; appts: AppointmentEntry[] }>();
  for (const appt of appointments) {
    const key = appt.staff.id;
    if (!staffMap.has(key)) {
      staffMap.set(key, { name: appt.staff.name, appts: [] });
    }
    staffMap.get(key)!.appts.push(appt);
  }

  const staffRows = Array.from(staffMap.entries());

  // Hours axis
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Hour axis */}
        <div className="flex ml-24 mb-1">
          {hours.map((h) => (
            <div
              key={h}
              className="text-[10px] text-muted-foreground"
              style={{ width: `${100 / TOTAL_HOURS}%` }}
            >
              {h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`}
            </div>
          ))}
        </div>

        {/* Staff rows */}
        {staffRows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No appointments today
          </div>
        ) : (
          staffRows.map(([staffId, { name, appts }]) => (
            <div key={staffId} className="flex items-center mb-2 group">
              {/* Staff label */}
              <div className="w-24 flex-shrink-0 pr-2">
                <p className="text-xs font-semibold text-foreground truncate text-right">
                  {name}
                </p>
              </div>
              {/* Timeline track */}
              <div className="relative flex-1 h-9 bg-secondary/30 rounded-md">
                {appts.map((appt) => {
                  const totalDuration = appt.services.reduce(
                    (sum, s) => sum + s.service.durationMins,
                    0
                  ) || 30;
                  const startMin = timeToMinutes(appt.startTime);
                  const leftPct =
                    ((startMin - HOUR_START * 60) / (TOTAL_HOURS * 60)) * 100;
                  const widthPct = (totalDuration / (TOTAL_HOURS * 60)) * 100;

                  if (leftPct < 0 || leftPct > 100) return null;

                  return (
                    <button
                      key={appt.id}
                      onClick={() => onSelect(appt)}
                      title={`${appt.client?.name ?? "Walk-in"} — ${appt.services.map((s) => s.service.name).join(", ")}`}
                      className={cn(
                        "absolute top-1 h-7 rounded text-[9px] font-bold px-1 truncate border cursor-pointer hover:brightness-110 transition-all",
                        STATUS_BG[appt.status] ?? "bg-muted border-border",
                        STATUS_TEXT_COLORS[appt.status] ?? "text-foreground"
                      )}
                      style={{
                        left: `${Math.max(0, leftPct)}%`,
                        width: `${Math.min(widthPct, 100 - Math.max(0, leftPct))}%`,
                      }}
                    >
                      {appt.client?.name ?? "Walk-in"}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Appointment card ───────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  onSelect,
}: {
  appt: AppointmentEntry;
  onSelect: (appt: AppointmentEntry) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const checkedInAt = getCheckedInAt(appt.notes);
  const [elapsedLabel, setElapsedLabel] = React.useState(
    checkedInAt ? getElapsedLabel(checkedInAt) : null
  );

  // Update elapsed every 30 seconds for IN_PROGRESS
  React.useEffect(() => {
    if (appt.status !== "IN_PROGRESS" || !checkedInAt) return;
    setElapsedLabel(getElapsedLabel(checkedInAt));
    const id = setInterval(() => setElapsedLabel(getElapsedLabel(checkedInAt)), 30000);
    return () => clearInterval(id);
  }, [appt.status, checkedInAt]);

  async function handleCheckIn(e: React.MouseEvent) {
    e.stopPropagation();
    setPending("checkin");
    await checkInClient(appt.id);
    setPending(null);
    router.refresh();
  }

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    setPending("complete");
    await completeAppointment(appt.id);
    setPending(null);
    router.refresh();
  }

  async function handleNoShow(e: React.MouseEvent) {
    e.stopPropagation();
    setPending("noshow");
    await markNoShow(appt.id);
    setPending(null);
    router.refresh();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(appt)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(appt);
        }
      }}
      className={cn(
        "p-3 rounded-xl border cursor-pointer hover:brightness-105 transition-all",
        STATUS_BG[appt.status] ?? "bg-card border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {appt.status === "IN_PROGRESS" && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
          )}
          <span className={cn("text-xs font-semibold", STATUS_TEXT_COLORS[appt.status])}>
            {STATUS_LABELS[appt.status]}
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{formatTime(appt.startTime)}</span>
      </div>

      <p className="font-bold text-foreground text-sm leading-tight">
        {appt.client?.name ?? "Walk-in"}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
        {appt.services.map((s) => s.service.name).join(", ") || "—"}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{appt.staff.name}</p>

      {/* IN_PROGRESS elapsed time */}
      {appt.status === "IN_PROGRESS" && elapsedLabel && (
        <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Started {elapsedLabel}
        </p>
      )}

      {/* Action buttons */}
      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {appt.status === "SCHEDULED" && (
          <>
            <button
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              onClick={handleCheckIn}
              disabled={!!pending}
            >
              {pending === "checkin" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <UserCheck className="w-3 h-3" />
              )}
              Check In
            </button>
            <button
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors disabled:opacity-50"
              onClick={handleNoShow}
              disabled={!!pending}
            >
              {pending === "noshow" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <UserX className="w-3 h-3" />
              )}
              No-Show
            </button>
          </>
        )}

        {appt.status === "IN_PROGRESS" && (
          <button
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
            onClick={handleComplete}
            disabled={!!pending}
          >
            {pending === "complete" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3" />
            )}
            Complete
          </button>
        )}

        {appt.status === "COMPLETED" && (
          <Link
            href={`/dashboard/appointments/${appt.id}/follow-up`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
          >
            <CalendarDays className="w-3 h-3" />
            Follow Up
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main board ─────────────────────────────────────────────────────────────────

export function CheckInBoardClient({
  appointments,
  currency,
  today,
}: CheckInBoardClientProps) {
  const [selected, setSelected] = React.useState<QuickActionAppointment | null>(null);

  // Summary stats
  const total = appointments.length;
  const checkedIn = appointments.filter((a) => a.status === "IN_PROGRESS").length;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const remaining = appointments.filter((a) => a.status === "SCHEDULED").length;
  const noShows = appointments.filter((a) => a.status === "NO_SHOW").length;

  // Grouped columns
  const scheduled = appointments.filter((a) => a.status === "SCHEDULED");
  const inProgress = appointments.filter((a) => a.status === "IN_PROGRESS");
  const completedList = appointments.filter((a) => a.status === "COMPLETED");
  const noShowList = appointments.filter((a) => a.status === "NO_SHOW");

  function openPanel(appt: AppointmentEntry) {
    const checkedInAt = getCheckedInAt(appt.notes);
    setSelected({
      ...appt,
      checkedInAt,
    });
  }

  return (
    <div className="p-4 md:p-8">
      {/* Page header */}
      <div className="flex items-start sm:items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-primary" />
            Check-In Board
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {new Date().toLocaleDateString("en", { dateStyle: "full" })}
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <SummaryCard label="Total Today" value={total} icon={<CalendarDays className="w-4 h-4 text-primary" />} />
        <SummaryCard
          label="Checked In"
          value={checkedIn}
          icon={<span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          color="text-amber-400"
        />
        <SummaryCard
          label="Completed"
          value={completed}
          icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
          color="text-green-400"
        />
        <SummaryCard
          label="Remaining"
          value={remaining}
          icon={<Clock className="w-4 h-4 text-blue-400" />}
          color="text-blue-400"
        />
        <SummaryCard
          label="No-Shows"
          value={noShows}
          icon={<UserX className="w-4 h-4 text-rose-400" />}
          color="text-rose-400"
        />
      </div>

      {/* Timeline */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Timeline</p>
          <div className="flex items-center gap-3 ml-auto text-[10px] text-muted-foreground">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <span key={status} className="flex items-center gap-1">
                <span className={cn("w-2 h-2 rounded-full", color)} />
                {STATUS_LABELS[status]}
              </span>
            ))}
          </div>
        </div>
        <TimelineGrid appointments={appointments} onSelect={openPanel} />
      </div>

      {/* Status board columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Column
          title="Upcoming"
          icon={<Clock className="w-4 h-4 text-blue-400" />}
          count={scheduled.length}
          colorClass="text-blue-400"
          appointments={scheduled}
          onSelect={openPanel}
        />
        <Column
          title="Checked In"
          icon={
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
            </span>
          }
          count={inProgress.length}
          colorClass="text-amber-400"
          appointments={inProgress}
          onSelect={openPanel}
        />
        <Column
          title="Completed"
          icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
          count={completedList.length}
          colorClass="text-green-400"
          appointments={completedList}
          onSelect={openPanel}
        />
        <Column
          title="No-Show"
          icon={<UserX className="w-4 h-4 text-rose-400" />}
          count={noShowList.length}
          colorClass="text-rose-400"
          appointments={noShowList}
          onSelect={openPanel}
        />
      </div>

      {/* Quick action panel */}
      {selected && (
        <QuickActionPanel
          appointment={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  color = "text-foreground",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
    </div>
  );
}

function Column({
  title,
  icon,
  count,
  colorClass,
  appointments,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  colorClass: string;
  appointments: AppointmentEntry[];
  onSelect: (appt: AppointmentEntry) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        {icon}
        <p className={cn("text-sm font-semibold", colorClass)}>{title}</p>
        <span className="ml-auto text-xs bg-secondary text-muted-foreground rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>
      <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[480px]">
        {appointments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">None</p>
        ) : (
          appointments.map((appt) => (
            <AppointmentCard key={appt.id} appt={appt} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}
