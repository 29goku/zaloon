"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requestBooking, getAvailableSlots } from "@/app/actions/booking";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  avatar: string | null;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  staff: StaffMember[];
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  services: ServiceItem[];
}

interface SalonInfo {
  id: string;
  name: string;
  logo: string | null;
  slug: string;
  city: string | null;
  currency: string | null;
}

interface BookingWizardProps {
  salon: SalonInfo;
  categories: Category[];
}

// ─── Contact form schema ─────────────────────────────────────────────────────────

const contactSchema = z.object({
  clientName: z.string().min(1, "Name is required"),
  clientPhone: z.string().min(1, "Phone is required"),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  note: z.string().optional(),
});

type ContactValues = z.infer<typeof contactSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: string | null): string {
  const c = currency ?? "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(price);
  } catch {
    return `${c} ${price.toFixed(2)}`;
  }
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTimeDisplay(time: string): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

// Get the set of staff IDs that can perform ALL selected services
function getCommonStaff(services: ServiceItem[]): StaffMember[] {
  if (services.length === 0) return [];
  const staffSets = services.map(
    (svc) => new Set(svc.staff.map((s) => s.id))
  );
  const commonIds = [...staffSets[0]].filter((id) =>
    staffSets.every((set) => set.has(id))
  );
  // De-duplicate staff objects
  const allStaff = services.flatMap((svc) => svc.staff);
  const seen = new Set<string>();
  return allStaff.filter((s) => {
    if (commonIds.includes(s.id) && !seen.has(s.id)) {
      seen.add(s.id);
      return true;
    }
    return false;
  });
}

// ─── Step indicator ──────────────────────────────────────────────────────────────

const STEPS = ["Services", "Staff & Time", "Your Info", "Confirm"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 px-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={[
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200",
                i < current
                  ? "bg-emerald-500 text-white"
                  : i === current
                  ? "bg-rose-500 text-white shadow-sm shadow-rose-200"
                  : "bg-stone-100 text-stone-400",
              ].join(" ")}
            >
              {i < current ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={[
                "text-[10px] font-medium hidden sm:block whitespace-nowrap",
                i === current
                  ? "text-rose-500"
                  : i < current
                  ? "text-emerald-500"
                  : "text-stone-400",
              ].join(" ")}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={[
                "w-6 sm:w-10 h-0.5 mx-1 mt-[-14px] sm:mt-[-22px] transition-colors duration-300",
                i < current ? "bg-emerald-400" : "bg-stone-200",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Cart badge ──────────────────────────────────────────────────────────────────

function CartBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
      {count}
    </span>
  );
}

// ─── Slot time button ────────────────────────────────────────────────────────────

function TimeSlot({
  time,
  selected,
  onClick,
}: {
  time: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-10 px-3 rounded-lg text-sm font-medium transition-all duration-150 border",
        selected
          ? "bg-rose-500 border-rose-500 text-white shadow-sm"
          : "bg-white border-stone-200 text-stone-700 hover:border-rose-300 hover:bg-rose-50",
      ].join(" ")}
    >
      {formatTimeDisplay(time)}
    </button>
  );
}

// ─── Simple inline calendar (month grid) ─────────────────────────────────────────

