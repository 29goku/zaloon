"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { markStaffPaid } from "@/app/actions/payroll";

interface Props {
  staffId: string;
  staffName: string;
  from: string;
  to: string;
  revenue: number;
  commission: number;
  initialPaid: boolean;
}

export function MarkPaidButton({ staffId, staffName, from, to, revenue, commission, initialPaid }: Props) {
  const [paid, setPaid] = useState(initialPaid);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (paid) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        Paid
      </span>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <p className="text-xs text-muted-foreground text-right">
          Pay {staffName} <span className="font-semibold text-foreground">${commission.toFixed(2)}</span>?
        </p>
        {error && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setConfirming(false); setError(null); }}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              setError(null);
              const result = await markStaffPaid({
                staffId,
                periodStart: new Date(from),
                periodEnd: new Date(to),
                totalRevenue: revenue,
                commission,
              });
              if (result.success) {
                setPaid(true);
                setConfirming(false);
              } else {
                setError(result.error ?? "Failed");
              }
              setLoading(false);
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Confirm
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      <CheckCircle2 className="w-3 h-3" />
      Mark Paid
    </button>
  );
}
