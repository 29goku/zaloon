"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBusinessHours } from "@/app/actions/settings";
import type { BusinessHoursConfig, BusinessHourEntry, SpecialHoursEntry } from "@/app/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { Clock, Copy, Plus, Trash2, CalendarOff } from "lucide-react";

// ── Props ──────────────────────────────────────────────────────────────────────

interface BusinessHoursEnhancedFormProps {
  initial: BusinessHoursConfig;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULT_WEEKLY_HOURS: BusinessHourEntry[] = DAYS.map((day) => ({
  day,
  isOpen: day !== "Sunday",
  openTime: "09:00",
  closeTime: "19:00",
}));

function ensureAllDays(hours: BusinessHourEntry[]): BusinessHourEntry[] {
  return DAYS.map((day) => {
    const found = hours.find((h) => h.day === day);
    return found ?? { day, isOpen: day !== "Sunday", openTime: "09:00", closeTime: "19:00" };
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BusinessHoursEnhancedForm({ initial }: BusinessHoursEnhancedFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [weeklyHours, setWeeklyHours] = useState<BusinessHourEntry[]>(
    () => ensureAllDays(initial.weeklyHours.length === 7 ? initial.weeklyHours : DEFAULT_WEEKLY_HOURS)
  );
  const [specialHours, setSpecialHours] = useState<SpecialHoursEntry[]>(
    initial.specialHours ?? []
  );

  // ── Weekly helpers ──────────────────────────────────────────────────────────

  function toggleDay(index: number) {
    setWeeklyHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, isOpen: !h.isOpen } : h))
    );
  }

  function setTime(index: number, field: "openTime" | "closeTime", value: string) {
    setWeeklyHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  }

  function copyWeekdayHours() {
    const monday = weeklyHours[0];
    setWeeklyHours((prev) =>
      prev.map((h, i) =>
        i >= 0 && i <= 4
          ? { ...h, isOpen: monday.isOpen, openTime: monday.openTime, closeTime: monday.closeTime }
          : h
      )
    );
    toast.success("Copied", "Mon–Fri hours updated to match Monday.");
  }

  // ── Special hours helpers ───────────────────────────────────────────────────

  function addSpecialDay() {
    setSpecialHours((prev) => [
      ...prev,
      { date: "", description: "", closed: true, openTime: "09:00", closeTime: "17:00" },
    ]);
  }

  function removeSpecialDay(index: number) {
    setSpecialHours((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSpecial<K extends keyof SpecialHoursEntry>(
    index: number,
    key: K,
    value: SpecialHoursEntry[K]
  ) {
    setSpecialHours((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: value } : s))
    );
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  function handleSave() {
    startTransition(async () => {
      const result = await saveBusinessHours({ weeklyHours, specialHours });
      if (result.success) {
        toast.success("Hours saved", "Business hours updated successfully.");
        router.refresh();
      } else {
        toast.error("Failed to save", result.error);
      }
    });
  }

  return (
    <div className="space-y-6">

      {/* ── Weekly Schedule ──────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Weekly Schedule
            </CardTitle>
            <button
              type="button"
              onClick={copyWeekdayHours}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors hover:border-primary/40"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Mon–Fri hours
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {weeklyHours.map((entry, index) => (
              <div
                key={entry.day}
                className="flex items-center gap-4 py-3 border-b border-border last:border-0"
              >
                {/* Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={entry.isOpen}
                  onClick={() => toggleDay(index)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    entry.isOpen ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${
                      entry.isOpen ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>

                {/* Day name */}
                <span className="text-sm font-medium w-24 shrink-0 text-foreground">
                  {entry.day}
                </span>

                {/* Times or Closed */}
                {entry.isOpen ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={entry.openTime}
                      onChange={(e) => setTime(index, "openTime", e.target.value)}
                      className="bg-secondary rounded-lg px-3 py-1.5 text-sm text-foreground border-none focus:outline-none focus:ring-2 focus:ring-primary w-28"
                    />
                    <span className="text-muted-foreground/50 text-sm">—</span>
                    <input
                      type="time"
                      value={entry.closeTime}
                      onChange={(e) => setTime(index, "closeTime", e.target.value)}
                      className="bg-secondary rounded-lg px-3 py-1.5 text-sm text-foreground border-none focus:outline-none focus:ring-2 focus:ring-primary w-28"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground/50 italic flex-1">Closed</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Special Hours Overrides ──────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-primary" />
              Special Hours &amp; Holidays
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSpecialDay}
              className="h-8 gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add date
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {specialHours.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No special dates added. Use these to mark holidays or modified hours.
            </p>
          ) : (
            <div className="space-y-4">
              {specialHours.map((entry, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3"
                >
                  {/* Date + Description */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Date
                      </Label>
                      <Input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateSpecial(index, "date", e.target.value)}
                        className="bg-secondary border-border text-sm h-9"
                      />
                    </div>
                    <div className="flex-[2] space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Description
                      </Label>
                      <Input
                        value={entry.description}
                        onChange={(e) => updateSpecial(index, "description", e.target.value)}
                        placeholder="e.g. Christmas Day, Staff Training"
                        className="bg-secondary border-border text-sm h-9"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSpecialDay(index)}
                      className="mt-6 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Closed toggle */}
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={entry.closed}
                      onCheckedChange={(v) => updateSpecial(index, "closed", v)}
                    />
                    <span className="text-sm text-foreground">
                      {entry.closed ? "Closed all day" : "Modified hours"}
                    </span>
                  </div>

                  {/* Modified hours */}
                  {!entry.closed && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Open</Label>
                        <input
                          type="time"
                          value={entry.openTime ?? "09:00"}
                          onChange={(e) => updateSpecial(index, "openTime", e.target.value)}
                          className="bg-secondary rounded-lg px-3 py-1.5 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary w-28"
                        />
                      </div>
                      <span className="text-muted-foreground/50 text-sm mt-5">—</span>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Close</Label>
                        <input
                          type="time"
                          value={entry.closeTime ?? "17:00"}
                          onChange={(e) => updateSpecial(index, "closeTime", e.target.value)}
                          className="bg-secondary rounded-lg px-3 py-1.5 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary w-28"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Save ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end pb-8">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-primary text-primary-foreground px-6 py-3 h-auto rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {isPending ? "Saving..." : "Save Hours"}
        </Button>
      </div>
    </div>
  );
}