function MiniCalendar({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (date: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startDow = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const monthLabel = firstOfMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells: Array<number | null> = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-stone-700">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }
          const cellDate = new Date(viewYear, viewMonth, day);
          cellDate.setHours(0, 0, 0, 0);
          const isPast = cellDate < today;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = selected === dateStr;
          const isToday = cellDate.getTime() === today.getTime();

          return (
            <button
              type="button"
              key={dateStr}
              disabled={isPast}
              onClick={() => onSelect(dateStr)}
              className={[
                "mx-auto w-8 h-8 rounded-full text-sm flex items-center justify-center transition-all duration-150",
                isPast
                  ? "text-stone-300 cursor-not-allowed"
                  : isSelected
                  ? "bg-rose-500 text-white font-semibold shadow-sm"
                  : isToday
                  ? "border border-rose-300 text-rose-500 font-semibold hover:bg-rose-50"
                  : "text-stone-700 hover:bg-stone-100",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Staff avatar ─────────────────────────────────────────────────────────────────

function StaffAvatar({ member, size = "md" }: { member: StaffMember; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-sm";
  if (member.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatar}
        alt={member.name}
        className={`${sizeClass} rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-semibold uppercase`}
    >
      {member.name.charAt(0)}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────────

export function BookingWizard({ salon, categories }: BookingWizardProps) {
  const router = useRouter();

  // Step: 0=Services, 1=Staff+Time, 2=Info, 3=Confirm
  const [step, setStep] = useState(0);

  // Multi-select service cart
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // Slot loading state
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, startSlotsTransition] = useTransition();
  const [slotsDate, setSlotsDate] = useState(""); // the date we loaded slots for

  // Contact form
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
  });

  // Total duration for slot loading
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMins, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  // Load slots whenever staff + date change
  useEffect(() => {
    if (!selectedStaff || !selectedDate || totalDuration === 0) {
      setSlots([]);
      setSlotsDate("");
      return;
    }
    if (slotsDate === selectedDate) return; // already loaded for this date
    setSelectedTime("");
    startSlotsTransition(async () => {
      const result = await getAvailableSlots(selectedStaff.id, selectedDate, totalDuration);
      setSlots(result);
      setSlotsDate(selectedDate);
    });
  }, [selectedStaff, selectedDate, totalDuration, slotsDate]);

  // Reset slots when staff changes
  useEffect(() => {
    setSlots([]);
    setSlotsDate("");
    setSelectedTime("");
    setSelectedDate("");
  }, [selectedStaff]);

  // ── Service toggle ────────────────────────────────────────────────────────────

  function toggleService(svc: ServiceItem) {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === svc.id);
      const next = exists ? prev.filter((s) => s.id !== svc.id) : [...prev, svc];
      return next;
    });
    // Reset downstream selections when cart changes
    setSelectedStaff(null);
  }

  const availableStaff = getCommonStaff(selectedServices);

  // ── Step 0: Services ──────────────────────────────────────────────────────────

  function renderServiceStep() {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-800 mb-1">Choose your services</h2>
          <p className="text-stone-500 text-sm">
            Select one or more services — then we&apos;ll find you the right staff.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-10 text-stone-400 text-sm">
            No services available at this time.
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
                    {cat.name}
                  </h3>
                </div>
                <div className="space-y-2">
                  {cat.services.map((svc) => {
                    const isSelected = !!selectedServices.find((s) => s.id === svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleService(svc)}
                        className={[
                          "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-150 text-left group",
                          isSelected
                            ? "border-rose-400 bg-rose-50"
                            : "border-stone-100 bg-white hover:border-rose-200 hover:bg-rose-50/40",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={[
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                              isSelected
                                ? "border-rose-500 bg-rose-500"
                                : "border-stone-300 group-hover:border-rose-300",
                            ].join(" ")}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={[
                                "font-medium text-sm truncate",
                                isSelected ? "text-rose-700" : "text-stone-800",
                              ].join(" ")}
                            >
                              {svc.name}
                            </p>
                            <p className="text-xs text-stone-400 mt-0.5">
                              {formatDuration(svc.durationMins)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={[
                            "font-semibold text-sm ml-4 shrink-0",
                            isSelected ? "text-rose-600" : "text-stone-600",
                          ].join(" ")}
                        >
                          {formatPrice(svc.price, salon.currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cart summary */}
        {selectedServices.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-stone-500">
                {selectedServices.length} service{selectedServices.length > 1 ? "s" : ""} selected
              </span>
              <span className="font-semibold text-stone-800">{formatPrice(totalPrice, salon.currency)}</span>
            </div>
            <p className="text-xs text-stone-400">{formatDuration(totalDuration)} total</p>
          </div>
        )}

        <button
          type="button"
          disabled={selectedServices.length === 0}
          onClick={() => setStep(1)}
          className="w-full mt-5 h-12 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-rose-200"
        >
          Continue
          <CartBadge count={selectedServices.length} />
        </button>
      </div>
    );
  }

  // ── Step 1: Staff & Time ──────────────────────────────────────────────────────

  function renderStaffTimeStep() {
    const noStaff = availableStaff.length === 0;

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-800 mb-1">Staff &amp; Date / Time</h2>
          <p className="text-stone-500 text-sm">
            Who would you like, and when works for you?
          </p>
        </div>

        {/* Staff selection */}
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-3">
            Staff member
          </p>
          {noStaff ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              No staff member offers all your selected services. Try a different combination.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableStaff.map((member) => {
                const isSelected = selectedStaff?.id === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedStaff(isSelected ? null : member)}
                    className={[
                      "flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-150 text-left",
                      isSelected
                        ? "border-rose-400 bg-rose-50"
                        : "border-stone-100 bg-white hover:border-rose-200 hover:bg-rose-50/40",
                    ].join(" ")}
                  >
                    <StaffAvatar member={member} />
                    <div>
                      <p
                        className={[
                          "font-semibold text-sm",
                          isSelected ? "text-rose-700" : "text-stone-800",
                        ].join(" ")}
                      >
                        {member.name}
                      </p>
                      {isSelected && (
                        <p className="text-xs text-rose-400 mt-0.5">Selected</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Calendar — only show once staff is picked */}
        {selectedStaff && (
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-3">
              Pick a date
            </p>
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />
            </div>
          </div>
        )}

        {/* Time slots — only show once date is picked */}
        {selectedStaff && selectedDate && (
          <div className="mb-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-3">
              Available times
            </p>
            {slotsLoading ? (
              <div className="flex items-center gap-2 text-sm text-stone-400 py-3">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Loading available times…
              </div>
            ) : slots.length === 0 ? (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-500 text-center">
                No available slots on{" "}
                <span className="font-medium text-stone-700">
                  {formatDateDisplay(selectedDate)}
                </span>
                . Try another date.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((time) => (
                  <TimeSlot
                    key={time}
                    time={time}
                    selected={selectedTime === time}
                    onClick={() => setSelectedTime(time)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="flex-1 h-12 rounded-xl border-2 border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!selectedStaff || !selectedDate || !selectedTime}
            onClick={() => setStep(2)}
            className="flex-1 h-12 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-rose-200"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Your Info ──────────────────────────────────────────────────────────

  function renderInfoStep() {
    return (
      <form
        onSubmit={handleSubmit(() => setStep(3))}
      >
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-800 mb-1">Your details</h2>
          <p className="text-stone-500 text-sm">We&apos;ll use this to confirm your booking.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="clientName"
              className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-2"
            >
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="clientName"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              {...register("clientName")}
              className="w-full h-12 px-4 rounded-xl border-2 border-stone-200 bg-white text-stone-800 text-sm placeholder:text-stone-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
            />
            {errors.clientName && (
              <p className="text-rose-500 text-xs mt-1">{errors.clientName.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="clientPhone"
              className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-2"
            >
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              id="clientPhone"
              type="tel"
              autoComplete="tel"
              placeholder="+1 555 000 0000"
              {...register("clientPhone")}
              className="w-full h-12 px-4 rounded-xl border-2 border-stone-200 bg-white text-stone-800 text-sm placeholder:text-stone-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
            />
            {errors.clientPhone && (
              <p className="text-rose-500 text-xs mt-1">{errors.clientPhone.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="clientEmail"
              className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-2"
            >
              Email{" "}
              <span className="normal-case font-normal text-stone-400 tracking-normal">
                (optional)
              </span>
            </label>
            <input
              id="clientEmail"
              type="email"
              autoComplete="email"
              placeholder="jane@example.com"
              {...register("clientEmail")}
              className="w-full h-12 px-4 rounded-xl border-2 border-stone-200 bg-white text-stone-800 text-sm placeholder:text-stone-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
            />
            {errors.clientEmail && (
              <p className="text-rose-500 text-xs mt-1">{errors.clientEmail.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="note"
              className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-2"
            >
              Note{" "}
              <span className="normal-case font-normal text-stone-400 tracking-normal">
                (optional)
              </span>
            </label>
            <textarea
              id="note"
              rows={3}
              placeholder="Any special requests or allergies we should know?"
              {...register("note")}
              className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-800 text-sm placeholder:text-stone-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 h-12 rounded-xl border-2 border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 h-12 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
          >
            Review Booking
          </button>
        </div>
      </form>
    );
  }

  // ── Step 3: Confirm ────────────────────────────────────────────────────────────

  async function onConfirm() {
    if (!selectedStaff || !selectedDate || !selectedTime || selectedServices.length === 0) return;
    const values = getValues();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await requestBooking(salon.slug, {
        serviceIds: selectedServices.map((s) => s.id),
        staffId: selectedStaff.id,
        date: selectedDate,
        startTime: selectedTime,
        clientName: values.clientName,
        clientPhone: values.clientPhone,
        clientEmail: values.clientEmail,
        note: values.note,
      });
      if (result.success) {
        router.push(`/book/${salon.slug}/confirmation/${result.appointmentId}`);
      } else {
        setSubmitError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderConfirmStep() {
    const values = getValues();
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-800 mb-1">Confirm your booking</h2>
          <p className="text-stone-500 text-sm">Review the details below before confirming.</p>
        </div>

        {/* Booking summary card */}
        <div className="rounded-xl border-2 border-stone-100 bg-stone-50 divide-y divide-stone-100 text-sm mb-4">
          {/* Services */}
          <div className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-3">
              Services
            </p>
            <div className="space-y-2">
              {selectedServices.map((svc) => (
                <div key={svc.id} className="flex justify-between">
                  <div>
                    <span className="font-medium text-stone-700">{svc.name}</span>
                    <span className="text-stone-400 ml-2 text-xs">
                      {formatDuration(svc.durationMins)}
                    </span>
                  </div>
                  <span className="font-medium text-stone-700">
                    {formatPrice(svc.price, salon.currency)}
                  </span>
                </div>
              ))}
              {selectedServices.length > 1 && (
                <div className="flex justify-between pt-2 border-t border-stone-200 font-semibold text-stone-800">
                  <span>Total</span>
                  <span>{formatPrice(totalPrice, salon.currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Staff */}
          <div className="p-4 flex items-center gap-3">
            <StaffAvatar member={selectedStaff!} size="sm" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 leading-none mb-1">
                Staff
              </p>
              <p className="font-medium text-stone-700">{selectedStaff?.name}</p>
            </div>
          </div>

          {/* Date & Time */}
          <div className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-2">
              Date &amp; Time
            </p>
            <p className="font-medium text-stone-700">
              {formatDateDisplay(selectedDate)}{" "}
              <span className="text-stone-400">at</span> {formatTimeDisplay(selectedTime)}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">{formatDuration(totalDuration)} session</p>
          </div>

          {/* Client info */}
          <div className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-2">
              Your Details
            </p>
            <p className="font-medium text-stone-700">{values.clientName}</p>
            <p className="text-stone-500 text-xs mt-0.5">{values.clientPhone}</p>
            {values.clientEmail && (
              <p className="text-stone-500 text-xs">{values.clientEmail}</p>
            )}
            {values.note && (
              <p className="text-stone-500 text-xs mt-1 italic">&ldquo;{values.note}&rdquo;</p>
            )}
          </div>
        </div>

        {submitError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {submitError}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl border-2 border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="flex-1 h-12 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-rose-200 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Confirming…
              </>
            ) : (
              "Confirm Booking"
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Wizard content only (page.tsx owns the outer layout) ─────────────────────

  return (
    <>
      <StepIndicator current={step} />
      {step === 0 && renderServiceStep()}
      {step === 1 && renderStaffTimeStep()}
      {step === 2 && renderInfoStep()}
      {step === 3 && renderConfirmStep()}
    </>
  );
}
