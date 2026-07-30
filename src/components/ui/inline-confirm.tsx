"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface InlineConfirmProps {
  /** The trigger element — rendered as-is when not confirming */
  trigger: React.ReactNode;
  /** Short question shown in the confirm state, e.g. "Delete this entry?" */
  message: string;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Tailwind classes for the confirm button (default: destructive red) */
  confirmClassName?: string;
  /** Called when the user clicks Confirm */
  onConfirm: () => void | Promise<void>;
}

/**
 * Drop-in replacement for window.confirm.
 * Shows the trigger normally; on click switches to an inline
 * Cancel / Confirm pair with an optional loading state.
 */
export function InlineConfirm({
  trigger,
  message,
  confirmLabel = "Confirm",
  confirmClassName = "px-2.5 py-1 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-60",
  onConfirm,
}: InlineConfirmProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="contents"
      >
        {trigger}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs text-muted-foreground text-right">{message}</p>
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleConfirm}
          className={confirmClassName}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : confirmLabel}
        </button>
      </div>
    </div>
  );
}
