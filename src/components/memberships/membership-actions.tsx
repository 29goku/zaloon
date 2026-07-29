"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renewMembership, deletePlan } from "@/app/actions/memberships";

// ── RenewMembershipButton ──────────────────────────────────────────────────

export function RenewMembershipButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleRenew() {
    if (!confirm("Mark this membership as renewed? This will extend the end date by 1 month, reset sessions used, and create an invoice.")) return;
    setPending(true);
    setError(null);
    const res = await renewMembership(id);
    if (!res.success) {
      setError(res.error ?? "Failed to renew");
    } else {
      router.refresh();
    }
    setPending(false);
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRenew}
        disabled={pending}
        className="gap-1.5 text-xs"
      >
        {pending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        Mark Renewed
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── DeletePlanButton ───────────────────────────────────────────────────────

export function DeletePlanButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete plan "${name}"? This cannot be undone.`)) return;
    setPending(true);
    setError(null);
    const res = await deletePlan(id);
    if (!res.success) {
      setError(res.error ?? "Failed to delete");
    } else {
      router.refresh();
    }
    setPending(false);
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete plan"
        disabled={pending}
        onClick={handleDelete}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </Button>
      {error && <p className="text-xs text-destructive max-w-[160px]">{error}</p>}
    </div>
  );
}
