"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  X,
  CheckCircle2,
  UserCheck,
  UserX,
  CreditCard,
  Loader2,
  Clock,
  User,
  Scissors,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  checkInClient,
  completeAppointment,
  markNoShow,
} from "@/app/actions/appointments";
import Link from "next/link";

export type QuickActionAppointment = {
  id: string;
  status: string;
  startTime: string;
  date: string;
  notes: string | null;
  client: { id: string; name: string; phone?: string | null } | null;
  staff: { id: string; name: string };
  services: {
    service: { id: string; name: string; price: number; durationMins: number };
  }[];
  checkedInAt?: string | null;
};

interface QuickActionPanelProps {
  appointment: QuickActionAppointment | null;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  NO_SHOW: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export function QuickActionPanel({ appointment, onClose }: QuickActionPanelProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [completedServices, setCompletedServices] = React.useState<Record<string, boolean>>({});
  const [currentStatus, setCurrentStatus] = React.useState(appointment?.status ?? "SCHEDULED");

  // Sync state when appointment changes
  React.useEffect(() => {
    if (appointment) {
      setCurrentStatus(appointment.status);
      setCompletedServices({});
      // Parse existing notes
      let notesText = "";
      if (appointment.notes) {
        try {
          const parsed = JSON.parse(appointment.notes);
          notesText = parsed.general ?? "";
        } catch {
          notesText = appointment.notes;
        }
      }
      setNotes(notesText);
    }
  }, [appointment?.id]);

  if (!appointment) return null;

  const totalDuration = appointment.services.reduce(
    (sum, s) => sum + s.service.durationMins,
    0
  );

  async function handleCheckIn() {
    if (!appointment) return;
    setPending("checkin");
    const result = await checkInClient(appointment.id);
    setPending(null);
    if (result.success) {
      setCurrentStatus("IN_PROGRESS");
      router.refresh();
    }
  }

  async function handleComplete() {
    if (!appointment) return;
    setPending("complete");
    const result = await completeAppointment(appointment.id);
    setPending(null);
    if (result.success) {
      setCurrentStatus("COMPLETED");
      router.refresh();
    }
  }

  async function handleNoShow() {
    if (!appointment) return;
    setPending("noshow");
    const result = await markNoShow(appointment.id);
    setPending(null);
    if (result.success) {
      setCurrentStatus("NO_SHOW");
      router.refresh();
    }
  }

  function toggleService(serviceId: string) {
    setCompletedServices((prev) => ({ ...prev, [serviceId]: !prev[serviceId] }));
  }

  const allServicesChecked =
    appointment.services.length > 0 &&
    appointment.services.every((s) => completedServices[s.service.id]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <aside
        className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col overflow-hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Appointment Quick Actions"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                STATUS_COLORS[currentStatus] ?? "bg-muted text-muted-foreground border-border"
              )}
            >
              {STATUS_LABELS[currentStatus] ?? currentStatus}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {appointment.startTime}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Client & staff info */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground">
                  {appointment.client?.name ?? "Walk-in"}
                </p>
                {appointment.client?.phone && (
                  <p className="text-xs text-muted-foreground">{appointment.client.phone}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  with {appointment.staff.name}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                <span>{appointment.date}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>~{totalDuration} min</span>
              </div>
            </div>
          </div>

          {/* Services checklist */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <Scissors className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Services</p>
            </div>
            <div className="space-y-2">
              {appointment.services.map((s) => (
                <label
                  key={s.service.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={completedServices[s.service.id] ?? false}
                    onCheckedChange={() => toggleService(s.service.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground">{s.service.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {s.service.durationMins} min
                    </span>
                  </div>
                </label>
              ))}
              {appointment.services.length === 0 && (
                <p className="text-xs text-muted-foreground">No services added</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground mb-2">Notes</p>
            <Textarea
              placeholder="Add appointment notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Status workflow buttons */}
          <div className="px-5 py-4 space-y-2.5">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">
              Actions
            </p>

            {currentStatus === "SCHEDULED" && (
              <>
                <Button
                  className="w-full justify-start gap-2"
                  onClick={handleCheckIn}
                  disabled={!!pending}
                >
                  {pending === "checkin" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  Check In Client
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                  onClick={handleNoShow}
                  disabled={!!pending}
                >
                  {pending === "noshow" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserX className="w-4 h-4" />
                  )}
                  Mark No-Show
                </Button>
              </>
            )}

            {currentStatus === "IN_PROGRESS" && (
              <Button
                className="w-full justify-start gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleComplete}
                disabled={!!pending}
              >
                {pending === "complete" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Complete Appointment
              </Button>
            )}

            {currentStatus === "COMPLETED" && (
              <>
                <Link
                  href={`/dashboard/appointments/${appointment.id}/follow-up`}
                  className="flex items-center gap-2 w-full px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <CalendarDays className="w-4 h-4" />
                  Follow Up
                </Link>
                <Link
                  href={`/dashboard/quick-pay?appointmentId=${appointment.id}`}
                  className="flex items-center gap-2 w-full px-4 py-2 rounded-md bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors border border-border"
                >
                  <CreditCard className="w-4 h-4" />
                  Process Payment
                </Link>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
