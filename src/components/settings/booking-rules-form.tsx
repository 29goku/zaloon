"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveBookingRules } from "@/app/actions/settings";
import type { BookingRules } from "@/app/actions/settings";
import {
  Globe,
  Clock,
  Ban,
  CreditCard,
  Users,
  AlertTriangle,
} from "lucide-react";

interface Props {
  initial: BookingRules;
}

export function BookingRulesForm({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state mirrors BookingRules
  const [rules, setRules] = useState<BookingRules>(initial);

  function update<K extends keyof BookingRules>(key: K, value: BookingRules[K]) {
    setRules((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveBookingRules(rules);
      if (!result.success) {
        toast.error(result.error ?? "Failed to save");
        return;
      }
      toast.success("Booking rules saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Section 1: Online Booking Toggle ── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Online Booking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Allow online booking</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Master toggle — enables or disables all online bookings
              </p>
            </div>
            <Switch
              checked={rules.allowOnlineBooking}
              onCheckedChange={(v) => update("allowOnlineBooking", v)}
            />
          </div>
          {!rules.allowOnlineBooking && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Clients won&apos;t be able to book online. Appointments can only be created by staff.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Timing Rules ── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Timing Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Minimum advance notice */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Minimum advance notice</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                How far ahead clients must book
              </p>
            </div>
            <Select
              value={String(rules.minAdvanceHours)}
              onValueChange={(v) => update("minAdvanceHours", Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 4, 8, 12, 24, 48, 72].map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h === 0 ? "None" : `${h}h`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Maximum booking window */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Maximum booking window</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                How far ahead clients can book
              </p>
            </div>
            <Select
              value={String(rules.maxAdvanceDays)}
              onValueChange={(v) => update("maxAdvanceDays", Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { label: "7 days", value: 7 },
                  { label: "14 days", value: 14 },
                  { label: "30 days", value: 30 },
                  { label: "60 days", value: 60 },
                  { label: "90 days", value: 90 },
                  { label: "6 months", value: 180 },
                  { label: "1 year", value: 365 },
                ].map(({ label, value }) => (
                  <SelectItem key={value} value={String(value)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Allow same-day */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Allow same-day booking</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Let clients book for today
              </p>
            </div>
            <Switch
              checked={rules.allowSameDay}
              onCheckedChange={(v) => update("allowSameDay", v)}
            />
          </div>

          {/* Buffer between slots */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Buffer between slots</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gap between available booking slots
              </p>
            </div>
            <Select
              value={String(rules.bufferBetweenSlots)}
              onValueChange={(v) => update("bufferBetweenSlots", Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 5, 10, 15, 30].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m === 0 ? "None" : `${m} min`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max bookings per day */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Max bookings per day</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Limit total daily online bookings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={rules.maxBookingsPerDay !== null}
                onCheckedChange={(v) =>
                  update("maxBookingsPerDay", v ? 20 : null)
                }
              />
              {rules.maxBookingsPerDay !== null && (
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={rules.maxBookingsPerDay}
                  onChange={(e) =>
                    update("maxBookingsPerDay", parseInt(e.target.value) || 1)
                  }
                  className="w-20 h-8 text-sm"
                />
              )}
              {rules.maxBookingsPerDay === null && (
                <span className="text-xs text-muted-foreground w-20 text-center">Unlimited</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Cancellation ── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ban className="w-4 h-4 text-primary" />
            Cancellation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Cancellation notice required</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Minimum notice before cancelling
              </p>
            </div>
            <Select
              value={String(rules.cancellationHours)}
              onValueChange={(v) => update("cancellationHours", Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 4, 8, 12, 24, 48, 72].map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h === 0 ? "None" : `${h}h`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: Deposit ── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Deposit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Require deposit</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clients must pay a deposit to confirm
              </p>
            </div>
            <Switch
              checked={rules.requireDeposit}
              onCheckedChange={(v) => update("requireDeposit", v)}
            />
          </div>
          {rules.requireDeposit && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={rules.depositAmount}
                  onChange={(e) =>
                    update("depositAmount", parseFloat(e.target.value) || 0)
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-36 space-y-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={rules.depositType}
                  onValueChange={(v) =>
                    update("depositType", v as "fixed" | "percentage")
                  }
                >
                  <SelectTrigger className="h-8 text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed ($)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 5: Client Experience ── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Client Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Show staff selection</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Let clients choose which staff member to book
              </p>
            </div>
            <Switch
              checked={rules.showStaffSelection}
              onCheckedChange={(v) => update("showStaffSelection", v)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Allow guest booking</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clients can book without creating an account
              </p>
            </div>
            <Switch
              checked={rules.allowGuestBooking}
              onCheckedChange={(v) => update("allowGuestBooking", v)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Require staff confirmation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Staff must manually confirm each online booking
              </p>
            </div>
            <Switch
              checked={rules.confirmationRequired}
              onCheckedChange={(v) => update("confirmationRequired", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save booking rules"}
        </Button>
      </div>
    </div>
  );
}
