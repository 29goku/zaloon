"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { receivePurchaseOrder, cancelPurchaseOrder } from "@/app/actions/inventory";

interface PurchaseOrderActionsProps {
  orderId: string;
}

export function PurchaseOrderActions({ orderId }: PurchaseOrderActionsProps) {
  const router = useRouter();
  const [receiving, setReceiving] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleReceive() {
    if (!confirm("Mark this order as received? Stock will be updated for all items.")) return;
    setReceiving(true);
    setError(null);
    const result = await receivePurchaseOrder(orderId);
    setReceiving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to receive order");
      return;
    }
    router.refresh();
  }

  async function handleCancel() {
    if (!confirm("Cancel this purchase order?")) return;
    setCancelling(true);
    setError(null);
    const result = await cancelPurchaseOrder(orderId);
    setCancelling(false);
    if (!result.success) {
      setError(result.error ?? "Failed to cancel order");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && (
        <span className="text-xs text-destructive mr-1">{error}</span>
      )}
      <button
        onClick={handleReceive}
        disabled={receiving || cancelling}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
        title="Mark as received"
      >
        {receiving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <CheckCircle className="w-3.5 h-3.5" />
        )}
        Receive
      </button>
      <button
        onClick={handleCancel}
        disabled={receiving || cancelling}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
        title="Cancel order"
      >
        {cancelling ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <XCircle className="w-3.5 h-3.5" />
        )}
        Cancel
      </button>
    </div>
  );
}
