"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  DollarSign,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";
import { createPayrollPayment } from "@/app/actions/payroll";
import { toast } from "@/components/ui/sonner";
import Link from "next/link";

interface ServiceBreakdown {
  serviceId: string;
  serviceName: string;
  count: number;
  revenue: number;
  commissionPct: number;
  commission: number;
}

interface EnhancedPayrollRowProps {
  staffId: string;
  staffName: string;
  initials: string;
  from: string;
  to: string;
  revenue: number;
  commissionPct: number;
  commissionEarned: number;
  alreadyPaidAmount: number;
  pendingBalance: number;
  services: ServiceBreakdown[];
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank Transfer" },
  { value: "CHECK", label: "Check" },
  { value: "OTHER", label: "Other" },
];

export function EnhancedPayrollRow({
  staffId,
  staffName,
  initials,
  from,
  to,
  revenue,
  commissionPct,
  commissionEarned,
  alreadyPaidAmount,
  pendingBalance,
  services,
}: EnhancedPayrollRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState(String(pendingBalance.toFixed(2)));
  const [method, setMethod] = useState("CASH");
  const [paidBy, setPaidBy] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isPaid = pendingBalance <= 0 && alreadyPaidAmount > 0;

  function openModal() {
    setAmount(String(pendingBalance.toFixed(2)));
    setPaidBy("");
    setNotes("");
    setMethod("CASH");
    setModalOpen(true);
  }

  function handleConfirm() {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    startTransition(async () => {
      const result = await createPayrollPayment({
        staffId,
        periodStart: from,
        periodEnd: to,
        totalRevenue: revenue,
        commission: amountNum,
        paidBy: paidBy.trim() || undefined,
        notes: notes.trim()
          ? `[${method}] ${notes.trim()}`
          : `[${method}]`,
      });

      if (!result.success) {
        toast.error(result.error ?? "Payment failed");
        return;
      }

      toast.success(`Payment recorded for ${staffName}`);
      setModalOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/30 transition-colors">
        {/* Staff name with expand toggle */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground leading-tight">
                {staffName}
              </p>
              <Link
                href={`/dashboard/staff/${staffId}?tab=commission`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
              >
                View settings
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        </td>

        {/* Total Revenue */}
        <td className="px-4 py-3 text-right text-foreground tabular-nums">
          ${revenue.toFixed(2)}
        </td>

        {/* Commission Rate */}
        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
          {commissionPct}%
        </td>

        {/* Commission Earned */}
        <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
          ${commissionEarned.toFixed(2)}
        </td>

        {/* Already Paid */}
        <td className="px-4 py-3 text-right tabular-nums">
          {alreadyPaidAmount > 0 ? (
            <span className="text-emerald-500 font-medium">
              ${alreadyPaidAmount.toFixed(2)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>

        {/* Pending Balance */}
        <td className="px-4 py-3 text-right tabular-nums">
          {isPaid ? (
            <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Paid in full
            </span>
          ) : pendingBalance > 0 ? (
            <span className="text-[#F41666] font-bold">
              ${pendingBalance.toFixed(2)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {!isPaid && commissionEarned > 0 && (
              <button
                type="button"
                onClick={openModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Mark as Paid
              </button>
            )}
            {isPaid && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Paid
              </span>
            )}
            <Link
              href={`/dashboard/finance/payroll/history?staffId=${staffId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-colors"
            >
              History
            </Link>
          </div>
        </td>
      </tr>

      {/* Expanded service breakdown */}
      {expanded && services.length > 0 && (
        <>
          <tr className="bg-muted/20 border-b border-border/50">
            <td className="pl-16 pr-4 py-2 text-xs font-semibold text-muted-foreground">
              Service
            </td>
            <td className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
              Revenue
            </td>
            <td className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
              Rate
            </td>
            <td className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
              Commission
            </td>
            <td colSpan={3} />
          </tr>
          {services.map((svc) => (
            <tr
              key={svc.serviceId}
              className="bg-muted/10 border-b border-border/30 last:border-border hover:bg-muted/20 transition-colors"
            >
              <td className="pl-16 pr-4 py-2 text-xs text-foreground">
                {svc.serviceName}
                <span className="text-muted-foreground ml-1.5">
                  ×{svc.count}
                </span>
              </td>
              <td className="px-4 py-2 text-right text-xs text-foreground tabular-nums">
                ${svc.revenue.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                {svc.commissionPct}%
              </td>
              <td className="px-4 py-2 text-right text-xs font-medium text-primary tabular-nums">
                ${svc.commission.toFixed(2)}
              </td>
              <td colSpan={3} />
            </tr>
          ))}
          <tr className="bg-muted/30 border-b border-border">
            <td className="pl-16 pr-4 py-2 text-xs font-bold text-foreground">
              Subtotal
            </td>
            <td className="px-4 py-2 text-right text-xs font-bold text-foreground tabular-nums">
              ${services.reduce((s, x) => s + x.revenue, 0).toFixed(2)}
            </td>
            <td />
            <td className="px-4 py-2 text-right text-xs font-bold text-primary tabular-nums">
              ${services.reduce((s, x) => s + x.commission, 0).toFixed(2)}
            </td>
            <td colSpan={3} />
          </tr>
        </>
      )}
      {expanded && services.length === 0 && (
        <tr className="bg-muted/10 border-b border-border">
          <td
            colSpan={7}
            className="pl-16 pr-4 py-3 text-xs text-muted-foreground"
          >
            No service breakdown available for this period.
          </td>
        </tr>
      )}

      {/* Mark as Paid modal */}
      {modalOpen && (
        <tr>
          <td colSpan={7} className="p-0 border-0">
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setModalOpen(false);
              }}
            >
              <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold text-foreground">
                    Record Payment
                  </h2>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Staff + period info */}
                <div className="rounded-xl bg-secondary/40 px-4 py-3 mb-5 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Staff</span>
                    <span className="font-semibold text-foreground">
                      {staffName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Period</span>
                    <span className="text-foreground">
                      {from} — {to}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Commission Earned
                    </span>
                    <span className="font-bold text-primary tabular-nums">
                      ${commissionEarned.toFixed(2)}
                    </span>
                  </div>
                  {alreadyPaidAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Already Paid
                      </span>
                      <span className="font-medium text-emerald-500 tabular-nums">
                        ${alreadyPaidAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                    <span className="font-semibold text-foreground">
                      Balance Due
                    </span>
                    <span className="font-bold text-[#F41666] tabular-nums">
                      ${pendingBalance.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-5">
                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Payment Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  {/* Payment method */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Payment Method
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMethod(m.value)}
                          disabled={isPending}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            method === m.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary text-foreground border-border hover:bg-secondary/80"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Paid by */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Paid by{" "}
                      <span className="text-muted-foreground/60">
                        (optional)
                      </span>
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

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Notes{" "}
                      <span className="text-muted-foreground/60">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any notes about this payment..."
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
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
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
                    onClick={() => setModalOpen(false)}
                    disabled={isPending}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
