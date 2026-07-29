"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, ChevronDown, ChevronUp, Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updatePlan } from "@/app/actions/memberships";

interface MembershipPlanCardProps {
  id: string;
  name: string;
  price: number;
  sessionsPerMonth: number;
  discountPct: number;
  description: string | null;
  activeMemberCount: number;
}

export function MembershipPlanCard({
  id,
  name,
  price,
  sessionsPerMonth,
  discountPct,
  description,
  activeMemberCount,
}: MembershipPlanCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editPrice, setEditPrice] = useState(price.toString());
  const [editSessions, setEditSessions] = useState(sessionsPerMonth.toString());
  const [editDiscount, setEditDiscount] = useState(discountPct.toString());
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const benefits = (description ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const res = await updatePlan(id, {
        name: editName.trim() || name,
        price: parseFloat(editPrice) || price,
        sessionsPerMonth: parseInt(editSessions, 10) || sessionsPerMonth,
        discountPct: parseFloat(editDiscount) || discountPct,
        description: editDescription,
      });
      if (res.success) {
        setFeedback({ type: "success", message: "Saved!" });
        router.refresh();
        setTimeout(() => {
          setFeedback(null);
          setEditing(false);
        }, 1500);
      } else {
        setFeedback({ type: "error", message: res.error });
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-foreground text-base leading-tight truncate">
              {name}
            </h3>
            <p className="text-2xl font-bold text-primary mt-1 leading-none">
              {price.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              })}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 rounded-xl bg-primary/10 px-2.5 py-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-bold text-primary tabular-nums">
              {activeMemberCount}
            </span>
          </div>
        </div>

        {/* Plan details */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {sessionsPerMonth} sessions/mo
          </span>
          {discountPct > 0 && (
            <span className="inline-flex items-center rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {discountPct}% discount
            </span>
          )}
        </div>

        {/* Benefits list */}
        {benefits.length > 0 ? (
          <ul className="space-y-1">
            {benefits.map((benefit, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                {benefit}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic">No benefits listed</p>
        )}
      </div>

      {/* Edit toggle */}
      <div className="border-t border-border">
        <button
          onClick={() => setEditing((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          Edit plan
          {editing ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {editing && (
          <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Plan name"
              className="text-sm h-8"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={0}
                step={1}
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="Price"
                className="text-sm h-8"
              />
              <Input
                type="number"
                min={1}
                step={1}
                value={editSessions}
                onChange={(e) => setEditSessions(e.target.value)}
                placeholder="Sessions/mo"
                className="text-sm h-8"
              />
            </div>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={editDiscount}
              onChange={(e) => setEditDiscount(e.target.value)}
              placeholder="Discount %"
              className="text-sm h-8"
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Benefits (one per line)"
              className="text-xs resize-none min-h-[72px]"
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

            <Button
              size="sm"
              className="w-full gap-1.5"
              disabled={isPending}
              onClick={handleSave}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : feedback?.type === "success" ? (
                <Check className="size-3.5" />
              ) : (
                <Save className="size-3.5" />
              )}
              {isPending ? "Saving…" : feedback?.type === "success" ? "Saved!" : "Save"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
