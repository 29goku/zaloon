"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { saveDepositPolicy, type DepositPolicy } from "@/app/actions/policies";
import { toast } from "@/components/ui/sonner";

interface DepositPolicyFormProps {
  initialPolicy: DepositPolicy;
}

export function DepositPolicyForm({ initialPolicy }: DepositPolicyFormProps) {
  const router = useRouter();
  const [policy, setPolicy] = React.useState<DepositPolicy>(initialPolicy);
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof DepositPolicy>(key: K, value: DepositPolicy[K]) {
    setPolicy((prev) => ({ ...prev, [key]: value }));
  }

  const previewText = React.useMemo(() => {
    if (!policy.enabled) return "Deposits are not currently required.";
    const who = policy.requireForAll
      ? "all bookings"
      : policy.requireForNew
      ? "new client bookings"
      : "applicable bookings";
    const amtStr =
      policy.depositType === "fixed"
        ? `$${policy.depositValue}`
        : `${policy.depositValue}% of service price`;
    const refundStr = policy.refundOnCancel
      ? " Deposits are refunded for timely cancellations."
      : " Deposits are non-refundable.";
    return `We require a ${amtStr} deposit to secure ${who}.${refundStr}`;
  }, [policy]);

  async function handleSave() {
    setSaving(true);
    const result = await saveDepositPolicy(policy);
    setSaving(false);
    if (result.success) {
      toast.success("Saved", "Deposit policy updated.");
      router.refresh();
    } else {
      toast.error("Error", result.error ?? "Failed to save");
    }
  }

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/30">
        <div>
          <p className="text-sm font-semibold">Require deposits</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Collect a deposit to secure bookings
          </p>
        </div>
        <Switch
          checked={policy.enabled}
          onCheckedChange={(v) => set("enabled", v)}
        />
      </div>

      <div
        className={
          policy.enabled ? "space-y-6" : "space-y-6 opacity-50 pointer-events-none select-none"
        }
      >
        {/* Require for */}
        <div className="space-y-2">
          <Label>Require deposit for</Label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                className="accent-primary"
                checked={!policy.requireForNew && !policy.requireForAll}
                onChange={() => {
                  set("requireForNew", false);
                  set("requireForAll", false);
                }}
              />
              <span className="text-sm">Manually per booking</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                className="accent-primary"
                checked={policy.requireForNew && !policy.requireForAll}
                onChange={() => {
                  set("requireForNew", true);
                  set("requireForAll", false);
                }}
              />
              <span className="text-sm">New clients only</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                className="accent-primary"
                checked={policy.requireForAll}
                onChange={() => {
                  set("requireForNew", false);
                  set("requireForAll", true);
                }}
              />
              <span className="text-sm">All bookings</span>
            </label>
          </div>
        </div>

        {/* Deposit amount */}
        <div className="space-y-3">
          <Label>Deposit amount</Label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set("depositType", "fixed")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                policy.depositType === "fixed"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Fixed ($)
            </button>
            <button
              type="button"
              onClick={() => set("depositType", "percent")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                policy.depositType === "percent"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              % of service
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              step={0.01}
              className="w-28"
              value={policy.depositValue}
              onChange={(e) =>
                set("depositValue", Math.max(0, parseFloat(e.target.value) || 0))
              }
            />
            <span className="text-sm text-muted-foreground">
              {policy.depositType === "fixed" ? "dollars" : "percent of service price"}
            </span>
          </div>
        </div>

        {/* Refund on timely cancel */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/20">
          <div>
            <p className="text-sm font-semibold">Refund on timely cancellation</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Return the deposit if client cancels within the notice period
            </p>
          </div>
          <Switch
            checked={policy.refundOnCancel}
            onCheckedChange={(v) => set("refundOnCancel", v)}
          />
        </div>

        {/* Policy text */}
        <div className="space-y-2">
          <Label>Policy text</Label>
          <Textarea
            rows={3}
            placeholder="Describe your deposit policy in plain language…"
            value={policy.policyText}
            onChange={(e) => set("policyText", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This text is shown on the online booking page
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Preview
        </p>
        <p className="text-sm text-foreground">{previewText}</p>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
          {saving ? "Saving…" : "Save Policy"}
        </Button>
      </div>
    </div>
  );
}
