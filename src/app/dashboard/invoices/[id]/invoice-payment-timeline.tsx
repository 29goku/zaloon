"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, PlusCircle } from "lucide-react";
import { recordPartialPayment } from "@/app/actions/invoices";

interface PartialPaymentEntry {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  createdAt: string; // ISO string
}

interface Props {
  invoiceId: string;
  invoiceTotal: number;
  status: string;
  createdAt: string; // ISO string
  paidAt: string | null; // ISO string
  partialPayments: PartialPaymentEntry[];
  fmt: (n: number) => string;
}

export function InvoicePaymentTimeline({
  invoiceId,
  invoiceTotal,
  status,
  createdAt,
  paidAt,
  partialPayments,
  fmt,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [recording, startRecording] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const paidSoFar = partialPayments.reduce((s, p) => s + p.amount, 0);
  const remaining = invoiceTotal - paidSoFar;
  const isPending = status === "PENDING";

  function handleRecord() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setError(null);
    startRecording(async () => {
      const res = await recordPartialPayment(invoiceId, amt, method);
      if (res.success) {
        setShowForm(false);
        setAmount("");
        router.refresh();
      } else {
        setError(res.error ?? "Failed to record payment");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Clock className="w-4 h-4 text-primary" />
        Payment Timeline
      </div>

      {/* Timeline events */}
      <ol className="relative border-l border-border/60 ml-2 space-y-4">
        {/* Invoice created */}
        <li className="ml-4">
          <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-secondary border border-border" />
          <p className="text-xs text-muted-foreground">
            {new Date(createdAt).toLocaleString("en", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-sm text-foreground font-medium mt-0.5">Invoice created</p>
          <p className="text-xs text-muted-foreground">Total: {fmt(invoiceTotal)}</p>
        </li>

        {/* Partial payments */}
        {partialPayments.map((p) => (
          <li key={p.id} className="ml-4">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary/30 border border-primary/50" />
            <p className="text-xs text-muted-foreground">
              {new Date(p.createdAt).toLocaleString("en", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-sm text-foreground font-medium mt-0.5">
              Partial payment — {fmt(p.amount)}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              via {p.method.toLowerCase()}{p.note ? ` · ${p.note}` : ""}
            </p>
          </li>
        ))}

        {/* Paid at */}
        {paidAt && (
          <li className="ml-4">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary border border-primary">
              <CheckCircle2 className="w-2 h-2 text-primary-foreground" />
            </span>
            <p className="text-xs text-muted-foreground">
              {new Date(paidAt).toLocaleString("en", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-sm text-primary font-semibold mt-0.5">Paid in full</p>
          </li>
        )}
      </ol>

      {/* Partial payment summary */}
      {partialPayments.length > 0 && isPending && (
        <div className="rounded-lg bg-secondary/40 px-3 py-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid so far</span>
            <span className="font-medium text-foreground">{fmt(paidSoFar)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-semibold text-[#F48E16]">{fmt(remaining)}</span>
          </div>
        </div>
      )}

      {/* Record partial payment button/form */}
      {isPending && (
        <div>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Record partial payment
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border border-border p-3 bg-secondary/20">
              <p className="text-xs font-semibold text-foreground">Record partial payment</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={`Amount (max ${fmt(remaining)})`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="ONLINE">Online</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              {error && <p className="text-xs text-[#F41666]">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRecord}
                  disabled={recording}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
                >
                  {recording ? "Recording…" : "Record"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
