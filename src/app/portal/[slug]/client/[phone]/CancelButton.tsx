"use client";

import { useState } from "react";
import { cancelAppointment } from "@/app/actions/appointments";

export function CancelButton({
  appointmentId,
  onCancelled,
}: {
  appointmentId: string;
  onCancelled?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setLoading(true);
    const result = await cancelAppointment(appointmentId);
    setLoading(false);
    if (result.success) {
      setDone(true);
      onCancelled?.();
      // Refresh the page to reflect cancelled state
      window.location.reload();
    } else {
      alert(result.error ?? "Failed to cancel appointment.");
    }
  }

  if (done) return <span className="text-xs text-muted-foreground">Cancelled</span>;

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="rounded-md border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
    >
      {loading ? "Cancelling…" : "Cancel"}
    </button>
  );
}
