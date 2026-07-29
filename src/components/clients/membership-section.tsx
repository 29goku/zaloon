"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, X, Check, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assignMembership, cancelMembership } from "@/app/actions/memberships";

interface Plan {
  id: string;
  name: string;
  price: number;
  sessionsPerMonth: number;
  discountPct: number;
  description: string | null;
}

interface ActiveMembership {
  id: string;
  startDate: string;
  Plan: Plan;
}

interface MembershipSectionProps {
  clientId: string;
  activeMembership: ActiveMembership | null;
  availablePlans: Plan[];
}

export function MembershipSection({
  clientId,
  activeMembership,
  availablePlans,
}: MembershipSectionProps) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPendingAssign, startAssign] = useTransition();
  const [isPendingCancel, startCancel] = useTransition();

  function handleAssign() {
    if (!selectedPlanId) {
      setFeedback({ type: "error", message: "Please select a plan" });
      return;
    }
    setFeedback(null);
    startAssign(async () => {
      const res = await assignMembership(clientId, selectedPlanId);
      if (res.success) {
        setFeedback({ type: "success", message: "Membership assigned!" });
        setSelectedPlanId("");
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error });
      }
    });
  }

  function handleCancel(membershipId: string) {
    setFeedback(null);
    startCancel(async () => {
      const res = await cancelMembership(membershipId);
      if (res.success) {
        setFeedback({ type: "success", message: "Membership cancelled." });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error });
      }
    });
  }

  return (
    <div className="space-y-3">
      {activeMembership ? (
        /* Active membership card */
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {activeMembership.Plan.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Since{" "}
                {new Date(activeMembership.startDate).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" }
                )}
                {" · "}
                {activeMembership.Plan.price.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })}
                /mo
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isPendingCancel}
            onClick={() => handleCancel(activeMembership.id)}
            className="flex-shrink-0 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            {isPendingCancel ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )}
            Cancel
          </Button>
        </div>
      ) : (
        /* Assign membership */
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            This client has no active membership.
          </p>
          {availablePlans.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No active membership plans available.
            </p>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-card px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Select a plan…</option>
                  {availablePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} —{" "}
                      {plan.price.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })}
                      /mo
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              <Button
                size="sm"
                disabled={isPendingAssign || !selectedPlanId}
                onClick={handleAssign}
                className="flex-shrink-0 gap-1.5"
              >
                {isPendingAssign ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Assign
              </Button>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <p
          className={`text-xs px-1 ${
            feedback.type === "success" ? "text-primary" : "text-destructive"
          }`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
