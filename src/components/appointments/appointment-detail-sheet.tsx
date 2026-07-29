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
import { CheckoutDialog, type CheckoutAppointment } from "./checkout-dialog";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Client = { id: string; name: string };
type Staff = { id: string; name: string };
type Service = { id: string; name: string; price: number };

export type AppointmentDetail = {
  id: string;
  date: string;
  startTime: string;
  totalAmount: number;
  status: string;
  notes: string | null;
  client: { id: string; name: string } | null;
  staff: { id: string; name: string };
  services: { service: { id: string; name: string; price: number } }[];
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

// ─── Edit form schema ──────────────────────────────────────────────────────────

const editSchema = z.object({
  clientId: z.string().optional(),
  staffId: z.string().min(1, "Staff is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  serviceIds: z.array(z.string()).min(1, "Select at least one service"),
  notes: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

// ─── Detail view ───────────────────────────────────────────────────────────────

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

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      clientId: appointment?.client?.id ?? undefined,
      staffId: appointment?.staff.id ?? "",
      date: appointment?.date ?? "",
      startTime: appointment?.startTime ?? "",
      serviceIds: appointment?.services.map((s) => s.service.id) ?? [],
      notes: appointment?.notes ?? "",
    },
  });

  // Reset form + mode when appointment changes or sheet closes
  React.useEffect(() => {
    if (!open) {
      setMode("detail");
      setActionError(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (appointment) {
      reset({
        clientId: appointment.client?.id ?? undefined,
        staffId: appointment.staff.id,
        date: appointment.date,
        startTime: appointment.startTime,
        serviceIds: appointment.services.map((s) => s.service.id),
        notes: appointment.notes ?? "",
      });
      setMode("detail");
      setActionError(null);
    }
  }, [appointment, reset]);

  if (!appointment) return null;

  const isScheduled = appointment.status === "SCHEDULED";

  // ─── Action handlers ──────────────────────────────────────────────────────────

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

  async function onEditSubmit(values: EditFormValues) {
    setActionError(null);
    const result = await updateAppointment(appointment!.id, {
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
              {/* Status badge */}
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

              <div className="space-y-4">
                <DetailRow
                  icon={<User className="w-4 h-4" />}
                  label="Client"
                  value={appointment.client?.name ?? "Walk-in"}
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
                  value={appointment.startTime}
                />
                <DetailRow
                  icon={<Scissors className="w-4 h-4" />}
                  label="Services"
                  value={
                    appointment.services.length > 0 ? (
                      <ul className="space-y-0.5">
                        {appointment.services.map(({ service }) => (
                          <li key={service.id} className="flex justify-between">
                            <span>{service.name}</span>
                            <span className="text-muted-foreground">
                              {service.price.toLocaleString("en", {
                                style: "currency",
                                currency: "USD",
                                minimumFractionDigits: 0,
                              })}
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
                  value={appointment.totalAmount.toLocaleString("en", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 0,
                  })}
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

            {/* Action error */}
            {actionError && (
              <p className="px-4 text-sm text-destructive">{actionError}</p>
            )}

            {/* Action buttons (only for SCHEDULED) */}
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
                {isSubmitting ? "Saving…" : "Save Changes"}
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
          })),
          currency: "USD",
        } satisfies CheckoutAppointment}
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) {
            // Close the parent sheet after successful checkout so the page
            // reflects the updated COMPLETED status.
            onOpenChange(false);
            router.refresh();
          }
        }}
      />
    )}
    </>
  );
}
