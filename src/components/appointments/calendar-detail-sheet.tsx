"use client";

/**
 * CalendarDetailSheet
 *
 * Thin adapter that converts the PascalCase AppointmentWithRelations shape
 * (from Prisma/actions) into the camelCase AppointmentDetail shape expected
 * by AppointmentDetailSheet, then renders that sheet.
 *
 * Used by DayView and WeekView — they receive AppointmentWithRelations directly
 * from the server, so we bridge the field-name difference here rather than in
 * every view component.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  UserX,
  CalendarDays,
  Clock,
  User,
  Scissors,
  StickyNote,
  BadgeDollarSign,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  updateAppointmentStatus,
  cancelAppointment,
  markNoShow,
  type AppointmentWithRelations,
} from "@/app/actions/appointments";

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-blue-500/20 text-blue-300 border-0",
  COMPLETED: "bg-green-600/20 text-green-300 border-0",
  CANCELLED: "bg-rose-600/20 text-rose-300 border-0",
  NO_SHOW:   "bg-zinc-600/20 text-zinc-400 border-0",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW:   "No Show",
};

// ── Detail row helper ──────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

// ── CalendarDetailSheet ────────────────────────────────────────────────────────

interface CalendarDetailSheetProps {
  appointment: AppointmentWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarDetailSheet({
  appointment,
  open,
  onOpenChange,
}: CalendarDetailSheetProps) {
  const router = useRouter();
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  // Reset error state when sheet closes or appointment changes
  React.useEffect(() => {
    if (!open) setActionError(null);
  }, [open]);

  if (!appointment) return null;

  const isScheduled = appointment.status === "SCHEDULED";
  const clientName = appointment.Client?.name ?? "Walk-in";
  const staffName = appointment.Staff.name;
  const services = appointment.AppointmentService;

  // ── Action handlers ────────────────────────────────────────────────────────

  async function handleComplete() {
    setIsPending(true);
    setActionError(null);
    const result = await updateAppointmentStatus(appointment!.id, "COMPLETED");
    setIsPending(false);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  async function handleCancel() {
    setIsPending(true);
    setActionError(null);
    const result = await cancelAppointment(appointment!.id);
    setIsPending(false);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  async function handleNoShow() {
    setIsPending(true);
    setActionError(null);
    const result = await markNoShow(appointment!.id);
    setIsPending(false);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  // ── Time formatting ────────────────────────────────────────────────────────

  const startTime = appointment.startTime;
  const [h, m] = startTime.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  const formattedTime = `${hh}:${String(m).padStart(2, "0")} ${ampm}`;

  const formattedDate = new Date(appointment.date + "T00:00:00").toLocaleDateString("en", {
    dateStyle: "long",
  });

  const totalAmount = appointment.totalAmount.toLocaleString("en", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>Appointment Details</SheetTitle>
        </SheetHeader>

        <Separator />

        <div className="space-y-5 px-4 py-4">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <Badge className={STATUS_COLOR[appointment.status] ?? "border-0"}>
              {STATUS_LABEL[appointment.status] ?? appointment.status}
            </Badge>
          </div>

          {/* Detail rows */}
          <div className="space-y-4">
            <DetailRow
              icon={<User className="w-4 h-4" />}
              label="Client"
              value={clientName}
            />
            <DetailRow
              icon={<Scissors className="w-4 h-4" />}
              label="Staff"
              value={staffName}
            />
            <DetailRow
              icon={<CalendarDays className="w-4 h-4" />}
              label="Date"
              value={formattedDate}
            />
            <DetailRow
              icon={<Clock className="w-4 h-4" />}
              label="Time"
              value={formattedTime}
            />
            <DetailRow
              icon={<Scissors className="w-4 h-4" />}
              label="Services"
              value={
                services.length > 0 ? (
                  <ul className="space-y-0.5">
                    {services.map(({ Service }) => (
                      <li key={Service.id} className="flex justify-between gap-4">
                        <span>{Service.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {Service.durationMins} min
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )
              }
            />
            <DetailRow
              icon={<BadgeDollarSign className="w-4 h-4" />}
              label="Total"
              value={totalAmount}
            />
            {appointment.notes && (
              <DetailRow
                icon={<StickyNote className="w-4 h-4" />}
                label="Notes"
                value={appointment.notes}
              />
            )}
          </div>
        </div>

        {/* Error */}
        {actionError && (
          <p className="px-4 text-sm text-destructive">{actionError}</p>
        )}

        {/* Action buttons (only for SCHEDULED appointments) */}
        {isScheduled && (
          <SheetFooter className="flex-col gap-2 px-4 pb-4">
            <Button
              className="w-full gap-2"
              onClick={handleComplete}
              disabled={isPending}
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Complete
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2 text-destructive hover:text-destructive"
                onClick={handleCancel}
                disabled={isPending}
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleNoShow}
                disabled={isPending}
              >
                <UserX className="w-4 h-4" />
                No Show
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
