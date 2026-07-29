"use client";

import * as React from "react";
import { updateAppointmentStatus } from "@/app/actions/appointments";

const STATUS_CYCLE: Record<string, string> = {
  SCHEDULED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: "CANCELLED",
  CANCELLED: "SCHEDULED",
  NO_SHOW: "SCHEDULED",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: "bg-blue-500/20 text-blue-400",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400",
  COMPLETED: "bg-primary/20 text-primary",
  CANCELLED: "bg-zinc-500/20 text-zinc-400",
  NO_SHOW: "bg-rose-500/20 text-rose-400",
};

interface AppointmentStatusButtonProps {
  appointmentId: string;
  status: string;
}

export function AppointmentStatusButton({
  appointmentId,
  status,
}: AppointmentStatusButtonProps) {
  const [currentStatus, setCurrentStatus] = React.useState(status);
  const [pending, setPending] = React.useState(false);

  async function cycleStatus() {
    const next = STATUS_CYCLE[currentStatus] ?? "SCHEDULED";
    setPending(true);
    const result = await updateAppointmentStatus(
      appointmentId,
      next as "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
    );
    setPending(false);
    if (result.success) {
      setCurrentStatus(next);
    }
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        cycleStatus();
      }}
      disabled={pending}
      title={`Click to advance status (next: ${STATUS_LABEL[STATUS_CYCLE[currentStatus] ?? "SCHEDULED"]})`}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-opacity cursor-pointer border-0 select-none ${STATUS_CLASS[currentStatus] ?? "bg-muted text-muted-foreground"} ${pending ? "opacity-50 pointer-events-none" : "hover:opacity-80"}`}
    >
      {pending ? "…" : STATUS_LABEL[currentStatus] ?? currentStatus}
    </button>
  );
}
