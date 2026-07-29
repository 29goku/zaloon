"use client";

import { useState } from "react";
import { cancelAppointmentByClient } from "@/app/actions/appointments";

export function ClientCancelButton({
  appointmentId,
  clientId,
}: {
  appointmentId: string;
  clientId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setLoading(true);
    const result = await cancelAppointmentByClient(appointmentId, clientId);
    setLoading(false);
    if (result.success) {
      setDone(true);
      window.location.reload();
    } else {
      alert(result.error ?? "Failed to cancel appointment.");
    }
  }

  if (done) {
    return <span className="text-xs text-stone-400">Cancelled</span>;
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {loading ? "Cancelling…" : "Cancel"}
    </button>
  );
}
