"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renewMembership, deletePlan } from "@/app/actions/memberships";
import { InlineConfirm } from "@/components/ui/inline-confirm";

// ── RenewMembershipButton ──────────────────────────────────────────────────

export function RenewMembershipButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <InlineConfirm
      message="Mark as renewed? This will extend the end date by 1 month, reset sessions used, and create an invoice."
      confirmLabel="Mark Renewed"
      confirmClassName="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
      onConfirm={async () => {
        const res = await renewMembership(id);
        if (!res.success) throw new Error(res.error ?? "Failed to renew");
        router.refresh();
      }}
      trigger={
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          Mark Renewed
        </Button>
      }
    />
  );
}

// ── DeletePlanButton ───────────────────────────────────────────────────────

export function DeletePlanButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  return (
    <InlineConfirm
      message={`Delete plan "${name}"? This cannot be undone.`}
      onConfirm={async () => {
        const res = await deletePlan(id);
        if (!res.success) throw new Error(res.error ?? "Failed to delete");
        router.refresh();
      }}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete plan"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      }
    />
  );
}
