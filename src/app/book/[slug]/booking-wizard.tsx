"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAvailableSlots } from "@/app/actions/booking";
import { bookAppointmentPublic } from "@/app/actions/appointments";
import { calculateDynamicPrice } from "@/app/actions/pricing-rules";
import type { BlackoutDate, ExtendedBookingRules } from "@/app/actions/settings";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  categoryId: string;
  isAddon: boolean;
  onlineBooking: boolean;
}

interface CategoryItem {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  name: string;
  avatar?: string | null;
  /** serviceIds this staff member can perform */
  serviceIds: string[];
}

interface SalonInfo {
  id: string;
  name: string;
  logo?: string | null;
  slug: string;
  city?: string | null;
  currency: string | null;
}

export interface BookingWizardProps {
  salon: SalonInfo;
  services: ServiceItem[];
  categories: CategoryItem[];
  staff: StaffMember[];
  blackoutDates?: BlackoutDate[];
  bookingRules?: ExtendedBookingRules;
}

// ─── Contact form schema ──────────────────────────────────────────────────────

const contactSchema = z.object({
  clientName: z.string().min(1, "Name is required"),
  clientPhone: z.string().min(1, "Phone is required"),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  note: z.string().optional(),
});

type ContactValues = z.infer<typeof contactSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ["Services", "Staff", "Date & Time", "Your Info", "Confirm"] as const;

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
                "w-4 sm:w-8 h-0.5 mx-1 mt-[-14px] sm:mt-[-22px] transition-colors duration-300",
                i < current ? "bg-emerald-400" : "bg-stone-200",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Summary bar (sticky bottom) ─────────────────────────────────────────────

function SummaryBar({
  services,
  currency,
}: {
  services: ServiceItem[];
  currency: string | null;
}) {
  if (services.length === 0) return null;
  const totalDuration = services.reduce((sum, s) => sum + s.durationMins, 0);
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-stone-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-3 flex items-center justify-between z-10 rounded-b-xl">
      <div>
        <p className="text-xs font-semibold text-stone-700">
          {services.length} service{services.length > 1 ? "s" : ""} selected
        </p>
        <p className="text-xs text-stone-400">{formatDuration(totalDuration)} total</p>
      </div>
      <p className="text-base font-bold text-rose-600">{formatPrice(totalPrice, currency)}</p>
    </div>
  );
}

// ─── Staff avatar ─────────────────────────────────────────────────────────────

function StaffAvatar({
  member,
  size = "md",
}: {
  member: { name: string; avatar?: string | null };
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "w-8 h-8 text-xs"
      : size === "lg"
      ? "w-14 h-14 text-xl"
      : "w-10 h-10 text-sm";
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

// ─── Time slot button ─────────────────────────────────────────────────────────

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
          ? "bg-amber-500 border-amber-500 text-white shadow-sm"
          : "bg-white border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-amber-50",
      ].join(" ")}
    >
      {formatTimeDisplay(time)}
    </button>
  );
}

// ─── Stripe deposit form placeholder ─────────────────────────────────────────
// Actual Stripe integration will be wired when Stripe keys are configured.

function StripeDepositForm({
  depositLabel,
  onSkip,
}: {
  depositLabel: string;
  onSkip: () => void;
}) {
  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-stone-800 text-sm">Deposit required</p>
          <p className="text-stone-600 text-sm mt-0.5">{depositLabel}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="w-full h-11 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm"
      >
        Pay Deposit
      </button>
    </div>
  );
}

// ─── Mini calendar ────────────────────────────────────────────────────────────

function isBlackedOut(dateStr: string, blackouts: BlackoutDate[]): boolean {
  for (const b of blackouts) {
    if (b.recurring) {
      const startMD = b.startDate.slice(5);
      const endMD = b.endDate.slice(5);
      const checkMD = dateStr.slice(5);
      // Handle year-spanning recurring ranges (e.g. Dec-Jan)
      if (startMD <= endMD) {
        if (checkMD >= startMD && checkMD <= endMD) return true;
      } else {
        if (checkMD >= startMD || checkMD <= endMD) return true;
      }
    } else {
      if (dateStr >= b.startDate && dateStr <= b.endDate) return true;
    }
  }
  return false;
}

