"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { kioskWalkIn } from "@/app/actions/kiosk";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Step = "service" | "details" | "confirmed";

interface Service {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  categoryName: string;
}

interface Props {
  salon: { id: string; name: string; slug: string; currency: string };
  services: Service[];
}

// ─── Currency formatter ────────────────────────────────────────────────────────

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

// ─── Step 1: Service selection ─────────────────────────────────────────────────

function ServiceStep({
  services,
  currency,
  slug,
  onSelect,
}: {
  services: Service[];
  currency: string;
  slug: string;
  onSelect: (service: Service) => void;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-8 py-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Walk In</h1>
          <p className="text-stone-500 text-lg mt-0.5">Select a service to get started</p>
        </div>
      </div>

      {/* Service grid */}
      <div className="flex-1 p-8 overflow-y-auto">
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-stone-400">
            <p className="text-xl">No services available right now.</p>
            <p className="text-base mt-2">Please ask a staff member for help.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            {services.map((svc) => (
              <button
                key={svc.id}
                type="button"
                onClick={() => onSelect(svc)}
                className="flex flex-col gap-3 rounded-2xl bg-white border-2 border-stone-100 p-6 text-left hover:border-rose-300 hover:shadow-md hover:shadow-rose-50 active:scale-[0.97] transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xl font-semibold text-stone-900 leading-tight group-hover:text-rose-700 transition-colors">
                    {svc.name}
                  </p>
                  <span className="shrink-0 text-xs text-stone-400 bg-stone-50 rounded-lg px-2 py-1">
                    {svc.categoryName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-rose-600">
                    {formatPrice(svc.price, currency)}
                  </span>
                  <span className="text-sm text-stone-400">
                    {svc.durationMins} min
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Large touch input ─────────────────────────────────────────────────────────

function BigInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-base font-semibold text-stone-500 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border-2 border-stone-200 bg-white px-6 py-5 text-2xl font-medium text-stone-900 placeholder:text-stone-300 focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-100 transition-all"
      />
    </div>
  );
}

// ─── Step 2: Name + Phone ──────────────────────────────────────────────────────

function DetailsStep({
  selectedService,
  currency,
  onSubmit,
  onBack,
}: {
  selectedService: Service;
  currency: string;
  onSubmit: (name: string, phone: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  function validate() {
    const e: { name?: string; phone?: string } = {};
    if (!name.trim()) e.name = "Please enter your name";
    if (!phone.trim() || phone.trim().length < 7) e.phone = "Please enter a valid phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (validate()) {
      onSubmit(name.trim(), phone.trim());
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-8 py-6 flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Your details</h1>
          <p className="text-stone-500 text-lg mt-0.5">Almost there!</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 py-10 max-w-lg mx-auto w-full gap-8">
        {/* Selected service recap */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Selected service</p>
            <p className="text-xl font-semibold text-stone-900">{selectedService.name}</p>
            <p className="text-sm text-stone-400 mt-0.5">{selectedService.durationMins} min</p>
          </div>
          <span className="text-2xl font-bold text-rose-600">
            {formatPrice(selectedService.price, currency)}
          </span>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-6">
          <div>
            <BigInput
              label="Your name"
              value={name}
              onChange={setName}
              placeholder="e.g. Alex Smith"
            />
            {errors.name && <p className="text-rose-500 text-base mt-2">{errors.name}</p>}
          </div>

          <div>
            <BigInput
              label="Phone number"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={setPhone}
              placeholder="e.g. 555-0100"
            />
            {errors.phone && <p className="text-rose-500 text-base mt-2">{errors.phone}</p>}
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-7 rounded-2xl bg-rose-600 text-white text-2xl font-semibold shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-[0.98] transition-all"
        >
          Add me to the list
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Confirmed ──────────────────────────────────────────────────────────

function ConfirmedStep({
  name,
  slug,
}: {
  name: string;
  slug: string;
}) {
  const router = useRouter();

  // Auto-redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(`/kiosk/${slug}`);
    }, 5000);
    return () => clearTimeout(timer);
  }, [router, slug]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-stone-50 px-6 py-12">
      <div className="w-full max-w-sm text-center">
        {/* Success icon */}
        <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-8">
          <svg className="w-14 h-14 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-5xl font-bold text-stone-900 mb-4 leading-tight">
          We'll be right with you,{" "}
          <span className="text-rose-600">{name}!</span>
        </h1>
        <p className="text-xl text-stone-500 mb-8">
          You've been added to our walk-in list. Please take a seat — a staff member will call your name shortly.
        </p>

        <button
          type="button"
          onClick={() => router.replace(`/kiosk/${slug}`)}
          className="mt-4 w-full py-5 rounded-2xl bg-stone-100 text-stone-600 text-xl font-medium border border-stone-200 hover:bg-stone-200 active:scale-[0.98] transition-all"
        >
          Done
        </button>

        <p className="text-base text-stone-300 mt-8">
          Returning to home screen in a few seconds…
        </p>
      </div>
    </div>
  );
}

// ─── Main orchestrator ─────────────────────────────────────────────────────────

export function WalkInFlow({ salon, services }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [clientName, setClientName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSelectService = useCallback((svc: Service) => {
    setSelectedService(svc);
    setStep("details");
  }, []);

  async function handleSubmitDetails(name: string, phone: string) {
    if (!selectedService) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await kioskWalkIn({
        salonSlug: salon.slug,
        name,
        phone,
        serviceId: selectedService.id,
      });
      if (result.success) {
        setClientName(name);
        setStep("confirmed");
      } else {
        setSubmitError(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "service") {
    return (
      <ServiceStep
        services={services}
        currency={salon.currency}
        slug={salon.slug}
        onSelect={handleSelectService}
      />
    );
  }

  if (step === "details" && selectedService) {
    return (
      <>
        {submitError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-lg font-medium px-6 py-3 rounded-2xl shadow-lg">
            {submitError}
          </div>
        )}
        <DetailsStep
          selectedService={selectedService}
          currency={salon.currency}
          onSubmit={handleSubmitDetails}
          onBack={() => setStep("service")}
        />
        {/* Overlay spinner during submission */}
        {submitting && (
          <div className="fixed inset-0 bg-white/70 flex items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
          </div>
        )}
      </>
    );
  }

  return <ConfirmedStep name={clientName} slug={salon.slug} />;
}
