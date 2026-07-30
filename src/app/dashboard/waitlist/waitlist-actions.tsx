"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarPlus,
  Trash2,
  Loader2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Clock,
  User,
  CalendarCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  removeFromWaitlist,
  convertToAppointment,
  reprioritizeWaitlist,
  getAvailableSlotsForWaitlist,
  convertWaitlistToAppointment,
} from "@/app/actions/waitlist";
import type { AvailableSlot } from "@/lib/smart-scheduler";
import { NotifyDialog } from "@/components/waitlist/notify-dialog";

const convertSchema = z.object({
  staffId: z.string().min(1, "Staff is required"),
  serviceId: z.string().min(1, "Service is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Time is required"),
  notes: z.string().optional(),
});

type ConvertFormValues = z.infer<typeof convertSchema>;

interface EntryInfo {
  name: string;
  phone: string | null;
  clientId: string | null;
  serviceId: string | null;
  serviceName: string | null;
  staffId: string | null;
  staffName: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  note: string | null;
}

interface ServiceOption {
  id: string;
  name: string;
}
interface StaffOption {
  id: string;
  name: string;
}

interface WaitlistActionButtonsProps {
  id: string;
  currentStatus: string;
  position: number;
  totalWaiting: number;
  entry: EntryInfo;
  services: ServiceOption[];
  staff: StaffOption[];
  bookingLink?: string;
}

function timeRangeToTime(preferredTime: string | null): string {
  switch (preferredTime) {
    case "morning":
      return "09:00";
    case "afternoon":
      return "13:00";
    case "evening":
      return "17:00";
    default:
      return "10:00";
  }
}

function formatSlotDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (dateStr === today.toISOString().split("T")[0]) return "Today";
  if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ─── Smart Slot Finder Dialog ─────────────────────────────────────────────────

interface SlotFinderDialogProps {
  waitlistId: string;
  entry: EntryInfo;
  disabled?: boolean;
}

