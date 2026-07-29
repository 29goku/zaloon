"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { addWalkInToWaitlist } from "@/app/actions/kiosk";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Step = "name" | "service" | "preferences" | "confirmed";

interface Service {
  id: string;
  name: string;
  price: number;
  durationMins: number;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  services: Service[];
}

interface StaffMember {
  id: string;
  name: string;
}

interface Props {
  salon: { id: string; name: string; slug: string; currency: string };
  categories: Category[];
  staffList: StaffMember[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Back button ───────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

// ─── Step 1 — Name ─────────────────────────────────────────────────────────────

function NameStep({
  slug,
  onContinue,
}: {
  slug: string;
  onContinue: (name: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleContinue() {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    onContinue(name.trim());
  }

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
          <p className="text-stone-500 text-lg mt-0.5">Step 1 of 3</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 max-w-lg mx-auto w-full gap-6">
        <div>
          <h2 className="text-4xl font-bold text-stone-900 mb-2">What's your name?</h2>
          <p className="text-xl text-stone-500">We'll use this to call you when we're ready.</p>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="text"
            inputMode="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="e.g. Alex Smith"
            autoFocus
            className="w-full rounded-2xl border-2 border-stone-200 bg-white px-6 py-6 text-3xl font-medium text-stone-900 placeholder:text-stone-300 focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-100 transition-all"
          />
          {error && <p className="text-rose-500 text-base mt-1">{error}</p>}
          <p className="text-sm text-stone-400 mt-1">Tap the field and use your keyboard.</p>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!name.trim()}
          className="w-full py-7 rounded-2xl bg-rose-600 text-white text-2xl font-semibold shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 — Service selection ────────────────────────────────────────────────

function ServiceStep({
  categories,
  currency,
  onSelect,
  onBack,
}: {
  categories: Category[];
  currency: string;
  onSelect: (service: Service) => void;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState(categories[0]?.id ?? "");

  const activeCategory = categories.find((c) => c.id === activeTab);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-8 py-6 flex items-center gap-4">
        <BackButton onClick={onBack} />
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Select a service</h1>
          <p className="text-stone-500 text-lg mt-0.5">Step 2 of 3</p>
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="bg-white border-b border-stone-100 px-6 py-4 flex gap-3 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              className={[
                "flex-shrink-0 px-5 py-3 rounded-xl text-lg font-semibold transition-all active:scale-95",
                activeTab === cat.id
                  ? "bg-rose-600 text-white shadow-md shadow-rose-200"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200",
              ].join(" ")}
            >
              {cat.icon ? `${cat.icon} ` : ""}{cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Services grid */}
      <div className="flex-1 p-8 overflow-y-auto">
        {!activeCategory || activeCategory.services.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-stone-400">
            <p className="text-xl">No services in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            {activeCategory.services.map((svc) => (
              <button
                key={svc.id}
                type="button"
                onClick={() => onSelect(svc)}
                className="flex flex-col gap-3 rounded-2xl bg-white border-2 border-stone-100 p-6 text-left hover:border-rose-300 hover:shadow-md hover:shadow-rose-50 active:scale-[0.97] transition-all group"
              >
                <p className="text-xl font-semibold text-stone-900 leading-tight group-hover:text-rose-700 transition-colors">
                  {svc.name}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-2xl font-bold text-rose-600">
                    {formatPrice(svc.price, currency)}
                  </span>
                  <span className="text-sm text-stone-400">{svc.durationMins} min</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3 — Preferences ──────────────────────────────────────────────────────

function PreferencesStep({
  selectedService,
  currency,
  staffList,
  onSubmit,
  onBack,
}: {
  selectedService: Service;
  currency: string;
  staffList: StaffMember[];
  onSubmit: (staffId: string | null, note: string) => void;
  onBack: () => void;
}) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-8 py-6 flex items-center gap-4">
        <BackButton onClick={onBack} />
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Any preferences?</h1>
          <p className="text-stone-500 text-lg mt-0.5">Step 3 of 3 — optional</p>
        </div>
      </div>

      <div className="flex-1 px-8 py-8 overflow-y-auto max-w-2xl mx-auto w-full">
        {/* Selected service recap */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center justify-between mb-8">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Selected</p>
            <p className="text-xl font-semibold text-stone-900">{selectedService.name}</p>
            <p className="text-sm text-stone-400 mt-0.5">{selectedService.durationMins} min</p>
          </div>
          <span className="text-2xl font-bold text-rose-600">
            {formatPrice(selectedService.price, currency)}
          </span>
        </div>

        {/* Staff preference */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-stone-900 mb-4">Staff preference</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* "Any staff" option */}
            <button
              type="button"
              onClick={() => setSelectedStaffId(null)}
              className={[
                "flex flex-col items-center gap-2 rounded-2xl p-5 border-2 transition-all active:scale-95",
                selectedStaffId === null
                  ? "border-rose-400 bg-rose-50"
                  : "border-stone-200 bg-white hover:border-stone-300",
              ].join(" ")}
            >
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5m-5-4v4m-2-4a4 4 0 00-8 0m8 0H7m5-4a4 4 0 110-8 4 4 0 010 8z" />
                </svg>
              </div>
              <span className={`text-base font-semibold ${selectedStaffId === null ? "text-rose-700" : "text-stone-700"}`}>
                Any staff
              </span>
            </button>

            {/* Staff cards */}
            {staffList.map((staff) => (
              <button
                key={staff.id}
                type="button"
                onClick={() => setSelectedStaffId(staff.id)}
                className={[
                  "flex flex-col items-center gap-2 rounded-2xl p-5 border-2 transition-all active:scale-95",
                  selectedStaffId === staff.id
                    ? "border-rose-400 bg-rose-50"
                    : "border-stone-200 bg-white hover:border-stone-300",
                ].join(" ")}
              >
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-lg">
                  {staff.name.charAt(0).toUpperCase()}
                </div>
                <span className={`text-base font-semibold ${selectedStaffId === staff.id ? "text-rose-700" : "text-stone-700"}`}>
                  {staff.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Special request */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-stone-900 mb-3">Special request</h2>
          <p className="text-stone-500 text-base mb-3">Let us know if you have any special requests.</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Trim only, sensitive scalp…"
            rows={3}
            className="w-full rounded-2xl border-2 border-stone-200 bg-white px-5 py-4 text-xl text-stone-900 placeholder:text-stone-300 focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-100 resize-none transition-all"
          />
        </div>

        <button
          type="button"
          onClick={() => onSubmit(selectedStaffId, note.trim())}
          className="w-full py-7 rounded-2xl bg-rose-600 text-white text-2xl font-semibold shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-[0.98] transition-all"
        >
          Add me to the queue
        </button>
      </div>
    </div>
  );
}

// ─── Step 4 — Confirmed ─────────────────────────────────────────────────────────

function ConfirmedStep({
  name,
  position,
  estimatedWaitMins,
  slug,
}: {
  name: string;
  position: number;
  estimatedWaitMins: number;
  slug: string;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-stone-50 px-6 py-12">
      <div className="w-full max-w-sm text-center">
        {/* Success icon */}
        <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-8">
          <svg className="w-14 h-14 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-5xl font-bold text-stone-900 mb-3 leading-tight">
          Added to queue!
        </h1>
        <p className="text-2xl text-stone-600 font-medium mb-8">
          Welcome, <span className="text-rose-600">{name}!</span>
        </p>

        {/* Queue info */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg text-stone-500">Your position</span>
            <span className="text-3xl font-bold text-rose-600">#{position}</span>
          </div>
          <div className="border-t border-stone-100" />
          <div className="flex items-center justify-between">
            <span className="text-lg text-stone-500">Estimated wait</span>
            <span className="text-2xl font-bold text-stone-900">
              {estimatedWaitMins === 0
                ? "Now"
                : `~${estimatedWaitMins} min`}
            </span>
          </div>
        </div>

        <p className="text-xl text-stone-500 mb-8">
          Please take a seat — a staff member will call your name shortly.
        </p>

        <button
          type="button"
          onClick={() => router.replace(`/kiosk/${slug}`)}
          className="w-full py-6 rounded-2xl bg-stone-100 text-stone-700 text-xl font-semibold border border-stone-200 hover:bg-stone-200 active:scale-[0.98] transition-all"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Main orchestrator ─────────────────────────────────────────────────────────

export function WalkInFlow({ salon, categories, staffList }: Props) {
  const [step, setStep] = useState<Step>("name");
  const [clientName, setClientName] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [queueResult, setQueueResult] = useState<{ position: number; estimatedWaitMins: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSelectService = useCallback((svc: Service) => {
    setSelectedService(svc);
    setStep("preferences");
  }, []);

  async function handlePreferencesSubmit(staffId: string | null, note: string) {
    if (!selectedService) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await addWalkInToWaitlist({
        salonSlug: salon.slug,
        name: clientName,
        serviceId: selectedService.id,
        staffId: staffId ?? undefined,
        note: note || undefined,
      });
      if (result.success) {
        setQueueResult({ position: result.position, estimatedWaitMins: result.estimatedWaitMins });
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

  return (
    <>
      {submitError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-lg font-medium px-6 py-3 rounded-2xl shadow-lg">
          {submitError}
        </div>
      )}
      {submitting && (
        <div className="fixed inset-0 bg-white/70 flex items-center justify-center z-50">
          <div className="w-16 h-16 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
        </div>
      )}

      {step === "name" && (
        <NameStep slug={salon.slug} onContinue={(name) => { setClientName(name); setStep("service"); }} />
      )}

      {step === "service" && (
        <ServiceStep
          categories={categories}
          currency={salon.currency}
          onSelect={handleSelectService}
          onBack={() => setStep("name")}
        />
      )}

      {step === "preferences" && selectedService && (
        <PreferencesStep
          selectedService={selectedService}
          currency={salon.currency}
          staffList={staffList}
          onSubmit={handlePreferencesSubmit}
          onBack={() => setStep("service")}
        />
      )}

      {step === "confirmed" && queueResult && (
        <ConfirmedStep
          name={clientName}
          position={queueResult.position}
          estimatedWaitMins={queueResult.estimatedWaitMins}
          slug={salon.slug}
        />
      )}
    </>
  );
}
