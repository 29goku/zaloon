"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { saveCancellationPolicy, type CancellationPolicy } from "@/app/actions/policies";
import { toast } from "@/components/ui/sonner";
import { AlertTriangle } from "lucide-react";

interface CancellationPolicyFormProps {
  initialPolicy: CancellationPolicy;
}

export function CancellationPolicyForm({ initialPolicy }: CancellationPolicyFormProps) {
  const router = useRouter();
  const [policy, setPolicy] = React.useState<CancellationPolicy>(initialPolicy);
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof CancellationPolicy>(key: K, value: CancellationPolicy[K]) {
    setPolicy((prev) => ({ ...prev, [key]: value }));
  }

  // Build preview text from current policy values
  const previewText = React.useMemo(() => {
    if (!policy.enabled) return "Cancellation policy is currently disabled.";
    const lateFeeStr =
      policy.lateFeeType === "fixed"
        ? `$${policy.lateFeeValue}`
        : `${policy.lateFeeValue}% of service`;
    const noShowStr =
      policy.noShowFeeEnabled
        ? policy.noShowFeeType === "fixed"
          ? ` No-shows are charged $${policy.noShowFeeValue}.`
          : ` No-shows are charged ${policy.noShowFeeValue}% of service.`
        : "";
    return `Cancellations within ${policy.noticePeriodHours} hours of appointment time are subject to a ${lateFeeStr} fee.${noShowStr}`;
  }, [policy]);

  async function handleSave() {
    setSaving(true);
    const result = await saveCancellationPolicy(policy);
    setSaving(false);
    if (result.success) {
      toast.success("Saved", "Cancellation policy updated.");
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
          <p className="text-sm font-semibold">Enable cancellation policy</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Apply fees when clients cancel late or don&apos;t show up
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
        {/* Notice period */}
        <div className="space-y-2">
          <Label>Notice period</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              step={1}
              className="w-28"
              value={policy.noticePeriodHours}
              onChange={(e) => set("noticePeriodHours", Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Cancellations made with less than this much notice will incur the late fee
          </p>
        </div>

        {/* Late cancellation fee */}
        <div className="space-y-3">
          <Label>Late cancellation fee</Label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set("lateFeeType", "fixed")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                policy.lateFeeType === "fixed"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Fixed ($)
            </button>
            <button
              type="button"
              onClick={() => set("lateFeeType", "percent")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                policy.lateFeeType === "percent"
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
              value={policy.lateFeeValue}
              onChange={(e) => set("lateFeeValue", Math.max(0, parseFloat(e.target.value) || 0))}
            />
            <span className="text-sm text-muted-foreground">
              {policy.lateFeeType === "fixed" ? "dollars" : "percent of service price"}
            </span>
          </div>
        </div>

        {/* No-show fee */}
        <div className="space-y-3 p-4 rounded-xl border border-border bg-secondary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">No-show fee</p>
              <p className="text-xs text-muted-foreground">
                Charge a fee when client doesn&apos;t show up
              </p>
            </div>
            <Switch
              checked={policy.noShowFeeEnabled}
              onCheckedChange={(v) => set("noShowFeeEnabled", v)}
            />
          </div>

          {policy.noShowFeeEnabled && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => set("noShowFeeType", "fixed")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    policy.noShowFeeType === "fixed"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Fixed ($)
                </button>
                <button
                  type="button"
                  onClick={() => set("noShowFeeType", "percent")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    policy.noShowFeeType === "percent"
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
                  value={policy.noShowFeeValue}
                  onChange={(e) => set("noShowFeeValue", Math.max(0, parseFloat(e.target.value) || 0))}
                />
                <span className="text-sm text-muted-foreground">
                  {policy.noShowFeeType === "fixed" ? "dollars" : "percent of service price"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Auto-charge toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/20">
            <div>
              <p className="text-sm font-semibold">Auto-charge fee</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically create an invoice when an appointment is cancelled late or marked no-show
              </p>
            </div>
            <Switch
              checked={policy.autoChargeFee}
              onCheckedChange={(v) => set("autoChargeFee", v)}
            />
          </div>
          {policy.autoChargeFee && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                This will automatically create an invoice when an appointment is marked no-show or cancelled late. Make sure you have payment information on file for clients.
              </span>
            </div>
          )}
        </div>

        {/* Policy text */}
        <div className="space-y-2">
          <Label>Policy text</Label>
          <Textarea
            rows={3}
            placeholder="Describe your cancellation policy in plain language…"
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
