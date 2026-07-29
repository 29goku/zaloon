"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  lookupClientByPhone,
  checkInAppointment,
  type KioskAppointment,
} from "@/app/actions/kiosk";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Step = "phone" | "select" | "confirmed" | "not-found";

interface Props {
  salon: { id: string; name: string; slug: string };
}

// ─── Numeric keypad ────────────────────────────────────────────────────────────

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "OK"];

function NumericKeypad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key)}
          className={[
            "flex items-center justify-center rounded-2xl text-2xl font-semibold select-none",
            "h-20 transition-all active:scale-95",
            key === "CLR"
              ? "bg-rose-50 text-rose-500 hover:bg-rose-100"
              : key === "OK"
              ? "bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200"
              : "bg-stone-100 text-stone-800 hover:bg-stone-200",
          ].join(" ")}
        >
          {key === "CLR" ? (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
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

// ─── Step 1 — Phone entry ───────────────────────────────────────────────────────

function PhoneStep({
  salonName,
  slug,
  onFound,
  onNotFound,
}: {
  salonName: string;
  slug: string;
  onFound: (appointments: KioskAppointment[]) => void;
  onNotFound: () => void;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleKey = useCallback(
    (key: string) => {
      if (key === "CLR") {
        setPhone("");
        setError("");
        return;
      }
      if (key === "OK") {
        handleLookup();
        return;
      }
      if (phone.length < 15) {
        setPhone((p) => p + key);
      }
      setError("");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phone]
  );

  async function handleLookup() {
    if (phone.length < 7) {
      setError("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await lookupClientByPhone(slug, phone);
      if (result.success && result.appointment) {
        onFound([result.appointment]);
      } else {
        onNotFound();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Format phone for display: add spaces every 3 digits
  const displayPhone = phone
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d{3})(\d{0,4})/, "$1 $2 $3")
    .trim();

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
        <p className="text-xl text-stone-500 mb-8">
          We'll find your appointment at {salonName}.
        </p>

        {/* Phone display */}
        <div className="bg-white rounded-2xl border-2 border-stone-200 px-6 py-5 text-center mb-4 min-h-[76px] flex items-center justify-center shadow-sm">
          <span className="text-4xl font-mono font-semibold tracking-widest text-stone-900">
            {displayPhone || <span className="text-stone-300">—</span>}
          </span>
        </div>

        {error && (
          <p className="text-rose-500 text-center text-base mb-4">{error}</p>
        )}

        {/* Keypad */}
        <NumericKeypad onKey={handleKey} />

        {/* Find button */}
        <button
          type="button"
          onClick={handleLookup}
          disabled={phone.length < 7 || loading}
          className="mt-5 w-full py-6 rounded-2xl bg-rose-600 text-white text-2xl font-semibold shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all"
        >
          {loading ? "Looking up…" : "Find my appointment"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 — Select appointment ───────────────────────────────────────────────

function SelectStep({
  appointments,
  onSelect,
  onBack,
}: {
  appointments: KioskAppointment[];
  onSelect: (appt: KioskAppointment) => void;
  onBack: () => void;
}) {
  function formatTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  const clientName = appointments[0]?.clientName ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-stone-50 px-6 py-12">
      <div className="w-full max-w-sm mx-auto">
        {/* Greeting */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-stone-900">
            Welcome,{" "}
            <span className="text-rose-600">{clientName}!</span>
          </h1>
          <p className="text-lg text-stone-500 mt-2">Tap your appointment to check in.</p>
        </div>

        {/* Appointment list */}
        <div className="flex flex-col gap-4">
          {appointments.map((appt) => {
            const services = appt.AppointmentService.map((as) => as.Service.name).join(", ");
            return (
              <button
                key={appt.id}
                type="button"
                onClick={() => onSelect(appt)}
                className="w-full bg-white rounded-2xl border-2 border-stone-100 p-6 text-left hover:border-rose-300 hover:shadow-md hover:shadow-rose-50 active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-stone-900 group-hover:text-rose-700 transition-colors">
                    {formatTime(appt.startTime)}
                  </span>
                  <span className="text-xs font-semibold text-stone-400 bg-stone-50 rounded-lg px-2 py-1 uppercase tracking-wide">
                    {appt.status}
                  </span>
                </div>
                <p className="text-lg text-stone-700 font-medium">{services || "—"}</p>
                <p className="text-base text-stone-400 mt-1">with {appt.staffName}</p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-6 w-full py-5 rounded-2xl bg-stone-50 text-stone-500 text-xl font-medium border border-stone-200 hover:bg-stone-100 active:scale-[0.98] transition-all"
        >
          Try a different number
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 — Confirmed ─────────────────────────────────────────────────────────

function ConfirmedStep({
  appointment,
  slug,
}: {
  appointment: KioskAppointment;
  slug: string;
}) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          router.replace(`/kiosk/${slug}`);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [router, slug]);

  function formatTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  const services = appointment.AppointmentService.map((as) => as.Service.name).join(", ");

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

        {/* Appointment summary */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 text-left space-y-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">Time</p>
              <p className="text-lg font-semibold text-stone-900">{formatTime(appointment.startTime)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">Service</p>
              <p className="text-lg font-semibold text-stone-900">{services || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">Staff</p>
              <p className="text-lg font-semibold text-stone-900">{appointment.staffName}</p>
            </div>
          </div>
        </div>

        <p className="text-base text-stone-300">
          Returning to home screen in {countdown} second{countdown !== 1 ? "s" : ""}…
        </p>
      </div>
    </div>
  );
}

// ─── Not found ─────────────────────────────────────────────────────────────────

function NotFoundStep({ slug, onBack }: { slug: string; onBack: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-stone-50 px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-8">
          <svg className="w-12 h-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-stone-900 mb-3">No appointment found</h1>
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
          onClick={() => router.replace(`/kiosk/${slug}/walk-in`)}
          className="w-full py-5 rounded-2xl bg-rose-600 text-white text-xl font-semibold shadow-md shadow-rose-100 hover:bg-rose-700 active:scale-[0.98] transition-all"
        >
          Walk in instead
        </button>
      </div>
    </div>
  );
}

// ─── Main orchestrator ─────────────────────────────────────────────────────────

export function CheckInFlow({ salon }: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [appointments, setAppointments] = useState<KioskAppointment[]>([]);
  const [selected, setSelected] = useState<KioskAppointment | null>(null);
  const [checkInError, setCheckInError] = useState("");

  function handleFound(appts: KioskAppointment[]) {
    setAppointments(appts);
    setStep("select");
  }

  async function handleSelect(appt: KioskAppointment) {
    setCheckInError("");
    try {
      const result = await checkInAppointment(appt.id);
      if (result.success) {
        setSelected(appt);
        setStep("confirmed");
      } else {
        setCheckInError(result.error ?? "Check-in failed. Please see staff.");
      }
    } catch {
      setCheckInError("Something went wrong. Please try again.");
    }
  }

  if (step === "phone") {
    return (
      <PhoneStep
        salonName={salon.name}
        slug={salon.slug}
        onFound={handleFound}
        onNotFound={() => setStep("not-found")}
      />
    );
  }

  if (step === "not-found") {
    return <NotFoundStep slug={salon.slug} onBack={() => setStep("phone")} />;
  }

  if (step === "select") {
    return (
      <>
        {checkInError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-lg font-medium px-6 py-3 rounded-2xl shadow-lg">
            {checkInError}
          </div>
        )}
        <SelectStep
          appointments={appointments}
          onSelect={handleSelect}
          onBack={() => setStep("phone")}
        />
      </>
    );
  }

  if (step === "confirmed" && selected) {
    return <ConfirmedStep appointment={selected} slug={salon.slug} />;
  }

  return null;
}
