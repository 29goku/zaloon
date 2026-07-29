"use client";

import * as React from "react";
import { updateAppointmentStatus } from "@/app/actions/appointments";
import { CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckoutDialog, type CheckoutAppointment } from "./checkout-dialog";
import { AppointmentActionButtons } from "./appointment-action-buttons";
import { RebookModal } from "./rebook-modal";
import { RecurringSeriesBadge } from "./recurring-series-badge";
import { toast } from "@/components/ui/sonner";

/** Parse deposit amount from notes field. Returns null if no deposit marker found. */
function parseDepositFromNotes(notes: string | null): number | null {
  if (!notes) return null;
  const match = notes.match(/__deposit:(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/** Parse __checkedInAt ISO timestamp from notes JSON. */
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
  if (diff < 1) return "just now";
  if (diff === 1) return "1 min ago";
  return `${diff} min ago`;
}

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

const STATUS_CYCLE: Record<string, string> = {
  SCHEDULED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: "CANCELLED",
  CANCELLED: "SCHEDULED",
  NO_SHOW: "SCHEDULED",
};

export type AppointmentItem = {
  id: string;
  date: string;
  startTime: string;
  totalAmount: number;
  status: string;
  notes: string | null;
  client: { id: string; name: string } | null;
  staff: { id: string; name: string };
  services: {
    service: { id: string; name: string; price: number; durationMins?: number };
    staff?: { id: string; name: string } | null;
  }[];
};

interface AppointmentsListProps {
  appointments: AppointmentItem[];
  currency: string;
  onStatusChange?: (id: string, status: string) => void;
  onRowClick?: (appointment: AppointmentItem) => void;
}

function StatusButton({ appointmentId, status }: { appointmentId: string; status: string }) {
  const [currentStatus, setCurrentStatus] = React.useState(status);
  const [pending, setPending] = React.useState(false);

  async function cycleStatus() {
    const next = STATUS_CYCLE[currentStatus] ?? "SCHEDULED";
    setPending(true);
    const result = await updateAppointmentStatus(
      appointmentId,
      next as "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
    );
    setPending(false);
    if (result.success) {
      setCurrentStatus(next);
      if (next === "COMPLETED") {
        setTimeout(() => {
          toast.success(
            "Appointment completed!",
            "Follow up with the client using the Follow-Up button."
          );
        }, 200);
      }
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-opacity cursor-pointer border-0 select-none ${STATUS_CLASS[currentStatus] ?? "bg-muted text-muted-foreground"} ${pending ? "opacity-50 pointer-events-none" : "hover:opacity-80"}`}
    >
      {currentStatus === "IN_PROGRESS" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
        </span>
      )}
      {pending ? "…" : STATUS_LABEL[currentStatus] ?? currentStatus}
    </button>
  );
}

/** Shows elapsed time for IN_PROGRESS appointments. */
function InProgressIndicator({ notes }: { notes: string | null }) {
  const checkedInAt = getCheckedInAt(notes);
  const [label, setLabel] = React.useState(
    checkedInAt ? getElapsedLabel(checkedInAt) : null
  );

  React.useEffect(() => {
    if (!checkedInAt) return;
    setLabel(getElapsedLabel(checkedInAt));
    const id = setInterval(() => setLabel(getElapsedLabel(checkedInAt)), 30000);
    return () => clearInterval(id);
  }, [checkedInAt]);

  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium">
      <Clock className="w-3 h-3" />
      Started {label}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

export function AppointmentsList({
  appointments,
  currency,
  onStatusChange,
  onRowClick,
}: AppointmentsListProps) {
  const [checkoutTarget, setCheckoutTarget] =
    React.useState<CheckoutAppointment | null>(null);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  function openCheckout(appt: AppointmentItem, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckoutTarget({
      id: appt.id,
      clientName: appt.client?.name ?? null,
      staffName: appt.staff.name,
      date: appt.date,
      startTime: appt.startTime,
      totalAmount: appt.totalAmount,
      services: appt.services.map((s) => ({
        name: s.service.name,
        price: s.service.price,
        staffName: s.staff?.name ?? null,
      })),
      currency,
    });
    setCheckoutOpen(true);
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-16">
        <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No appointments found</p>
      </div>
    );
  }

  // Group by date (for "upcoming" view where multiple dates are present)
  const dateGroups: Record<string, AppointmentItem[]> = {};
  for (const appt of appointments) {
    if (!dateGroups[appt.date]) dateGroups[appt.date] = [];
    dateGroups[appt.date].push(appt);
  }
  const sortedDates = Object.keys(dateGroups).sort();
  const isGrouped = sortedDates.length > 1;

  return (
    <>
      <div className="space-y-6">
        {sortedDates.map((date) => (
          <div key={date}>
            {isGrouped && (
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                {formatDate(date)}
              </p>
            )}
            <div className="space-y-3">
              {dateGroups[date].map((appt) => (
                <div
                  key={appt.id}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={() => onRowClick?.(appt)}
                  onKeyDown={onRowClick ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(appt);
                    }
                  } : undefined}
                  className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                >
                  {/* Mobile card layout */}
                  <div className="flex items-start justify-between gap-3 sm:hidden">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground">{appt.startTime}</p>
                        <StatusButton appointmentId={appt.id} status={appt.status} />
                        {parseDepositFromNotes(appt.notes) !== null && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-500/50 text-blue-500 font-bold">
                            DEP
                          </Badge>
                        )}
                      </div>
                      <p className="font-semibold text-foreground mt-0.5">
                        {appt.client?.name ?? "Walk-in"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {appt.services.map((s) => s.service.name).join(", ") || "—"}
                      </p>
                      <RecurringSeriesBadge appointment={{ id: appt.id, notes: appt.notes, date: appt.date }} />
                      <p className="text-xs text-muted-foreground mt-0.5">{appt.staff.name}</p>
                      {appt.status === "IN_PROGRESS" && (
                        <div className="mt-1">
                          <InProgressIndicator notes={appt.notes} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">{fmt(appt.totalAmount)}</p>
                      {appt.status === "SCHEDULED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={(e) => openCheckout(appt, e)}
                        >
                          Check Out
                        </Button>
                      )}
                      {appt.status === "COMPLETED" && (
                        <RebookModal
                          appointment={{
                            id: appt.id,
                            staffId: appt.staff.id,
                            clientName: appt.client?.name ?? "Walk-in",
                            services: appt.services.map((s) => s.service.name),
                            staffName: appt.staff.name,
                            totalAmount: appt.totalAmount,
                          }}
                          onClose={() => {}}
                          onSuccess={() => {}}
                        />
                      )}
                    </div>
                  </div>

                  {/* Desktop row layout */}
                  <div className="hidden sm:flex items-center gap-4">
                    <div className="min-w-[60px] text-center">
                      <p className="text-sm font-bold text-foreground">{appt.startTime}</p>
                    </div>
                    <div className="w-px h-12 bg-border flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {appt.client?.name ?? "Walk-in"}
                        </p>
                        {parseDepositFromNotes(appt.notes) !== null && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-500/50 text-blue-500 font-bold">
                            DEP
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {appt.services.map((s) => s.service.name).join(", ") || "—"}
                      </p>
                      <RecurringSeriesBadge appointment={{ id: appt.id, notes: appt.notes, date: appt.date }} />
                      {appt.status === "IN_PROGRESS" && (
                        <InProgressIndicator notes={appt.notes} />
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-muted-foreground">
                        {appt.staff.name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 min-w-[70px]">
                      <p className="text-sm font-bold text-foreground">{fmt(appt.totalAmount)}</p>
                    </div>
                    <StatusButton
                      appointmentId={appt.id}
                      status={appt.status}
                    />
                    {appt.status === "SCHEDULED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0 text-xs"
                        onClick={(e) => openCheckout(appt, e)}
                      >
                        Check Out
                      </Button>
                    )}
                    {appt.status === "COMPLETED" && (
                      <RebookModal
                        appointment={{
                          id: appt.id,
                          staffId: appt.staff.id,
                          clientName: appt.client?.name ?? "Walk-in",
                          services: appt.services.map((s) => s.service.name),
                          staffName: appt.staff.name,
                          totalAmount: appt.totalAmount,
                        }}
                        onClose={() => {}}
                        onSuccess={() => {}}
                      />
                    )}
                    <AppointmentActionButtons
                      appointmentId={appt.id}
                      status={appt.status}
                      date={appt.date}
                      startTime={appt.startTime}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {checkoutTarget && (
        <CheckoutDialog
          appointment={checkoutTarget}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
        />
      )}
    </>
  );
}
