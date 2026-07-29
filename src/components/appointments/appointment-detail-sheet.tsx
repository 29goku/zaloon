"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2,
  XCircle,
  UserX,
  Pencil,
  ArrowLeft,
  CalendarDays,
  Clock,
  User,
  Scissors,
  StickyNote,
  BadgeDollarSign,
  CreditCard,
  Bell,
  BellPlus,
  Receipt,
  Loader2,
  Phone,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import {
  updateAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  markNoShow,
} from "@/app/actions/appointments";
import { scheduleReminder } from "@/app/actions/reminders";
import { CheckoutDialog, type CheckoutAppointment } from "./checkout-dialog";
import { RebookModal } from "./rebook-modal";
import { toast } from "@/components/ui/sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Client = { id: string; name: string };
type Staff = { id: string; name: string };
type Service = { id: string; name: string; price: number };

/**
 * The canonical shape used internally by this sheet.
 * Compatible with both `AppointmentWithRelations` (from server actions)
 * and the legacy `AppointmentDetail` shape used by AppointmentsListWithSheet.
 */
export type AppointmentDetail = {
  id: string;
  date: string;
  startTime: string;
  totalAmount: number;
  status: string;
  notes: string | null;
  client: { id: string; name: string; phone?: string | null } | null;
  staff: { id: string; name: string };
  services: {
    service: { id: string; name: string; price: number; durationMins?: number };
    /** Staff assigned specifically to this service (may differ from appointment staff) */
    staff?: { id: string; name: string } | null;
  }[];
};

