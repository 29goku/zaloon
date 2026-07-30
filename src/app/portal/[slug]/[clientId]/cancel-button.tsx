"use client";

import { useState } from "react";
import { cancelAppointmentByClient } from "@/app/actions/appointments";
import { InlineConfirm } from "@/components/ui/inline-confirm";

export function ClientCancelButton({
  appointmentId,
  clientId,
}: {
  appointmentId: string;
  clientId: string;
}) {
  const [done, setDone] = useState(false);

  if (done) {
    return <span className="text-xs text-stone-400">Cancelled</span>;
  }

  return (
    <InlineConfirm
      message="Cancel this appointment?"
      confirmLabel="Yes, cancel"
      confirmClassName="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
      onConfirm={async () => {
        const result = await cancelAppointmentByClient(appointmentId, clientId);
        if (!result.success) throw new Error(result.error ?? "Failed to cancel appointment.");
        setDone(true);
        window.location.reload();
      }}
      trigger={
        <button
          className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Cancel
        </button>
      }
    />
  );
}
