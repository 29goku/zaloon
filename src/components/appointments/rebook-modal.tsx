"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  User,
  Scissors,
  BadgeDollarSign,
} from "lucide-react";
import {
  rebookAppointment,
  getAvailableSlotsForRebook,
} from "@/app/actions/appointments";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RebookModalProps {
  appointment: {
    id: string;
    staffId: string;
    clientName: string;
    services: string[];
    staffName: string;
    totalAmount: number;
  };
  onClose: () => void;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

type Step = "date" | "time" | "confirm";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Mini calendar ─────────────────────────────────────────────────────────────

interface MiniCalendarProps {
  selected: string | null;
  onSelect: (ymd: string) => void;
  originalDate: string | null;
}

function MiniCalendar({ selected, onSelect, originalDate }: MiniCalendarProps) {
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Start from today's month
  const [viewYear, setViewYear] = React.useState(today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());

  // 4-week window: today to today+28
  const maxDate = addDays(today, 28);

  // Get original day-of-week for pre-selection hint
  const origDayOfWeek = originalDate
    ? fromYMD(originalDate).getDay()
    : null;

  // Build calendar grid for current view month
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const lastOfMonth = new Date(viewYear, viewMonth + 1, 0);
  const startPad = firstOfMonth.getDay(); // 0=Sun
  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
  ];
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    cells.push(new Date(viewYear, viewMonth, d));
  }
  // Pad to 6 rows
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const canGoPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const canGoNext = new Date(viewYear, viewMonth, 1) < new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold text-foreground">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          disabled={!canGoNext}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_NAMES.map((n) => (
          <div key={n} className="text-center text-xs font-medium text-muted-foreground py-1">
            {n}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) {
            return <div key={`pad-${i}`} />;
          }
          const ymd = toYMD(date);
          const isSelected = selected === ymd;
          const isToday = sameDay(date, today);
          const isDisabled = date < today || date > maxDate;
          const isSameDow = origDayOfWeek !== null && date.getDay() === origDayOfWeek && !isDisabled;

          return (
            <button
              key={ymd}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(ymd)}
              title={isSameDow && !isSelected ? "Same day as original" : undefined}
              className={[
                "relative aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                  ? "bg-muted text-foreground ring-1 ring-primary"
                  : isSameDow
                  ? "text-foreground bg-primary/10 hover:bg-primary/20"
                  : "text-foreground hover:bg-muted",
                isDisabled
                  ? "opacity-30 cursor-not-allowed hover:bg-transparent"
                  : "cursor-pointer",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {date.getDate()}
              {isSameDow && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Dates highlighted with a dot match the original day of week.
      </p>
    </div>
  );
}

// ─── Time slot grid ────────────────────────────────────────────────────────────

interface TimeGridProps {
  availableSlots: string[];
  selected: string | null;
  loading: boolean;
  onSelect: (time: string) => void;
}

function TimeGrid({ availableSlots, selected, loading, onSelect }: TimeGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-10">
        <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No available slots for this date.</p>
        <p className="text-xs text-muted-foreground mt-1">Please choose a different date.</p>
      </div>
    );
  }

  // Group by AM/PM
  const am = availableSlots.filter((s) => parseInt(s.split(":")[0]) < 12);
  const pm = availableSlots.filter((s) => parseInt(s.split(":")[0]) >= 12);

  function fmt12(time: string) {
    const [h, m] = time.split(":").map(Number);
    const period = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }

  const SlotGroup = ({ label, slots }: { label: string; slots: string[] }) =>
    slots.length > 0 ? (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => onSelect(slot)}
              className={[
                "rounded-lg border py-2 text-sm font-medium transition-colors",
                selected === slot
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground hover:border-primary hover:bg-primary/10",
              ].join(" ")}
            >
              {fmt12(slot)}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      <SlotGroup label="Morning" slots={am} />
      <SlotGroup label="Afternoon & Evening" slots={pm} />
    </div>
  );
}

// ─── Confirm card ──────────────────────────────────────────────────────────────

interface ConfirmCardProps {
  clientName: string;
  services: string[];
  staffName: string;
  date: string;
  time: string;
  totalAmount: number;
}

