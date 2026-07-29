"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, DollarSign, X } from "lucide-react";
import { markPeriodPaid } from "@/app/actions/payroll";
import { toast } from "@/components/ui/sonner";

interface MarkPaidButtonProps {
  staffId: string;
  staffName: string;
  from: string;
  to: string;
  commission: number;
  alreadyPaid: boolean;
}

export function MarkPaidButton({
  staffId,
  staffName,
  from,
  to,
  commission,
  alreadyPaid,
}: MarkPaidButtonProps) {
  const [open, setOpen] = useState(false);
  const [paidBy, setPaidBy] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (alreadyPaid) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Paid
      </span>
    );
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await markPeriodPaid(
        staffId,
        from,
        to,
        commission,
        paidBy.trim() || undefined,
        notes.trim() || undefined
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${staffName} marked as paid`);
      setOpen(false);
      setPaidBy("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
      >
        <DollarSign className="w-3.5 h-3.5" />
        Mark Paid
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Confirm Payment</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 mb-5">
              <p className="text-sm text-muted-foreground">
                Mark commission payment for{" "}
                <span className="font-semibold text-foreground">{staffName}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Period:{" "}
                <span className="text-foreground">
                  {from} &mdash; {to}
                </span>
              </p>
              <p className="text-2xl font-bold text-primary mt-2 tabular-nums">
                ${commission.toFixed(2)}
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Paid by <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  type="text"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  placeholder="e.g. Jane (manager)"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  disabled={isPending}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Notes <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Recording…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm Payment
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
