"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins, Plus, Minus, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addLoyaltyPoints, deductLoyaltyPoints } from "@/app/actions/clients";

interface PointsPanelProps {
  clientId: string;
  currentPoints: number;
}

export function PointsPanel({ clientId, currentPoints }: PointsPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "add" | "redeem">("idle");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeForm() {
    setMode("idle");
    setPoints("");
    setReason("");
    setFeedback(null);
  }

  function handleSubmit() {
    const pts = parseInt(points, 10);
    if (!pts || pts <= 0) {
      setFeedback({ type: "error", message: "Enter a positive number" });
      return;
    }
    setFeedback(null);

    startTransition(async () => {
      const res =
        mode === "add"
          ? await addLoyaltyPoints(clientId, pts, reason || "Manual adjustment")
          : await deductLoyaltyPoints(clientId, pts, reason || "Redeemed");

      if (res.success) {
        const verb = mode === "add" ? "added" : "redeemed";
        setFeedback({
          type: "success",
          message: `${pts} pts ${verb}. New total: ${res.newTotal} pts`,
        });
        router.refresh();
        setTimeout(closeForm, 2000);
      } else {
        setFeedback({ type: "error", message: res.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Points hero */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Coins className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-3xl font-bold text-foreground leading-none tabular-nums">
            {currentPoints.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">loyalty points</p>
        </div>
      </div>

      {/* Action buttons */}
      {mode === "idle" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => setMode("add")}
          >
            <Plus className="size-3.5" />
            Add Points
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => setMode("redeem")}
            disabled={currentPoints === 0}
          >
            <Minus className="size-3.5" />
            Redeem Points
          </Button>
        </div>
      )}

      {/* Inline form */}
      {(mode === "add" || mode === "redeem") && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {mode === "add" ? "Add Points" : "Redeem Points"}
            </p>
            <button
              onClick={closeForm}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <Input
            type="number"
            min={1}
            placeholder="Points amount"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <Input
            type="text"
            placeholder={
              mode === "add" ? "Reason (e.g. visit bonus)" : "Reason (e.g. discount applied)"
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          {feedback && (
            <p
              className={`text-xs ${
                feedback.type === "success" ? "text-primary" : "text-destructive"
              }`}
            >
              {feedback.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isPending || !points}
              onClick={handleSubmit}
              variant={mode === "redeem" ? "destructive" : "default"}
              className="flex-1 gap-1.5"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              {isPending
                ? "Processing…"
                : mode === "add"
                ? "Add Points"
                : "Redeem Points"}
            </Button>
            <Button size="sm" variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
