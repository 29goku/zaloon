"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Loader2, Gift, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateGiftCard, redeemGiftCard } from "@/app/actions/gift-cards";
import type { GiftCardRow } from "@/app/actions/gift-cards";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RedeemGiftCardWidgetProps {
  /** Optional invoice ID to record against the transaction */
  invoiceId?: string;
  /** Called after a successful redemption with the amount deducted */
  onRedeemed?: (amount: number, newBalance: number) => void;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const lookupSchema = z.object({
  code: z.string().min(1, "Code is required"),
});

const redeemSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
});

type LookupValues = z.infer<typeof lookupSchema>;
type RedeemValues = z.infer<typeof redeemSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RedeemGiftCardWidget({ invoiceId, onRedeemed }: RedeemGiftCardWidgetProps) {
  const [card, setCard] = React.useState<GiftCardRow | null>(null);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [redeemError, setRedeemError] = React.useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = React.useState<{
    amount: number;
    newBalance: number;
  } | null>(null);

  // Lookup form
  const {
    register: registerLookup,
    handleSubmit: handleLookupSubmit,
    formState: { isSubmitting: isLooking },
  } = useForm<LookupValues>({ resolver: zodResolver(lookupSchema) });

  // Redeem form
  const {
    register: registerRedeem,
    handleSubmit: handleRedeemSubmit,
    reset: resetRedeem,
    formState: { errors: redeemErrors, isSubmitting: isRedeeming },
  } = useForm<RedeemValues>({ resolver: zodResolver(redeemSchema) });

  async function onLookup(values: LookupValues) {
    setLookupError(null);
    setCard(null);
    setRedeemSuccess(null);

    const result = await validateGiftCard(values.code);
    if (!result.success) {
      setLookupError(result.error);
      return;
    }
    setCard(result.card);
  }

  async function onRedeem(values: RedeemValues) {
    if (!card) return;
    setRedeemError(null);

    const amount = Number(values.amount);
    const result = await redeemGiftCard(card.code, amount, invoiceId);
    if (!result.success) {
      setRedeemError(result.error);
      return;
    }

    setRedeemSuccess({ amount, newBalance: result.newBalance });
    setCard({ ...card, balance: result.newBalance });
    resetRedeem();
    onRedeemed?.(amount, result.newBalance);
  }

  const balancePct =
    card && card.initialValue > 0
      ? Math.round((card.balance / card.initialValue) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Code lookup */}
      <form onSubmit={handleLookupSubmit(onLookup)} className="flex gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="gc-code" className="sr-only">Gift card code</Label>
          <Input
            id="gc-code"
            type="text"
            placeholder="GC-XXXXXX"
            className="font-mono uppercase"
            {...registerLookup("code")}
          />
        </div>
        <Button type="submit" variant="outline" disabled={isLooking} className="flex-shrink-0">
          {isLooking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span className="sr-only">Check Balance</span>
        </Button>
      </form>

      {/* Lookup error */}
      {lookupError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {lookupError}
        </div>
      )}

      {/* Card info */}
      {card && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              <span className="font-mono font-semibold text-sm tracking-wider">{card.code}</span>
            </div>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                card.status === "ACTIVE"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {card.status}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-semibold text-foreground">
                ${card.balance.toFixed(2)}
                <span className="text-muted-foreground font-normal text-xs ml-1">
                  / ${card.initialValue.toFixed(2)}
                </span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  balancePct > 50 ? "bg-primary" : balancePct > 20 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${balancePct}%` }}
              />
            </div>
          </div>

          {card.recipientName && (
            <p className="text-xs text-muted-foreground">
              Recipient: <span className="text-foreground">{card.recipientName}</span>
            </p>
          )}

          {card.expiresAt && (
            <p className="text-xs text-muted-foreground">
              Expires: <span className="text-foreground">{card.expiresAt}</span>
            </p>
          )}
        </div>
      )}

      {/* Redeem success banner */}
      {redeemSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-800 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Applied ${redeemSuccess.amount.toFixed(2)}. New balance: ${redeemSuccess.newBalance.toFixed(2)}
        </div>
      )}

      {/* Redeem form — only show when card is valid and ACTIVE */}
      {card && card.status === "ACTIVE" && (
        <form onSubmit={handleRedeemSubmit(onRedeem)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gc-amount">Amount to redeem</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="gc-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={card.balance}
                placeholder={card.balance.toFixed(2)}
                className="pl-7"
                aria-invalid={!!redeemErrors.amount}
                {...registerRedeem("amount")}
              />
            </div>
            {redeemErrors.amount && (
              <p className="text-xs text-destructive">{redeemErrors.amount.message}</p>
            )}
          </div>

          {redeemError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {redeemError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isRedeeming}>
            {isRedeeming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying…
              </>
            ) : (
              "Apply Gift Card"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
