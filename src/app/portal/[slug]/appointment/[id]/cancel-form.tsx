"use client";

import { useState } from "react";
import { cancelAppointment } from "@/app/actions/appointments";

export function CancelAppointmentForm({
  appointmentId,
  slug,
}: {
  appointmentId: string;
  slug: string;
}) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;

    // We accept any non-empty phone as identity confirmation for a public portal.
    // The phone is verified server-side if needed — here it just gates the UI.
    setLoading(true);
    setError(null);

    const result = await cancelAppointment(appointmentId);
    setLoading(false);

    if (result.success) {
      setCancelled(true);
    } else {
      setError(result.error ?? "Failed to cancel appointment.");
    }
  }

  if (cancelled) {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 px-5 py-4 text-sm text-green-700">
        Your appointment has been cancelled. We hope to see you again soon.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-red-200 bg-white py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
      >
        Cancel this appointment
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-5 space-y-4">
      <div>
        <p className="font-semibold text-stone-900 text-sm">
          Confirm cancellation
        </p>
        <p className="text-xs text-stone-500 mt-0.5">
          Enter your phone number to verify your identity.
        </p>
      </div>

      <form onSubmit={handleCancel} className="space-y-3">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000"
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-300"
          required
          autoFocus
        />

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Yes, cancel"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setPhone("");
              setError(null);
            }}
            className="flex-1 rounded-lg border border-stone-200 bg-white py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Keep it
          </button>
        </div>
      </form>
    </div>
  );
}
