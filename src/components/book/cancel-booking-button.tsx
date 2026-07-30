"use client";

import { InlineConfirm } from "@/components/ui/inline-confirm";

interface CancelBookingButtonProps {
  action: string;
  label?: string;
  className?: string;
}

export function CancelBookingButton({
  action,
  label = "Cancel",
  className = "flex items-center justify-center gap-1.5 w-full h-11 rounded-xl border-2 border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors",
}: CancelBookingButtonProps) {
  return (
    <InlineConfirm
      message="Are you sure you want to cancel this appointment? This cannot be undone."
      confirmLabel="Yes, cancel"
      onConfirm={async () => {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = action;
        document.body.appendChild(form);
        form.submit();
      }}
      trigger={
        <button type="button" className={className}>
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {label}
        </button>
      }
    />
  );
}
