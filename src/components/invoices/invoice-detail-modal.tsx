"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  X,
  Printer,
  Ban,
  CheckCircle2,
  Plus,
  ExternalLink,
  Calendar,
  CreditCard,
  Receipt,
} from "lucide-react";
import { voidInvoice, markInvoicePaid, addPartialPayment } from "@/app/actions/invoices";
import type { InvoiceSummary, PartialPaymentSummary } from "@/app/dashboard/invoices/invoices-client";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-primary/20 text-primary",
  VOID: "bg-[#F41666]/20 text-[#F41666]",
  PENDING: "bg-[#F48E16]/20 text-[#F48E16]",
  PARTIAL: "bg-blue-500/20 text-blue-400",
};

// ─── Add payment form ─────────────────────────────────────────────────────────

function AddPaymentForm({
  invoiceId,
  remaining,
  onSuccess,
  onCancel,
}: {
  invoiceId: string;
  remaining: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addPartialPayment(invoiceId, { amount: amt, method, note: note || undefined });
      if (res.success) {
        onSuccess();
      } else {
        setError(res.error ?? "Failed to add payment");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
      <p className="text-sm font-semibold text-foreground">Add payment</p>
      {error && (
        <p className="text-xs text-[#F41666] bg-[#F41666]/10 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring"
          >
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="ONLINE">Online</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. second installment"
          className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Add payment"}
        </button>
      </div>
    </form>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  invoice: InvoiceSummary;
  currency: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function InvoiceDetailModal({ invoice, currency, onClose, onRefresh }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [isVoiding, startVoidTransition] = useTransition();
  const [isMarkingPaid, startMarkPaidTransition] = useTransition();

  const isVoid = invoice.status === "VOID";
  const isPaid = invoice.status === "PAID";

  const partialTotal = invoice.partialPayments.reduce((s: number, p: PartialPaymentSummary) => s + p.amount, 0);
  const remaining = Math.max(0, invoice.total - partialTotal);

  const statusClass = STATUS_STYLES[invoice.status] ?? "bg-secondary text-muted-foreground";

  function handleVoid() {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    startVoidTransition(async () => {
      const res = await voidInvoice(invoice.id);
      if (res.success) {
        onRefresh();
        onClose();
      } else {
        alert(res.error ?? "Failed to void invoice");
      }
    });
  }

  function handleMarkPaid() {
    startMarkPaidTransition(async () => {
      const res = await markInvoicePaid(invoice.id, invoice.paymentMethod);
      if (res.success) {
        onRefresh();
        onClose();
      } else {
        alert(res.error ?? "Failed to mark as paid");
      }
    });
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-label={`Invoice ${invoice.invoiceNum}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border bg-secondary/30 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-4 h-4 text-primary" />
              <span className="font-mono font-bold text-foreground text-lg">{invoice.invoiceNum}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>
                {invoice.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(invoice.createdAt).toLocaleDateString("en", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            {invoice.clientName && (
              <p className="text-sm font-medium text-foreground mt-0.5">{invoice.clientName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Services summary */}
          {invoice.servicesSummary && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Services</p>
              <p className="text-sm text-foreground">{invoice.servicesSummary}</p>
            </div>
          )}

          {/* Totals table */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Summary</p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/50">
                  {invoice.discount > 0 && (
                    <tr className="hover:bg-secondary/20">
                      <td className="px-4 py-2.5 text-muted-foreground">Discount</td>
                      <td className="px-4 py-2.5 text-right text-foreground tabular-nums">
                        -{fmt(invoice.discount)}
                      </td>
                    </tr>
                  )}
                  {invoice.tip > 0 && (
                    <tr className="hover:bg-secondary/20">
                      <td className="px-4 py-2.5 text-muted-foreground">Tip</td>
                      <td className="px-4 py-2.5 text-right text-emerald-500 tabular-nums font-medium">
                        +{fmt(invoice.tip)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-secondary/30">
                    <td className="px-4 py-3 font-bold text-foreground">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground text-lg tabular-nums">
                      {fmt(invoice.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment info */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Payment</p>
            <div className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Method
                </span>
                <span className="font-medium text-foreground">
                  {invoice.paymentMethod.charAt(0).toUpperCase() +
                    invoice.paymentMethod.slice(1).toLowerCase()}
                </span>
              </div>
              {invoice.paidAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Paid at</span>
                  <span className="text-foreground">
                    {new Date(invoice.paidAt).toLocaleDateString("en", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}

              {/* Partial payments */}
              {invoice.partialPayments.length > 0 && (
                <div className="pt-2 border-t border-border/50 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Partial payments</p>
                  {invoice.partialPayments.map((p: PartialPaymentSummary) => (
                    <div key={p.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {p.method} — {new Date(p.createdAt).toLocaleDateString("en", { day: "numeric", month: "short" })}
                        {p.note && <span className="ml-1 italic">({p.note})</span>}
                      </span>
                      <span className="font-semibold text-foreground tabular-nums">{fmt(p.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className={`font-bold tabular-nums ${remaining > 0 ? "text-[#F48E16]" : "text-primary"}`}>
                      {fmt(remaining)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Appointment link */}
          {invoice.appointmentId && (
            <div>
              <Link
                href={`/dashboard/appointments/${invoice.appointmentId}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View linked appointment
              </Link>
            </div>
          )}

          {/* Add payment form */}
          {showAddPayment && !isVoid && (
            <AddPaymentForm
              invoiceId={invoice.id}
              remaining={remaining}
              onSuccess={() => {
                setShowAddPayment(false);
                onRefresh();
                onClose();
              }}
              onCancel={() => setShowAddPayment(false)}
            />
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border bg-secondary/30 flex flex-wrap gap-2 justify-between shrink-0">
          <div className="flex flex-wrap gap-2">
            {/* Print / Email receipt */}
            <a
              href={`/dashboard/invoices/${invoice.id}/receipt`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print/Email receipt
            </a>

            {/* Add payment */}
            {!isVoid && !isPaid && (
              <button
                type="button"
                onClick={() => setShowAddPayment((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add payment
              </button>
            )}

            {/* Mark paid */}
            {!isVoid && !isPaid && (
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={isMarkingPaid}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isMarkingPaid ? "Saving…" : "Mark paid"}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              href={`/dashboard/invoices/${invoice.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-secondary/60 transition-colors"
            >
              Full details
            </Link>

            {/* Void invoice */}
            {!isVoid && (
              <button
                type="button"
                onClick={handleVoid}
                disabled={isVoiding}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#F41666]/50 text-[#F41666] hover:bg-[#F41666]/10 transition-colors disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                {isVoiding ? "Voiding…" : "Void"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
