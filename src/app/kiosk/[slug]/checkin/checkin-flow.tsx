"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  lookupClientByPhone,
  checkInAppointment,
  type KioskAppointment,
} from "@/app/actions/kiosk";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Step = "phone" | "found" | "not-found" | "confirmed";

interface Props {
  salon: { id: string; name: string; slug: string };
}

// ─── Keypad ────────────────────────────────────────────────────────────────────

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "⌫"];

function NumericKeypad({
  onKey,
}: {
  onKey: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key)}
          className={[
            "flex items-center justify-center rounded-2xl text-3xl font-semibold select-none",
            "h-20 transition-all active:scale-95",
            key === "⌫"
              ? "bg-rose-50 text-rose-500 hover:bg-rose-100"
              : key === "*"
              ? "invisible"
              : "bg-stone-100 text-stone-800 hover:bg-stone-200",
          ].join(" ")}
        >
          {key === "⌫" ? (
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9l-3 3m0 0l3 3m-3-3h9M3 12a9 9 0 1118 0A9 9 0 013 12z"
              />
            </svg>
          ) : (
            key
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Step 1: Phone entry ────────────────────────────────────────────────────────

function PhoneStep({
  salonName,
  slug,
  onFound,
  onNotFound,
}: {
  salonName: string;
  slug: string;
  onFound: (appt: KioskAppointment) => void;
  onNotFound: () => void;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleKey = useCallback(
    (key: string) => {
      if (key === "⌫") {
        setPhone((p) => p.slice(0, -1));
      } else if (key !== "*" && phone.length < 15) {
        setPhone((p) => p + key);
      }
      setError("");
    },
    [phone]
  );

  async function handleContinue() {
    if (phone.length < 7) {
      setError("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await lookupClientByPhone(slug, phone);
      if (result.success && result.appointment) {
        onFound(result.appointment);
      } else {
        onNotFound();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-stone-50 px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-stone-400 hover:text-stone-600 mb-8 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-lg">Back</span>
        </button>

        <h1 className="text-4xl font-bold text-stone-900 mb-2">Enter your phone</h1>
        <p className="text-lg text-stone-500 mb-8">
          We'll look up your appointment at {salonName}.
        </p>

        {/* Display field */}
        <div className="bg-white rounded-2xl border-2 border-stone-200 px-6 py-5 text-center mb-4 min-h-[72px] flex items-center justify-center shadow-sm">
          <span className="text-4xl font-mono font-semibold tracking-widest text-stone-900">
            {phone || <span className="text-stone-300">—</span>}
          </span>
        </div>

        {error && (
          <p className="text-rose-500 text-center text-base mb-4">{error}</p>
        )}

        {/* Keypad */}
        <NumericKeypad onKey={handleKey} />

        {/* Continue */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={phone.length < 7 || loading}
          className="mt-5 w-full py-6 rounded-2xl bg-rose-600 text-white text-2xl font-semibold shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all"
        >
          {loading ? "Looking up…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Appointment found ──────────────────────────────────────────────────

function FoundStep({
  appointment,
  onCheckedIn,
  onNotMe,
}: {
  appointment: KioskAppointment;
  onCheckedIn: () => void;
  onNotMe: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const services = appointment.AppointmentService.map((as) => as.Service.name).join(", ");

  // Format time from "HH:MM" to "H:MM AM/PM"
  function formatTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  async function handleCheckIn() {
    setLoading(true);
    setError("");
    try {
      const result = await checkInAppointment(appointment.id);
      if (result.success) {
        onCheckedIn();
      } else {
        setError(result.error ?? "Check-in failed. Please see staff.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-stone-50 px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Greeting */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-stone-900">
            Welcome back,
          </h1>
          <h2 className="text-4xl font-bold text-rose-600 mt-1">
            {appointment.clientName}!
          </h2>
        </div>

        {/* Appointment card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-md p-6 mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-stone-600 uppercase tracking-wider text-sm">
            Your appointment
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide">Time</p>
                <p className="text-xl font-semibold text-stone-900">{formatTime(appointment.startTime)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide">Service</p>
                <p className="text-xl font-semibold text-stone-900">{services || "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide">Staff</p>
                <p className="text-xl font-semibold text-stone-900">{appointment.staffName}</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-rose-500 text-center text-base mb-4">{error}</p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleCheckIn}
          disabled={loading}
          className="w-full py-6 rounded-2xl bg-rose-600 text-white text-2xl font-semibold shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all mb-3"
        >
          {loading ? "Checking in…" : "Check In"}
        </button>

        <button
          type="button"
          onClick={onNotMe}
          className="w-full py-5 rounded-2xl bg-stone-50 text-stone-500 text-xl font-medium border border-stone-200 hover:bg-stone-100 active:scale-[0.98] transition-all"
        >
          This isn't me
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Confirmed ──────────────────────────────────────────────────────────

function ConfirmedStep({ slug }: { slug: string }) {
  const router = useRouter();

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

        <h1 className="text-5xl font-bold text-stone-900 mb-3">
          You're checked in!
        </h1>
        <p className="text-xl text-stone-500 mb-8">
          Please take a seat — we'll be right with you.
        </p>

        {/* Countdown hint */}
        <p className="text-base text-stone-300 mt-12">
          Returning to home screen in a few seconds…
        </p>
      </div>
    </div>
  );
}

// ─── Step: Not found ────────────────────────────────────────────────────────────

function NotFoundStep({
  slug,
  onBack,
}: {
  slug: string;
  onBack: () => void;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-stone-50 px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-8">
          <svg className="w-12 h-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-stone-900 mb-3">
          No appointment found
        </h1>
        <p className="text-xl text-stone-500 mb-10">
          We couldn't find a booking for that number today. Please see a staff member for help.
        </p>

        <button
          type="button"
          onClick={onBack}
          className="w-full py-6 rounded-2xl bg-stone-100 text-stone-800 text-2xl font-semibold border border-stone-200 hover:bg-stone-200 active:scale-[0.98] transition-all mb-3"
        >
          Try again
        </button>

        <button
          type="button"
          onClick={() => router.replace(`/kiosk/${slug}/walkin`)}
          className="w-full py-5 rounded-2xl bg-rose-600 text-white text-xl font-semibold shadow-md shadow-rose-100 hover:bg-rose-700 active:scale-[0.98] transition-all"
        >
          Walk In instead
        </button>
      </div>
    </div>
  );
}

// ─── Main orchestrator ─────────────────────────────────────────────────────────

export function CheckinFlow({ salon }: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [appointment, setAppointment] = useState<KioskAppointment | null>(null);

  function handleFound(appt: KioskAppointment) {
    setAppointment(appt);
    setStep("found");
  }

  if (step === "phone" || step === "not-found") {
    if (step === "not-found") {
      return (
        <NotFoundStep
          slug={salon.slug}
          onBack={() => setStep("phone")}
        />
      );
    }
    return (
      <PhoneStep
        salonName={salon.name}
        slug={salon.slug}
        onFound={handleFound}
        onNotFound={() => setStep("not-found")}
      />
    );
  }

  if (step === "found" && appointment) {
    return (
      <FoundStep
        appointment={appointment}
        onCheckedIn={() => setStep("confirmed")}
        onNotMe={() => setStep("phone")}
      />
    );
  }

  return <ConfirmedStep slug={salon.slug} />;
}
