"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import { receivePurchaseOrder, cancelPurchaseOrder } from "@/app/actions/inventory";
import { InlineConfirm } from "@/components/ui/inline-confirm";

interface PurchaseOrderActionsProps {
  orderId: string;
}

export function PurchaseOrderActions({ orderId }: PurchaseOrderActionsProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1.5">
      <InlineConfirm
        message="Mark this order as received? Stock will be updated for all items."
        confirmLabel="Receive"
        confirmClassName="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
        onConfirm={async () => {
          const result = await receivePurchaseOrder(orderId);
          if (!result.success) throw new Error(result.error ?? "Failed to receive order");
          router.refresh();
        }}
        trigger={
          <button
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            title="Mark as received"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Receive
          </button>
        }
      />
      <InlineConfirm
        message="Cancel this purchase order?"
        confirmLabel="Cancel order"
        onConfirm={async () => {
          const result = await cancelPurchaseOrder(orderId);
          if (!result.success) throw new Error(result.error ?? "Failed to cancel order");
          router.refresh();
        }}
        trigger={
          <button
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
            title="Cancel order"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancel
          </button>
        }
      />
    </div>
  );
}
