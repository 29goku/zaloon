"use client";

import { useState } from "react";
import { cancelAppointment } from "@/app/actions/appointments";
import { InlineConfirm } from "@/components/ui/inline-confirm";

export function CancelButton({
  appointmentId,
  onCancelled,
}: {
  appointmentId: string;
  onCancelled?: () => void;
}) {
  const [done, setDone] = useState(false);

  if (done) return <span className="text-xs text-muted-foreground">Cancelled</span>;

  return (
    <InlineConfirm
      message="Cancel this appointment?"
      confirmLabel="Yes, cancel"
      confirmClassName="px-2.5 py-1 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-60"
      onConfirm={async () => {
        const result = await cancelAppointment(appointmentId);
        if (!result.success) throw new Error(result.error ?? "Failed to cancel appointment.");
        setDone(true);
        onCancelled?.();
        window.location.reload();
      }}
      trigger={
        <button
          className="rounded-md border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
        >
          Cancel
        </button>
      }
    />
  );
}
