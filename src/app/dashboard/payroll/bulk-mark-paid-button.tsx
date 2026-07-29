"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { bulkMarkPaid } from "@/app/actions/payroll";
import { toast } from "@/components/ui/sonner";

interface BulkMarkPaidButtonProps {
  staffIds: string[];
  from: string;
  to: string;
}

export function BulkMarkPaidButton({ staffIds, from, to }: BulkMarkPaidButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await bulkMarkPaid(staffIds, {
        start: new Date(from),
        end: new Date(to),
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to bulk mark paid");
      } else {
        toast.success(`${result.count} staff member${result.count !== 1 ? "s" : ""} marked as paid`);
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (staffIds.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        Mark All Paid ({staffIds.length})
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Mark All Paid</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Mark <span className="font-semibold text-foreground">{staffIds.length} staff member{staffIds.length !== 1 ? "s" : ""}</span> as paid for the period{" "}
              <span className="text-foreground">{from} — {to}</span>?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm</>
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