function ConfirmCard({
  clientName,
  services,
  staffName,
  date,
  time,
  totalAmount,
}: ConfirmCardProps) {
  const dateLabel = fromYMD(date).toLocaleDateString("en", { dateStyle: "long" });
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const timeLabel = `${h12}:${String(m).padStart(2, "0")} ${period}`;

  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3 text-sm">
      <div className="flex items-center gap-2 text-foreground">
        <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="font-medium">{clientName}</span>
      </div>
      <div className="flex items-center gap-2 text-foreground">
        <Scissors className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span>{staffName}</span>
      </div>
      <div className="flex items-center gap-2 text-foreground">
        <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span>{dateLabel} at {timeLabel}</span>
      </div>
      <div className="flex items-start gap-2 text-foreground">
        <Scissors className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <span>{services.join(", ")}</span>
      </div>
      <div className="flex items-center gap-2 text-foreground">
        <BadgeDollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="font-bold">
          {totalAmount.toLocaleString("en", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
          })}
        </span>
      </div>
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export function RebookModal({
  appointment,
  onClose,
  onSuccess,
  trigger,
}: RebookModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("date");

  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = React.useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  // Reset state when modal opens
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Small delay so close animation plays
      setTimeout(() => {
        setStep("date");
        setSelectedDate(null);
        setSelectedTime(null);
        setAvailableSlots([]);
        setError(null);
        setDone(false);
        onClose();
      }, 300);
    }
  }

  // Load slots when date is picked
  async function handleDateSelect(ymd: string) {
    setSelectedDate(ymd);
    setSelectedTime(null);
    setSlotsLoading(true);
    const slots = await getAvailableSlotsForRebook(appointment.staffId, ymd);
    setAvailableSlots(slots);
    setSlotsLoading(false);
    setStep("time");
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time);
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError(null);

    const result = await rebookAppointment(
      appointment.id,
      selectedDate,
      selectedTime
    );

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setDone(true);
    router.refresh();
    setTimeout(() => {
      handleOpenChange(false);
      onSuccess();
    }, 1200);
  }

  const STEP_TITLES: Record<Step, string> = {
    date: "Pick a date",
    time: "Choose a time",
    confirm: "Confirm rebooking",
  };

  const STEP_IDX: Record<Step, number> = { date: 0, time: 1, confirm: 2 };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger render={<span onClick={() => setOpen(true)} />}>
          {trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            />
          }
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Rebook
        </DialogTrigger>
      )}

      <DialogContent
        showCloseButton={false}
        className="w-full max-w-md mx-auto rounded-2xl bg-card border-border p-0 overflow-hidden focus:outline-none"
      >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-3">
              {step !== "date" && !done && (
                <button
                  type="button"
                  onClick={() => {
                    if (step === "time") setStep("date");
                    if (step === "confirm") setStep("time");
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Rebook Appointment
                </DialogTitle>
                {!done && (
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {STEP_TITLES[step]}
                  </DialogDescription>
                )}
              </div>
            </div>
            <DialogClose
              render={
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                />
              }
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          {/* Step indicator */}
          {!done && (
            <div className="flex gap-1 px-5 pb-3">
              {(["date", "time", "confirm"] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className={[
                    "h-1 flex-1 rounded-full transition-colors",
                    STEP_IDX[step] >= i ? "bg-primary" : "bg-border",
                  ].join(" ")}
                />
              ))}
            </div>
          )}

          {/* Body */}
          <div className="px-5 pb-5">
            {/* ── Success state ── */}
            {done && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-7 h-7 text-primary" />
                </div>
                <p className="font-semibold text-foreground text-lg">Appointment booked!</p>
                <p className="text-sm text-muted-foreground">
                  The follow-up appointment has been created successfully.
                </p>
              </div>
            )}

            {/* ── Step: date ── */}
            {!done && step === "date" && (
              <div className="space-y-4">
                {/* Appointment summary */}
                <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground flex gap-4 flex-wrap">
                  <span><span className="font-medium text-foreground">Client:</span> {appointment.clientName}</span>
                  <span><span className="font-medium text-foreground">Staff:</span> {appointment.staffName}</span>
                </div>
                <MiniCalendar
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  originalDate={null}
                />
              </div>
            )}

            {/* ── Step: time ── */}
            {!done && step === "time" && selectedDate && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
                  <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground">
                    {fromYMD(selectedDate).toLocaleDateString("en", { dateStyle: "long" })}
                  </span>
                </div>
                <TimeGrid
                  availableSlots={availableSlots}
                  selected={selectedTime}
                  loading={slotsLoading}
                  onSelect={handleTimeSelect}
                />
                {availableSlots.length > 0 && !selectedTime && (
                  <p className="text-xs text-muted-foreground text-center">
                    Select a time slot above to continue.
                  </p>
                )}
              </div>
            )}

            {/* ── Step: confirm ── */}
            {!done && step === "confirm" && selectedDate && selectedTime && (
              <div className="space-y-4">
                <ConfirmCard
                  clientName={appointment.clientName}
                  services={appointment.services}
                  staffName={appointment.staffName}
                  date={selectedDate}
                  time={selectedTime}
                  totalAmount={appointment.totalAmount}
                />

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  className="w-full gap-2"
                  onClick={handleConfirm}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Booking…
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm Rebooking
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
      </DialogContent>
    </Dialog>
  );
}
