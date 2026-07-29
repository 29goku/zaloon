"use client";

import * as React from "react";
import { CheckCircle, CreditCard, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkoutAppointment } from "@/app/actions/appointments";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Service = { name: string; price: number; staffName?: string | null };

export interface CheckoutAppointment {
  id: string;
  clientName: string | null;
  staffName: string;
  date: string;
  startTime: string;
  totalAmount: number;
  services: Service[];
  currency: string;
}

interface CheckoutDialogProps {
  appointment: CheckoutAppointment;
  /** When provided, the dialog renders as a controlled dialog opened by this trigger */
  trigger?: React.ReactNode;
  /** Controlled open state — provide together with onOpenChange for external control */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// ─── Payment method options ────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "TRANSFER", label: "Bank Transfer" },
] as const;

type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckoutDialog({
  appointment,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CheckoutDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  // Support both controlled and uncontrolled usage
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setInternalOpen;

  const [paymentMethod, setPaymentMethod] =
    React.useState<PaymentMethodValue>("CASH");
  const [discountType, setDiscountType] = React.useState<"amount" | "percent">(
    "amount"
  );
  const [discountValue, setDiscountValue] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [invoiceId, setInvoiceId] = React.useState<string | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: appointment.currency,
      minimumFractionDigits: 0,
    }).format(n);

  // ── Discount calculation ──────────────────────────────────────────────────
  const discountNum = parseFloat(discountValue);
  const hasDiscount = !isNaN(discountNum) && discountNum > 0;
  const discountAmount = hasDiscount
    ? discountType === "percent"
      ? (appointment.totalAmount * discountNum) / 100
      : discountNum
    : 0;
  const finalTotal = Math.max(0, appointment.totalAmount - discountAmount);

  // ── Reset on close ────────────────────────────────────────────────────────
  function handleOpenChange(next: boolean) {
    if (!next) {
      setPaymentMethod("CASH");
      setDiscountType("amount");
      setDiscountValue("");
      setError(null);
      setInvoiceId(null);
      setPending(false);
    }
    setOpen(next);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleCheckout() {
    setPending(true);
    setError(null);
    const result = await checkoutAppointment(
      appointment.id,
      paymentMethod,
      hasDiscount ? finalTotal : undefined
    );
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setInvoiceId(result.invoiceId);
  }

  function handlePrintReceipt() {
    if (invoiceId) {
      window.open(`/dashboard/invoices/${invoiceId}`, "_blank");
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  const isSuccess = invoiceId !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger
          render={<span onClick={() => setOpen(true)} />}
        >
          {trigger}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        {isSuccess ? (
          // ── Success view ────────────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <CheckCircle className="w-5 h-5" />
                Payment Collected!
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 text-center space-y-2">
              <p className="text-foreground font-semibold text-lg">
                {fmt(finalTotal)}
              </p>
              <p className="text-muted-foreground text-sm">
                Invoice{" "}
                <span className="font-mono font-medium text-foreground">
                  #{invoiceId.slice(-6).toUpperCase()}
                </span>{" "}
                created via{" "}
                {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}
              </p>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Close
              </DialogClose>
              <Button onClick={handlePrintReceipt} className="gap-2">
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
            </DialogFooter>
          </>
        ) : (
          // ── Checkout form ───────────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Check Out
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 mt-1">
              {/* Appointment summary */}
              <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">
                      {appointment.clientName ?? "Walk-in"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {appointment.date} at {appointment.startTime} &middot;{" "}
                      {appointment.staffName}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {fmt(appointment.totalAmount)}
                  </p>
                </div>

                {appointment.services.length > 0 && (
                  <div className="space-y-1.5 border-t border-border/60 pt-3">
                    {appointment.services.map((svc, i) => (
                      <div key={i} className="flex justify-between items-start text-xs text-muted-foreground">
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground">{svc.name}</span>
                          {svc.staffName && (
                            <span className="block text-muted-foreground">
                              Staff: {svc.staffName}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 ml-2">{fmt(svc.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        paymentMethod === method.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Discount{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <div className="flex gap-2">
                  {/* Toggle amount vs percent */}
                  <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setDiscountType("amount")}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        discountType === "amount"
                          ? "bg-muted text-foreground"
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Amt
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer border-l border-border ${
                        discountType === "percent"
                          ? "bg-muted text-foreground"
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      %
                    </button>
                  </div>

                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={discountType === "percent" ? "0–100" : "0.00"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="flex-1"
                  />
                </div>

                {hasDiscount && (
                  <div className="rounded-lg bg-primary/8 px-3 py-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Discount applied
                    </span>
                    <span className="font-semibold text-foreground">
                      &minus;{fmt(discountAmount)} &rarr; New total:{" "}
                      <span className="text-primary">{fmt(finalTotal)}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button onClick={handleCheckout} disabled={pending}>
                {pending
                  ? "Processing…"
                  : `Complete & Collect ${fmt(finalTotal)}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
