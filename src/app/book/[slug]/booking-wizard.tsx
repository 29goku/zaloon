"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requestBooking } from "@/app/actions/booking";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Contact form schema ────────────────────────────────────────────────────────

const contactSchema = z.object({
  clientName: z.string().min(1, "Name is required"),
  clientPhone: z.string().min(1, "Phone is required"),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});

type ContactValues = z.infer<typeof contactSchema>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: string | null): string {
  const c = currency ?? "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(price);
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = ["Service", "Staff", "Date & Time", "Your Info"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 px-4">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                i < current
                  ? "bg-emerald-500 text-white"
                  : i === current
                  ? "bg-primary text-primary-foreground"
                  : "bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span
              className={`text-[10px] font-medium hidden sm:block ${
                i === current
                  ? "text-primary"
                  : i < current
                  ? "text-emerald-500"
                  : "text-stone-400 dark:text-stone-500"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 mx-1 mt-[-12px] sm:mt-[-20px] transition-colors ${
                i < current ? "bg-emerald-500" : "bg-stone-200 dark:bg-stone-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main wizard ────────────────────────────────────────────────────────────────

export function BookingWizard({ salon, categories }: BookingWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [submitResult, setSubmitResult] = useState<{
    success: true;
    shortId: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
  });

  // ── Step 0: Service ──────────────────────────────────────────────────────────

  function renderServiceStep() {
    return (
      <div>
        <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-1">
          Choose a service
        </h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">
          Select what you&apos;d like done today
        </p>

        {categories.length === 0 ? (
          <p className="text-stone-500 text-sm">No services available at this time.</p>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  {cat.icon && <span className="text-base">{cat.icon}</span>}
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    {cat.name}
                  </h3>
                </div>
                <div className="space-y-2">
                  {cat.services.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => {
                        setSelectedService(svc);
                        setSelectedStaff(null);
                        setStep(1);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                        selectedService?.id === svc.id
                          ? "border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10"
                      }`}
                    >
                      <div>
                        <p className="font-medium text-stone-800 dark:text-stone-100 text-sm">
                          {svc.name}
                        </p>
                        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                          {formatDuration(svc.durationMins)}
                        </p>
                      </div>
                      <span className="font-semibold text-stone-700 dark:text-stone-200 text-sm ml-4 shrink-0">
                        {formatPrice(svc.price, salon.currency)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Step 1: Staff ────────────────────────────────────────────────────────────

  function renderStaffStep() {
    const availableStaff = selectedService?.staff ?? [];
    return (
      <div>
        <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-1">
          Choose a staff member
        </h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">
          Who would you like to see for{" "}
          <span className="font-medium text-stone-700 dark:text-stone-300">
            {selectedService?.name}
          </span>
          ?
        </p>

        {availableStaff.length === 0 ? (
          <p className="text-stone-500 text-sm">No staff available for this service.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableStaff.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  setSelectedStaff(member);
                  setStep(2);
                }}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                  selectedStaff?.id === member.id
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm uppercase">
                  {member.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    member.name.charAt(0)
                  )}
                </div>
                <span className="font-medium text-stone-800 dark:text-stone-100 text-sm">
                  {member.name}
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setStep(0)}
          className="mt-6 text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        >
          ← Back to services
        </button>
      </div>
    );
  }

  // ── Step 2: Date & Time ──────────────────────────────────────────────────────

  function renderDateTimeStep() {
    const isValid = selectedDate && selectedTime;
    return (
      <div>
        <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-1">
          Pick a date & time
        </h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">
          When would you like your appointment?
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="date"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2"
            >
              Date
            </label>
            <input
              id="date"
              type="date"
              min={todayString()}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="time"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2"
            >
              Time
            </label>
            <input
              id="time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 h-12 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!isValid}
            onClick={() => setStep(3)}
            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Contact info ─────────────────────────────────────────────────────

  async function onSubmit(values: ContactValues) {
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await requestBooking(salon.slug, {
        serviceId: selectedService.id,
        staffId: selectedStaff.id,
        date: selectedDate,
        startTime: selectedTime,
        ...values,
      });
      if (result.success) {
        setSubmitResult({ success: true, shortId: result.shortId });
      } else {
        setSubmitError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderContactStep() {
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-1">
          Your details
        </h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">
          We&apos;ll use this to confirm your booking
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="clientName"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2"
            >
              Full Name *
            </label>
            <input
              id="clientName"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              {...register("clientName")}
              className="w-full h-12 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 text-stone-800 dark:text-stone-100 text-sm placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {errors.clientName && (
              <p className="text-red-500 text-xs mt-1">{errors.clientName.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="clientPhone"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2"
            >
              Phone Number *
            </label>
            <input
              id="clientPhone"
              type="tel"
              autoComplete="tel"
              placeholder="+1 555 000 0000"
              {...register("clientPhone")}
              className="w-full h-12 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 text-stone-800 dark:text-stone-100 text-sm placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {errors.clientPhone && (
              <p className="text-red-500 text-xs mt-1">{errors.clientPhone.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="clientEmail"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2"
            >
              Email <span className="normal-case font-normal text-stone-400">(optional)</span>
            </label>
            <input
              id="clientEmail"
              type="email"
              autoComplete="email"
              placeholder="jane@example.com"
              {...register("clientEmail")}
              className="w-full h-12 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 text-stone-800 dark:text-stone-100 text-sm placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {errors.clientEmail && (
              <p className="text-red-500 text-xs mt-1">{errors.clientEmail.message}</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2 text-sm">
          <p className="font-semibold text-stone-700 dark:text-stone-200 mb-3">
            Booking Summary
          </p>
          <div className="flex justify-between text-stone-600 dark:text-stone-300">
            <span>Service</span>
            <span className="font-medium">{selectedService?.name}</span>
          </div>
          <div className="flex justify-between text-stone-600 dark:text-stone-300">
            <span>With</span>
            <span className="font-medium">{selectedStaff?.name}</span>
          </div>
          <div className="flex justify-between text-stone-600 dark:text-stone-300">
            <span>Date</span>
            <span className="font-medium">
              {selectedDate
                ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex justify-between text-stone-600 dark:text-stone-300">
            <span>Time</span>
            <span className="font-medium">{selectedTime || "—"}</span>
          </div>
          <div className="flex justify-between text-stone-600 dark:text-stone-300 pt-2 border-t border-stone-200 dark:border-stone-600">
            <span>Price</span>
            <span className="font-semibold text-stone-800 dark:text-stone-100">
              {selectedService ? formatPrice(selectedService.price, salon.currency) : "—"}
            </span>
          </div>
        </div>

        {submitError && (
          <p className="mt-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            {submitError}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex-1 h-12 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Booking…" : "Request Booking"}
          </button>
        </div>
      </form>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────────

  if (submitResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-950 dark:to-stone-900 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
            Booking Requested!
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mb-6">
            We&apos;ll confirm your appointment shortly. Please keep your phone handy.
          </p>
          <div className="inline-block px-6 py-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm">
            <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">
              Reference ID
            </p>
            <p className="text-2xl font-bold font-mono text-primary tracking-wider">
              {submitResult.shortId}
            </p>
          </div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-6">
            Show this reference when you arrive at {salon.name}.
          </p>
        </div>
      </div>
    );
  }

  // ── Main layout ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-950 dark:to-stone-900">
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          {salon.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={salon.logo}
              alt={salon.name}
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary font-bold text-2xl">
              {salon.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">{salon.name}</h1>
          {salon.city && (
            <p className="text-sm text-stone-400 dark:text-stone-500 mt-0.5">{salon.city}</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700/60 p-6 sm:p-8">
          <StepIndicator current={step} />

          {step === 0 && renderServiceStep()}
          {step === 1 && renderStaffStep()}
          {step === 2 && renderDateTimeStep()}
          {step === 3 && renderContactStep()}
        </div>

        <p className="text-center text-xs text-stone-400 dark:text-stone-600 mt-6">
          Powered by Zaloon
        </p>
      </div>
    </div>
  );
}