function SlotFinderDialog({ waitlistId, entry, disabled }: SlotFinderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [slots, setSlots] = React.useState<AvailableSlot[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [bookingSlot, setBookingSlot] = React.useState<string | null>(null); // slot key
  const [booked, setBooked] = React.useState(false);

  async function handleOpen(next: boolean) {
    setOpen(next);
    if (next && entry.serviceId) {
      setLoading(true);
      setServerError(null);
      setBooked(false);
      try {
        const result = await getAvailableSlotsForWaitlist(
          entry.serviceId,
          entry.staffId ?? undefined
        );
        setSlots(result);
      } catch {
        setServerError("Failed to load available slots");
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleBookSlot(slot: AvailableSlot) {
    if (!entry.serviceId) return;
    const key = `${slot.date}-${slot.startTime}-${slot.staffId}`;
    setBookingSlot(key);
    setServerError(null);
    try {
      const result = await convertWaitlistToAppointment(waitlistId, {
        date: slot.date,
        startTime: slot.startTime,
        staffId: slot.staffId,
        serviceId: entry.serviceId,
      });
      if (!result.success) {
        setServerError(result.error ?? "Failed to book slot");
        return;
      }
      setBooked(true);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1200);
    } finally {
      setBookingSlot(null);
    }
  }

  if (!entry.serviceId) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30" disabled={disabled} />}>
        <Sparkles className="w-3 h-3" />
        Find Slot
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Find Available Slot</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-1">
          Next available slots for{" "}
          <span className="font-medium text-foreground">{entry.name}</span>
          {entry.serviceName ? ` · ${entry.serviceName}` : ""}
          {entry.staffName ? ` with ${entry.staffName}` : ""}
        </p>

        {loading && (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Finding available slots…</span>
          </div>
        )}

        {!loading && serverError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {serverError}
          </p>
        )}

        {!loading && !serverError && slots.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <CalendarCheck className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No available slots found in the next 14 days.
            </p>
          </div>
        )}

        {!loading && !booked && slots.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {slots.map((slot) => {
              const key = `${slot.date}-${slot.startTime}-${slot.staffId}`;
              const isBooking = bookingSlot === key;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatSlotDate(slot.date)} · {slot.startTime}–{slot.endTime}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" />
                        {slot.staffName} · {slot.durationMins} min
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs flex-shrink-0"
                    disabled={isBooking || !!bookingSlot}
                    onClick={() => handleBookSlot(slot)}
                  >
                    {isBooking ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Book this slot"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {booked && (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <CalendarCheck className="w-10 h-10 text-green-600 dark:text-green-400" />
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              Appointment booked successfully!
            </p>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main WaitlistActionButtons ───────────────────────────────────────────────

export function WaitlistActionButtons({
  id,
  currentStatus,
  position,
  totalWaiting,
  entry,
  services,
  staff,
  bookingLink,
}: WaitlistActionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ConvertFormValues>({
    resolver: zodResolver(convertSchema),
    defaultValues: {
      staffId: entry.staffId ?? "",
      serviceId: entry.serviceId ?? "",
      date: entry.preferredDate ?? today,
      startTime: timeRangeToTime(entry.preferredTime),
      notes: entry.note ?? "",
    },
  });

  function handleMoveUp() {
    if (position <= 1) return;
    startTransition(async () => {
      await reprioritizeWaitlist(id, position - 1);
      router.refresh();
    });
  }

  function handleMoveDown() {
    if (position >= totalWaiting) return;
    startTransition(async () => {
      await reprioritizeWaitlist(id, position + 1);
      router.refresh();
    });
  }

  async function handleRemove() {
    startTransition(async () => {
      await removeFromWaitlist(id);
      router.refresh();
    });
  }

  async function onConvertSubmit(values: ConvertFormValues) {
    setServerError(null);
    const result = await convertToAppointment(id, {
      staffId: values.staffId,
      serviceIds: [values.serviceId],
      date: values.date,
      startTime: values.startTime,
      notes: values.notes,
      clientId: entry.clientId,
    });
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setConvertOpen(false);
    router.refresh();
  }

  const isActive = currentStatus !== "CANCELLED" && currentStatus !== "BOOKED";
  const isWaiting = currentStatus === "WAITING";

  return (
    <div className="flex items-center gap-1 flex-wrap justify-end">
      {/* Move Up / Down — only for WAITING entries */}
      {isWaiting && (
        <div className="flex flex-col gap-0.5 mr-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-6 p-0 text-muted-foreground hover:text-foreground"
            disabled={isPending || position <= 1}
            onClick={handleMoveUp}
            title="Move up"
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-6 p-0 text-muted-foreground hover:text-foreground"
            disabled={isPending || position >= totalWaiting}
            onClick={handleMoveDown}
            title="Move down"
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Smart Slot Finder — only for WAITING/NOTIFIED with a service */}
      {isActive && entry.serviceId && (
        <SlotFinderDialog
          waitlistId={id}
          entry={entry}
          disabled={isPending}
        />
      )}

      {/* Convert to Appointment (manual) */}
      {isActive && (
        <Dialog
          open={convertOpen}
          onOpenChange={(o) => {
            setConvertOpen(o);
            setServerError(null);
          }}
        >
          <DialogTrigger
            render={
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={isPending}
              />
            }
          >
            <CalendarPlus className="w-3 h-3" />
            Book
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Convert to Appointment</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground -mt-1">
              Booking{" "}
              <span className="font-medium text-foreground">{entry.name}</span>
              {entry.serviceName ? ` for ${entry.serviceName}` : ""}
            </p>

            <form
              onSubmit={handleSubmit(onConvertSubmit)}
              className="flex flex-col gap-4 mt-1"
            >
              {/* Service */}
              <div className="flex flex-col gap-1.5">
                <Label>
                  Service <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="serviceId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.serviceId && (
                  <p className="text-xs text-destructive">
                    {errors.serviceId.message}
                  </p>
                )}
              </div>

              {/* Staff */}
              <div className="flex flex-col gap-1.5">
                <Label>
                  Staff <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="staffId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select staff" />
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
                  <p className="text-xs text-destructive">
                    {errors.staffId.message}
                  </p>
                )}
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="conv-date">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="conv-date"
                    type="date"
                    aria-invalid={!!errors.date}
                    {...register("date")}
                  />
                  {errors.date && (
                    <p className="text-xs text-destructive">
                      {errors.date.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="conv-time">
                    Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="conv-time"
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

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conv-notes">Notes</Label>
                <Input
                  id="conv-notes"
                  placeholder="Any notes…"
                  {...register("notes")}
                />
              </div>

              {serverError && (
                <p className="text-xs text-destructive">{serverError}</p>
              )}

              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Booking…
                    </>
                  ) : (
                    "Create Appointment"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Notify */}
      {currentStatus === "WAITING" && (
        <NotifyDialog
          id={id}
          entry={{
            name: entry.name,
            phone: entry.phone,
            serviceName: entry.serviceName,
          }}
          bookingLink={bookingLink}
        />
      )}

      {/* Remove */}
      {currentStatus !== "BOOKED" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={isPending}
          onClick={handleRemove}
          title="Remove from waitlist"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