interface AppointmentDetailSheetProps {
  appointment: AppointmentDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  staff: Staff[];
  services: Service[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
type AppointmentStatus = (typeof STATUSES)[number];

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-[#F48E16]/20 text-[#F48E16] border-0",
  COMPLETED: "bg-primary/20 text-primary border-0",
  CANCELLED: "bg-[#F41666]/20 text-[#F41666] border-0",
  NO_SHOW: "bg-muted text-muted-foreground border-0",
};

const statusLabel: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const REMINDER_TYPES = [
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
] as const;

const REMINDER_HOURS = [
  { value: "1", label: "1 hour before" },
  { value: "2", label: "2 hours before" },
  { value: "24", label: "24 hours before" },
  { value: "48", label: "48 hours before" },
] as const;

// ─── Edit form schema ──────────────────────────────────────────────────────────

const editSchema = z.object({
  status: z.enum(STATUSES),
  clientId: z.string().optional(),
  staffId: z.string().min(1, "Staff is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  serviceIds: z.array(z.string()).min(1, "Select at least one service"),
  notes: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

// ─── Reminder form schema ──────────────────────────────────────────────────────

const reminderSchema = z.object({
  type: z.enum(["SMS", "WHATSAPP", "EMAIL"]),
  hours: z.string().min(1),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

// ─── Detail row helper ─────────────────────────────────────────────────────────

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

// ─── Main component ────────────────────────────────────────────────────────────

export function AppointmentDetailSheet({
  appointment,
  open,
  onOpenChange,
  clients,
  staff,
  services,
}: AppointmentDetailSheetProps) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"detail" | "edit">("detail");
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);

  // Reminder panel state
  const [reminderOpen, setReminderOpen] = React.useState(false);
  const [reminderPending, setReminderPending] = React.useState(false);
  const [reminderError, setReminderError] = React.useState<string | null>(null);
  const [reminderSuccess, setReminderSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      status: (appointment?.status as AppointmentStatus) ?? "SCHEDULED",
      clientId: appointment?.client?.id ?? undefined,
      staffId: appointment?.staff.id ?? "",
      date: appointment?.date ?? "",
      startTime: appointment?.startTime ?? "",
      serviceIds: appointment?.services.map((s) => s.service.id) ?? [],
      notes: appointment?.notes ?? "",
    },
  });

  const {
    register: registerReminder,
    handleSubmit: handleSubmitReminder,
    control: reminderControl,
    reset: resetReminder,
    formState: { errors: reminderErrors },
  } = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: { type: "SMS", hours: "24" },
  });

  // Reset form + mode when appointment changes or sheet closes
  React.useEffect(() => {
    if (!open) {
      setMode("detail");
      setActionError(null);
      setReminderOpen(false);
      setReminderSuccess(false);
      setReminderError(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (appointment) {
      reset({
        status: (appointment.status as AppointmentStatus) ?? "SCHEDULED",
        clientId: appointment.client?.id ?? undefined,
        staffId: appointment.staff.id,
        date: appointment.date,
        startTime: appointment.startTime,
        serviceIds: appointment.services.map((s) => s.service.id),
        notes: appointment.notes ?? "",
      });
      setMode("detail");
      setActionError(null);
      setReminderOpen(false);
      setReminderSuccess(false);
      setReminderError(null);
    }
  }, [appointment, reset]);

  if (!appointment) return null;

  const isScheduled = appointment.status === "SCHEDULED";
  const totalDurationMins = appointment.services.reduce(
    (sum, s) => sum + (s.service.durationMins ?? 0),
    0
  );

  // ─── Action handlers ──────────────────────────────────────────────────────────

  async function handleComplete() {
    setIsPending(true);
    setActionError(null);
    const apptId = appointment!.id;
    const result = await updateAppointmentStatus(apptId, "COMPLETED");
    setIsPending(false);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
    // Show follow-up toast after the sheet closes
    setTimeout(() => {
      toast.success(
        "Appointment completed!",
        "Follow up with the client — visit Follow-Up from the appointments list."
      );
    }, 400);
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

  async function onEditSubmit(values: EditFormValues) {
    setActionError(null);
    const result = await updateAppointment(appointment!.id, {
      status: values.status,
      clientId: values.clientId === "walk-in" || !values.clientId ? null : values.clientId,
      staffId: values.staffId,
      date: values.date,
      startTime: values.startTime,
      serviceIds: values.serviceIds,
      notes: values.notes ?? null,
    });
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  async function onReminderSubmit(values: ReminderFormValues) {
    setReminderPending(true);
    setReminderError(null);
    const result = await scheduleReminder(
      appointment!.id,
      values.type,
      parseInt(values.hours, 10)
    );
    setReminderPending(false);
    if (!result.success) {
      setReminderError(result.error);
      return;
    }
    setReminderSuccess(true);
    resetReminder({ type: "SMS", hours: "24" });
    router.refresh();
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-2">
            {mode === "edit" ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setMode("detail");
                    setActionError(null);
                  }}
                  className="flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="sr-only">Back</span>
                </Button>
                <SheetTitle>Edit Appointment</SheetTitle>
              </div>
            ) : (
              <SheetTitle>Appointment Details</SheetTitle>
            )}
          </SheetHeader>

          <Separator />

          {/* ── DETAIL MODE ─────────────────────────────────────────────────────── */}
          {mode === "detail" && (
            <>
              <div className="flex-1 space-y-5 px-4 py-4">
                {/* Status badge + Edit button */}
                <div className="flex items-center justify-between">
                  <Badge className={statusColor[appointment.status] ?? "border-0"}>
                    {statusLabel[appointment.status] ?? appointment.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setMode("edit")}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                </div>

                {/* Detail rows */}
                <div className="space-y-4">
                  <DetailRow
                    icon={<User className="w-4 h-4" />}
                    label="Client"
                    value={
                      <div className="flex flex-col gap-0.5">
                        <span>{appointment.client?.name ?? "Walk-in"}</span>
                        {appointment.client?.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 font-normal">
                            <Phone className="w-3 h-3" />
                            {appointment.client.phone}
                          </span>
                        )}
                      </div>
                    }
                  />
                  <DetailRow
                    icon={<Scissors className="w-4 h-4" />}
                    label="Staff"
                    value={appointment.staff.name}
                  />
                  <DetailRow
                    icon={<CalendarDays className="w-4 h-4" />}
                    label="Date"
                    value={new Date(appointment.date + "T00:00:00").toLocaleDateString("en", {
                      dateStyle: "long",
                    })}
                  />
                  <DetailRow
                    icon={<Clock className="w-4 h-4" />}
                    label="Time"
                    value={
                      <span>
                        {appointment.startTime}
                        {totalDurationMins > 0 && (
                          <span className="text-xs text-muted-foreground font-normal ml-1.5">
                            ({totalDurationMins} min)
                          </span>
                        )}
                      </span>
                    }
                  />
                  <DetailRow
                    icon={<Scissors className="w-4 h-4" />}
                    label="Services"
                    value={
                      appointment.services.length > 0 ? (
                        <ul className="space-y-2">
                          {appointment.services.map(({ service, staff: svcStaff }) => {
                            // Show service-level staff only when it differs from appointment staff
                            const showSvcStaff =
                              svcStaff &&
                              svcStaff.id !== appointment.staff.id;
                            return (
                              <li key={service.id} className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium">{service.name}</span>
                                  {showSvcStaff && (
                                    <span className="block text-xs text-muted-foreground font-normal">
                                      with {svcStaff!.name}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="text-muted-foreground font-normal">
                                    {service.price.toLocaleString("en", {
                                      style: "currency",
                                      currency: "USD",
                                      minimumFractionDigits: 0,
                                    })}
                                  </span>
                                  {service.durationMins != null && service.durationMins > 0 && (
                                    <span className="block text-xs text-muted-foreground font-normal">
                                      {service.durationMins} min
                                    </span>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailRow
                    icon={<BadgeDollarSign className="w-4 h-4" />}
                    label="Total"
                    value={
                      <span className="font-bold text-base">
                        {appointment.totalAmount.toLocaleString("en", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 0,
                        })}
                      </span>
                    }
                  />
                  {appointment.notes && (
                    <DetailRow
                      icon={<StickyNote className="w-4 h-4" />}
                      label="Notes"
                      value={<span className="whitespace-pre-wrap">{appointment.notes}</span>}
                    />
                  )}
                </div>

                <Separator />

                {/* ── ACTIONS PANEL ──────────────────────────────────────────── */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Actions
                  </p>

                  {/* Create Invoice — only when not yet completed/invoiced */}
                  {appointment.status !== "CANCELLED" && appointment.status !== "NO_SHOW" && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setCheckoutOpen(true)}
                      disabled={isPending}
                    >
                      <Receipt className="w-4 h-4" />
                      {appointment.status === "COMPLETED" ? "View / Reprint Invoice" : "Create Invoice"}
                    </Button>
                  )}

                  {/* Rebook — only for completed appointments */}
                  {appointment.status === "COMPLETED" && (
                    <div className="w-full">
                      <RebookModal
                        appointment={{
                          id: appointment.id,
                          staffId: appointment.staff.id,
                          clientName: appointment.client?.name ?? "Walk-in",
                          services: appointment.services.map((s) => s.service.name),
                          staffName: appointment.staff.name,
                          totalAmount: appointment.totalAmount,
                        }}
                        onClose={() => {}}
                        onSuccess={() => {
                          onOpenChange(false);
                          router.refresh();
                        }}
                        trigger={
                          <Button variant="outline" className="w-full gap-2">
                            <CalendarDays className="w-4 h-4" />
                            Rebook Appointment
                          </Button>
                        }
                      />
                    </div>
                  )}

                  {/* Add Reminder */}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      setReminderOpen((prev) => !prev);
                      setReminderSuccess(false);
                      setReminderError(null);
                    }}
                    disabled={isPending}
                  >
                    <BellPlus className="w-4 h-4" />
                    Add Reminder
                  </Button>

                  {/* Inline reminder form */}
                  {reminderOpen && (
                    <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
                      <p className="text-sm font-medium text-foreground">Schedule a reminder</p>

                      {reminderSuccess ? (
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Bell className="w-4 h-4" />
                          Reminder scheduled successfully!
                        </div>
                      ) : (
                        <form
                          onSubmit={handleSubmitReminder(onReminderSubmit)}
                          className="space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Channel</Label>
                              <Controller
                                name="type"
                                control={reminderControl}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={(val) => field.onChange(val)}
                                  >
                                    <SelectTrigger className="w-full" size="sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {REMINDER_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                          {t.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">When</Label>
                              <Controller
                                name="hours"
                                control={reminderControl}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={(val) => field.onChange(val)}
                                  >
                                    <SelectTrigger className="w-full" size="sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {REMINDER_HOURS.map((h) => (
                                        <SelectItem key={h.value} value={h.value}>
                                          {h.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>

                          {reminderError && (
                            <p className="text-xs text-destructive">{reminderError}</p>
                          )}

                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              size="sm"
                              className="flex-1 gap-1.5"
                              disabled={reminderPending}
                            >
                              {reminderPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Bell className="w-3.5 h-3.5" />
                              )}
                              Schedule
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setReminderOpen(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action error */}
              {actionError && (
                <p className="px-4 text-sm text-destructive">{actionError}</p>
              )}

              {/* Quick-action buttons (only for SCHEDULED) */}
              {isScheduled && (
                <SheetFooter className="flex-col gap-2 px-4 pb-4">
                  <Button
                    className="w-full gap-2"
                    onClick={() => setCheckoutOpen(true)}
                    disabled={isPending}
                  >
                    <CreditCard className="w-4 h-4" />
                    Check Out
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleComplete}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Complete (no payment)
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
            </>
          )}

          {/* ── EDIT MODE ───────────────────────────────────────────────────────── */}
          {mode === "edit" && (
            <form
              onSubmit={handleSubmit(onEditSubmit)}
              className="flex flex-col flex-1"
            >
              <div className="flex-1 space-y-4 px-4 py-4">
                {/* Status */}
                <div className="space-y-1.5">
                  <Label>
                    Status <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(val) => field.onChange(val as AppointmentStatus)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          <SelectItem value="NO_SHOW">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Client */}
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Controller
                    name="clientId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? "walk-in"}
                        onValueChange={(val) => field.onChange(val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Walk-in / select client" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="walk-in">Walk-in</SelectItem>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Staff */}
                <div className="space-y-1.5">
                  <Label>
                    Staff <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="staffId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(val) => field.onChange(val)}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-invalid={!!errors.staffId}
                        >
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.staffId && (
                    <p className="text-xs text-destructive">{errors.staffId.message}</p>
                  )}
                </div>

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>
                      Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="date"
                      aria-invalid={!!errors.date}
                      {...register("date")}
                    />
                    {errors.date && (
                      <p className="text-xs text-destructive">{errors.date.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Start time <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="time"
                      aria-invalid={!!errors.startTime}
                      {...register("startTime")}
                    />
                    {errors.startTime && (
                      <p className="text-xs text-destructive">
                        {errors.startTime.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-1.5">
                  <Label>
                    Services <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="serviceIds"
                    control={control}
                    render={({ field }) => (
                      <div className="rounded-lg border border-input bg-transparent p-2 space-y-1.5 max-h-44 overflow-y-auto">
                        {services.map((svc) => {
                          const checked = field.value.includes(svc.id);
                          return (
                            <label
                              key={svc.id}
                              className="flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1 hover:bg-muted transition-colors"
                            >
                              <input
                                type="checkbox"
                                className="rounded border-input accent-primary"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange([...field.value, svc.id]);
                                  } else {
                                    field.onChange(
                                      field.value.filter((id) => id !== svc.id)
                                    );
                                  }
                                }}
                              />
                              <span className="text-sm flex-1">{svc.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {svc.price.toLocaleString("en", {
                                  style: "currency",
                                  currency: "USD",
                                  minimumFractionDigits: 0,
                                })}
                              </span>
                            </label>
                          );
                        })}
                        {services.length === 0 && (
                          <p className="text-sm text-muted-foreground px-2 py-1">
                            No services available
                          </p>
                        )}
                      </div>
                    )}
                  />
                  {errors.serviceIds && (
                    <p className="text-xs text-destructive">
                      {errors.serviceIds.message}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Optional notes…"
                    rows={3}
                    {...register("notes")}
                  />
                </div>

                {actionError && (
                  <p className="text-sm text-destructive">{actionError}</p>
                )}
              </div>

              <SheetFooter className="flex-col gap-2 px-4 pb-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMode("detail");
                    setActionError(null);
                  }}
                >
                  Discard
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>

      {/* Checkout dialog — rendered outside the Sheet so it stacks on top */}
      {appointment && (
        <CheckoutDialog
          appointment={{
            id: appointment.id,
            clientName: appointment.client?.name ?? null,
            staffName: appointment.staff.name,
            date: appointment.date,
            startTime: appointment.startTime,
            totalAmount: appointment.totalAmount,
            services: appointment.services.map((s) => ({
              name: s.service.name,
              price: s.service.price,
              // Include per-service staff name for commission display
              staffName: s.staff?.name ?? null,
            })),
            currency: "USD",
          } satisfies CheckoutAppointment}
          open={checkoutOpen}
          onOpenChange={(next) => {
            setCheckoutOpen(next);
            if (!next) {
              onOpenChange(false);
              router.refresh();
            }
          }}
        />
      )}
    </>
  );
}
