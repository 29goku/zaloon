"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSection } from "@/components/settings/settings-section";
import { updateBookingRules } from "@/app/actions/settings";
import type { ExtendedBookingRules } from "@/app/actions/settings";
import { Clock, Globe, Ban, CreditCard, Users } from "lucide-react";

// ── Options ───────────────────────────────────────────────────────────────────

const MIN_NOTICE_OPTIONS = [
  { value: 0, label: "No minimum" },
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 4, label: "4 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
];

const MAX_ADVANCE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

const SLOT_INTERVAL_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 20, label: "20 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
];

const CANCEL_CUTOFF_OPTIONS = [
  { value: 0, label: "Any time" },
  { value: 2, label: "2 hours before" },
  { value: 4, label: "4 hours before" },
  { value: 12, label: "12 hours before" },
  { value: 24, label: "24 hours before" },
  { value: 48, label: "48 hours before" },
];

interface Props {
  initial: ExtendedBookingRules;
}

export function BookingSettingsForm({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rules, setRules] = useState<ExtendedBookingRules>(initial);

  function update<K extends keyof ExtendedBookingRules>(key: K, value: ExtendedBookingRules[K]) {
    setRules((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave(section: string) {
    startTransition(async () => {
      const result = await updateBookingRules(rules);
      if (!result.success) {
        toast.error(result.error ?? "Failed to save");
        return;
      }
      toast.success(`${section} saved`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ── Booking Window ── */}
      <SettingsSection
        title="Booking Window"
        description="Control how far in advance clients can book"
        action={
          <Button size="sm" onClick={() => handleSave("Booking window")} disabled={isPending}>
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Minimum booking notice
              </Label>
              <Select
                value={String(rules.minNoticeHours)}
                onValueChange={(v) => update("minNoticeHours", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MIN_NOTICE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Maximum advance booking</Label>
              <Select
                value={String(rules.maxAdvanceDays)}
                onValueChange={(v) => update("maxAdvanceDays", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAX_ADVANCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Slot interval</Label>
            <Select
              value={String(rules.slotIntervalMins)}
              onValueChange={(v) => update("slotIntervalMins", Number(v))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_INTERVAL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Time slots are offered in this increment on the booking page
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* ── Booking Behavior ── */}
      <SettingsSection
        title="Booking Behavior"
        description="Online booking options and client requirements"
        action={
          <Button size="sm" onClick={() => handleSave("Booking behavior")} disabled={isPending}>
            Save
          </Button>
        }
      >
        <div className="space-y-3">
          {/* Allow online booking */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-muted-foreground" />
                Allow online booking
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Master toggle for all online bookings</p>
            </div>
            <Switch
              checked={rules.allowOnlineBooking}
              onCheckedChange={(v) => update("allowOnlineBooking", v)}
            />
          </div>

          {/* Require phone */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Require phone number</p>
              <p className="text-xs text-muted-foreground mt-0.5">Clients must provide a phone number to book</p>
            </div>
            <Switch
              checked={rules.requirePhone}
              onCheckedChange={(v) => update("requirePhone", v)}
            />
          </div>

          {/* Require email */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Require email address</p>
              <p className="text-xs text-muted-foreground mt-0.5">Clients must provide an email to book</p>
            </div>
            <Switch
              checked={rules.requireEmail}
              onCheckedChange={(v) => update("requireEmail", v)}
            />
          </div>

          {/* Auto confirm */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-confirm bookings</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When off, bookings require manual approval before being confirmed
              </p>
            </div>
            <Switch
              checked={rules.autoConfirm}
              onCheckedChange={(v) => update("autoConfirm", v)}
            />
          </div>

          {/* Max per slot */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-muted-foreground" />
                Max bookings per time slot
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                How many clients can book the same slot
              </p>
            </div>
            <Select
              value={String(rules.maxPerSlot)}
              onValueChange={(v) => update("maxPerSlot", Number(v))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsSection>

      {/* ── Cancellation Policy ── */}
      <SettingsSection
        title="Cancellation Policy"
        description="Rules for online cancellations and fees"
        action={
          <Button size="sm" onClick={() => handleSave("Cancellation policy")} disabled={isPending}>
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Allow online cancellations */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-muted-foreground" />
                Allow online cancellations
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clients can cancel their own appointments via the portal
              </p>
            </div>
            <Switch
              checked={rules.allowOnlineCancellations}
              onCheckedChange={(v) => update("allowOnlineCancellations", v)}
            />
          </div>

          {rules.allowOnlineCancellations && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm">Cancellation cutoff</Label>
                <Select
                  value={String(rules.cancellationCutoffHours)}
                  onValueChange={(v) => update("cancellationCutoffHours", Number(v))}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCEL_CUTOFF_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Clients cannot cancel after this window before the appointment
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Cancellation fee</Label>
                  <Select
                    value={rules.cancellationFeeType}
                    onValueChange={(v) => update("cancellationFeeType", v as ExtendedBookingRules["cancellationFeeType"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                      <SelectItem value="percentage">% of service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {rules.cancellationFeeType !== "none" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cancFeeAmount" className="text-sm">
                      {rules.cancellationFeeType === "fixed" ? "Fee amount" : "Percentage (%)"}
                    </Label>
                    <Input
                      id="cancFeeAmount"
                      type="number"
                      min={0}
                      step={rules.cancellationFeeType === "percentage" ? 1 : 0.01}
                      value={rules.cancellationFeeAmount}
                      onChange={(e) => update("cancellationFeeAmount", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cancMessage" className="text-sm">Late cancellation message</Label>
            <Textarea
              id="cancMessage"
              value={rules.lateCancellationMessage}
              onChange={(e) => update("lateCancellationMessage", e.target.value)}
              placeholder="Cancellations within 24 hours may incur a fee. Please contact us to discuss."
              rows={3}
            />
          </div>
        </div>
      </SettingsSection>

      {/* ── Deposit Settings ── */}
      <SettingsSection
        title="Deposit Settings"
        description="Require a deposit at the time of booking"
        action={
          <Button size="sm" onClick={() => handleSave("Deposit settings")} disabled={isPending}>
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                Require deposit
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clients must pay a deposit when booking online
              </p>
            </div>
            <Switch
              checked={rules.requireDeposit}
              onCheckedChange={(v) => update("requireDeposit", v)}
            />
          </div>

          {rules.requireDeposit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Deposit type</Label>
                <Select
                  value={rules.depositType}
                  onValueChange={(v) => update("depositType", v as "fixed" | "percentage")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="depositAmt" className="text-sm">
                  {rules.depositType === "fixed" ? "Amount" : "Percentage (%)"}
                </Label>
                <Input
                  id="depositAmt"
                  type="number"
                  min={0}
                  step={rules.depositType === "percentage" ? 1 : 0.01}
                  value={rules.depositAmount}
                  onChange={(e) => update("depositAmount", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