function MiniCalendar({
  selected,
  onSelect,
  blackoutDates = [],
}: {
  selected: string;
  onSelect: (date: string) => void;
  blackoutDates?: BlackoutDate[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startDow = firstOfMonth.getDay();
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

      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

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
          const isBlocked = isBlackedOut(dateStr, blackoutDates);
          const isDisabled = isPast || isBlocked;

          return (
            <button
              type="button"
              key={dateStr}
              disabled={isDisabled}
              onClick={() => onSelect(dateStr)}
              title={isBlocked ? "This date is unavailable for booking" : undefined}
              className={[
                "mx-auto w-8 h-8 rounded-full text-sm flex items-center justify-center transition-all duration-150",
                isPast
                  ? "text-stone-300 cursor-not-allowed"
                  : isBlocked
                  ? "bg-red-100 text-red-300 cursor-not-allowed line-through"
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

// ─── Main wizard ──────────────────────────────────────────────────────────────

const NO_PREFERENCE_ID = "__no_preference__";

export function BookingWizard({ salon, services, categories, staff, blackoutDates = [], bookingRules }: BookingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Pre-selection from URL params (?services=id1,id2&staff=staffId) ──────────
  const didPreselect = useRef(false);

  // 0=Services, 1=Staff, 2=Date+Time, 3=Info, 4=Confirm
  const [step, setStep] = useState(0);

  // Step 1: selected services
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");

  // Step 2: staff
  // null = not chosen yet; NO_PREFERENCE_ID string = no preference selected
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // ── Apply URL pre-selection once on mount ────────────────────────────────────
  useEffect(() => {
    if (didPreselect.current) return;
    didPreselect.current = true;

    const serviceParam = searchParams.get("services");
    const staffParam = searchParams.get("staff");

    if (serviceParam) {
      const ids = serviceParam.split(",").map((s) => s.trim()).filter(Boolean);
      const preselected = ids
        .map((id) => services.find((s) => s.id === id))
        .filter((s): s is ServiceItem => s !== undefined);
      if (preselected.length > 0) {
        setSelectedServices(preselected);
        // Jump to step 1 (staff selection) since services are pre-filled
        setStep(1);
      }
    }

    if (staffParam) {
      const found = staff.find((m) => m.id === staffParam);
      if (found) {
        setSelectedStaffId(found.id);
        // If services were also pre-filled, jump to step 2 (date/time)
        if (serviceParam) {
          setStep(2);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 3: date + time
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, startSlotsTransition] = useTransition();
  const [slotsDateLoaded, setSlotsDateLoaded] = useState("");

  // Dynamic pricing state
  const [pricingInfo, setPricingInfo] = useState<{
    serviceId: string;
    serviceName: string;
    basePrice: number;
    finalPrice: number;
    appliedRules: { name: string; adjustment: number }[];
  } | null>(null);
  const [, startPricingTransition] = useTransition();

  // Step 4: contact form
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });

  // Step 5: submit
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMins, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  // Staff who can perform ALL selected services
  const selectedServiceIds = selectedServices.map((s) => s.id);
  const eligibleStaff =
    selectedServiceIds.length === 0
      ? staff
      : staff.filter((m) => selectedServiceIds.every((sid) => m.serviceIds.includes(sid)));

  // The resolved staff id to use for slot loading (first eligible if no preference)
  const resolvedStaffIdForSlots =
    selectedStaffId === NO_PREFERENCE_ID
      ? (eligibleStaff[0]?.id ?? null)
      : selectedStaffId;

  // Filtered services for the current category tab
  const filteredServices =
    activeCategoryId === "all"
      ? services
      : services.filter((s) => s.categoryId === activeCategoryId);

  // ── Load slots when staff + date change ─────────────────────────────────────

  useEffect(() => {
    if (!resolvedStaffIdForSlots || !selectedDate || totalDuration === 0) {
      setSlots([]);
      setSlotsDateLoaded("");
      return;
    }
    if (slotsDateLoaded === `${resolvedStaffIdForSlots}:${selectedDate}`) return;
    setSelectedTime("");
    const key = `${resolvedStaffIdForSlots}:${selectedDate}`;
    startSlotsTransition(async () => {
      const result = await getAvailableSlots(resolvedStaffIdForSlots, selectedDate, totalDuration);
      setSlots(result);
      setSlotsDateLoaded(key);
    });
  }, [resolvedStaffIdForSlots, selectedDate, totalDuration, slotsDateLoaded]);

  // Reset slots when staff selection changes
  useEffect(() => {
    setSlots([]);
    setSlotsDateLoaded("");
    setSelectedTime("");
    setSelectedDate("");
  }, [selectedStaffId]);

  // ── Dynamic pricing: fetch when date + time + service are known ──────────────
  useEffect(() => {
    const firstService = selectedServices[0];
    if (!firstService || !selectedDate || !selectedTime) {
      setPricingInfo(null);
      return;
    }
    startPricingTransition(async () => {
      const result = await calculateDynamicPrice(firstService.id, selectedDate, selectedTime);
      setPricingInfo({
        serviceId: firstService.id,
        serviceName: firstService.name,
        basePrice: result.basePrice,
        finalPrice: result.finalPrice,
        appliedRules: result.appliedRules,
      });
    });
  }, [selectedServices, selectedDate, selectedTime]);

  // ── Service toggle ───────────────────────────────────────────────────────────

  function toggleService(svc: ServiceItem) {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === svc.id);
      return exists ? prev.filter((s) => s.id !== svc.id) : [...prev, svc];
    });
    // Reset downstream when cart changes
    setSelectedStaffId(null);
  }

  // ── Step 0: Services ─────────────────────────────────────────────────────────

  function renderServiceStep() {
    return (
      <div>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-stone-800 mb-1">Choose your services</h2>
          <p className="text-stone-500 text-sm">
            Select one or more services. Add-ons can be combined.
          </p>
        </div>

        {/* Category filter tabs */}
        {categories.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-5">
            <button
              type="button"
              onClick={() => setActiveCategoryId("all")}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                activeCategoryId === "all"
                  ? "bg-rose-500 border-rose-500 text-white"
                  : "bg-white border-stone-200 text-stone-600 hover:border-rose-300 hover:bg-rose-50",
              ].join(" ")}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                  activeCategoryId === cat.id
                    ? "bg-rose-500 border-rose-500 text-white"
                    : "bg-white border-stone-200 text-stone-600 hover:border-rose-300 hover:bg-rose-50",
                ].join(" ")}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {filteredServices.length === 0 ? (
          <div className="text-center py-10 text-stone-400 text-sm">
            No services available at this time.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredServices.map((svc) => {
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
                        {svc.isAddon && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            Add-on
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">{formatDuration(svc.durationMins)}</p>
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
        )}

        {/* Sticky summary bar */}
        <SummaryBar services={selectedServices} currency={salon.currency} />

        <button
          type="button"
          disabled={selectedServices.length === 0}
          onClick={() => setStep(1)}
          className="w-full mt-5 h-12 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-rose-200"
        >
          Continue to Staff
        </button>
      </div>
    );
  }

  // ── Step 1: Staff ────────────────────────────────────────────────────────────

  function renderStaffStep() {
    const noEligibleStaff = eligibleStaff.length === 0;

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-800 mb-1">Choose a staff member</h2>
          <p className="text-stone-500 text-sm">
            Pick who you&apos;d like, or let us assign the best available.
          </p>
        </div>

        {noEligibleStaff ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
            No staff member offers all your selected services. Try a different combination.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {/* No preference option */}
            <button
              type="button"
              onClick={() => setSelectedStaffId(NO_PREFERENCE_ID)}
              className={[
                "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 text-left",
                selectedStaffId === NO_PREFERENCE_ID
                  ? "border-rose-400 bg-rose-50"
                  : "border-stone-100 bg-white hover:border-rose-200 hover:bg-rose-50/40",
              ].join(" ")}
            >
              <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p
                  className={[
                    "font-semibold text-sm",
                    selectedStaffId === NO_PREFERENCE_ID ? "text-rose-700" : "text-stone-800",
                  ].join(" ")}
                >
                  No preference
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  We&apos;ll assign the first available staff member
                </p>
              </div>
            </button>

            {/* Individual staff cards */}
            {eligibleStaff.map((member) => {
              const isSelected = selectedStaffId === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedStaffId(isSelected ? null : member.id)}
                  className={[
                    "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 text-left",
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
            disabled={!selectedStaffId || noEligibleStaff}
            onClick={() => setStep(2)}
            className="flex-1 h-12 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-rose-200"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Date & Time ──────────────────────────────────────────────────────

  function renderDateTimeStep() {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-800 mb-1">Pick a date &amp; time</h2>
          <p className="text-stone-500 text-sm">Choose when you&apos;d like your appointment.</p>
        </div>

        {/* Calendar */}
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-3">
            Select a date
          </p>
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
            <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} blackoutDates={blackoutDates} />
          </div>
        </div>

        {/* Time slots — only show once date is picked */}
        {selectedDate && (
          <div className="mb-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-3">
              Available times — {formatDateDisplay(selectedDate)}
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
                No available slots on this date. Try another date.
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

        {/* Dynamic pricing badge — shown after time is selected */}
        {selectedDate && selectedTime && pricingInfo && pricingInfo.appliedRules.length > 0 && (
          <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-2">
              Pricing for {pricingInfo.serviceName}
            </p>
            {pricingInfo.appliedRules.map((rule, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-stone-500 truncate">{rule.name}</span>
                <span
                  className={[
                    "font-semibold ml-3 shrink-0",
                    rule.adjustment >= 0 ? "text-red-500" : "text-green-600",
                  ].join(" ")}
                >
                  {rule.adjustment >= 0 ? "+" : ""}
                  {formatPrice(rule.adjustment, salon.currency)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm border-t border-stone-200 pt-1.5 mt-1.5">
              <span className="font-semibold text-stone-700">Final price</span>
              <span className="font-bold text-rose-600">{formatPrice(pricingInfo.finalPrice, salon.currency)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 h-12 rounded-xl border-2 border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!selectedDate || !selectedTime}
            onClick={() => setStep(3)}
            className="flex-1 h-12 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-rose-200"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Your Info ────────────────────────────────────────────────────────

  function renderInfoStep() {
    return (
      <form onSubmit={handleSubmit(() => setStep(4))}>
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
              Special Requests{" "}
              <span className="normal-case font-normal text-stone-400 tracking-normal">
                (optional)
              </span>
            </label>
            <textarea
              id="note"
              rows={3}
              placeholder="Any special requests, allergies, or preferences we should know?"
              {...register("note")}
              className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-800 text-sm placeholder:text-stone-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={() => setStep(2)}
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

  // ── Deposit step helpers ─────────────────────────────────────────────────────

  // Determine whether the deposit step should be shown:
  // Only if bookingRules.requireDeposit is true AND NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set.
  const stripeKeyConfigured = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const showDepositStep = !!(bookingRules?.requireDeposit && stripeKeyConfigured);

  // Compute the deposit label shown to the user
  function depositLabel(): string {
    if (!bookingRules) return "";
    const { depositType, depositAmount } = bookingRules;
    if (depositType === "percentage") {
      const pct = depositAmount;
      const depositDue = totalPrice * (pct / 100);
      return `A deposit of ${formatPrice(depositDue, salon.currency)} (${pct}% of total) is required to confirm your booking.`;
    }
    return `A deposit of ${formatPrice(depositAmount, salon.currency)} is required to confirm your booking.`;
  }

  // Track the confirmed appointment id for deposit step routing
  const [confirmedAppointmentId, setConfirmedAppointmentId] = useState<string | null>(null);

  // ── Step 4: Confirm ──────────────────────────────────────────────────────────

  async function onConfirm() {
    if (!selectedStaffId || !selectedDate || !selectedTime || selectedServices.length === 0) return;
    const values = getValues();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await bookAppointmentPublic({
        salonId: salon.id,
        serviceIds: selectedServices.map((s) => s.id),
        staffId: selectedStaffId === NO_PREFERENCE_ID ? null : selectedStaffId,
        date: selectedDate,
        startTime: selectedTime,
        clientName: values.clientName,
        clientPhone: values.clientPhone,
        clientEmail: values.clientEmail || undefined,
        notes: values.note || undefined,
      });
      if (result.success) {
        if (showDepositStep) {
          // Go to deposit step before navigating to confirmation
          setConfirmedAppointmentId(result.appointmentId);
          setStep(5);
        } else {
          router.push(`/book/${salon.slug}/confirmation/${result.appointmentId}`);
        }
      } else {
        setSubmitError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderConfirmStep() {
    const values = getValues();
    const staffLabel =
      selectedStaffId === NO_PREFERENCE_ID
        ? "Any available"
        : (staff.find((m) => m.id === selectedStaffId)?.name ?? "—");

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-800 mb-1">Confirm your booking</h2>
          <p className="text-stone-500 text-sm">Review the details below before confirming.</p>
        </div>

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
                    <span className="text-stone-400 ml-2 text-xs">{formatDuration(svc.durationMins)}</span>
                  </div>
                  <span className="font-medium text-stone-700">{formatPrice(svc.price, salon.currency)}</span>
                </div>
              ))}
              {selectedServices.length > 1 && (
                <div className="flex justify-between pt-2 border-t border-stone-200 font-semibold text-stone-800">
                  <span>Total · {formatDuration(totalDuration)}</span>
                  <span>{formatPrice(totalPrice, salon.currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Staff */}
          <div className="p-4 flex items-center gap-3">
            {selectedStaffId === NO_PREFERENCE_ID ? (
              <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            ) : (
              <StaffAvatar member={staff.find((m) => m.id === selectedStaffId) ?? { name: staffLabel }} size="sm" />
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 leading-none mb-1">Staff</p>
              <p className="font-medium text-stone-700">{staffLabel}</p>
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
            {values.clientEmail && <p className="text-stone-500 text-xs">{values.clientEmail}</p>}
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
            onClick={() => setStep(3)}
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

  // ── Step 5: Deposit ──────────────────────────────────────────────────────────

  function renderDepositStep() {
    const apptId = confirmedAppointmentId;

    function handlePayDeposit() {
      // Placeholder: actual Stripe integration wired here later.
      // For now, navigating to confirmation as if payment succeeded.
      if (apptId) {
        router.push(`/book/${salon.slug}/confirmation/${apptId}`);
      }
    }

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-800 mb-1">Secure your booking</h2>
          <p className="text-stone-500 text-sm">
            A deposit is required to confirm your appointment.
          </p>
        </div>

        <StripeDepositForm depositLabel={depositLabel()} onSkip={handlePayDeposit} />

        <p className="text-center text-xs text-stone-400 mt-4">
          Your appointment has been created. Complete the deposit to confirm.
        </p>
      </div>
    );
  }

  return (
    <>
      <StepIndicator current={Math.min(step, STEPS.length - 1)} />
      {step === 0 && renderServiceStep()}
      {step === 1 && renderStaffStep()}
      {step === 2 && renderDateTimeStep()}
      {step === 3 && renderInfoStep()}
      {step === 4 && renderConfirmStep()}
      {step === 5 && renderDepositStep()}
    </>
  );
}
