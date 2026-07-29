"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSalonSettings } from "@/app/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Clock, Copy } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type BusinessHourEntry = {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DEFAULT_HOURS: BusinessHourEntry[] = DAYS.map((day) => ({
  day,
  isOpen: day !== "Sunday",
  openTime: "09:00",
  closeTime: "19:00",
}));

function parseBusinessHours(raw: string | null | undefined): BusinessHourEntry[] {
  if (!raw) return DEFAULT_HOURS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 7) return parsed as BusinessHourEntry[];
    return DEFAULT_HOURS;
  } catch {
    return DEFAULT_HOURS;
  }
}

interface BusinessHoursFormProps {
  businessHours: string | null | undefined;
}

export function BusinessHoursForm({ businessHours }: BusinessHoursFormProps) {
  const router = useRouter();
  const [hours, setHours] = useState<BusinessHourEntry[]>(() =>
    parseBusinessHours(businessHours)
  );
  const [saving, setSaving] = useState(false);

  function toggle(index: number) {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, isOpen: !h.isOpen } : h))
    );
  }

  function setTime(index: number, field: "openTime" | "closeTime", value: string) {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  }

  function copyMonFri() {
    const monday = hours[0];
    setHours((prev) =>
      prev.map((h, i) =>
        i >= 0 && i <= 4
          ? { ...h, isOpen: monday.isOpen, openTime: monday.openTime, closeTime: monday.closeTime }
          : h
      )
    );
    toast.success("Copied", "Mon–Fri hours updated to match Monday.");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateSalonSettings({
        businessHours: JSON.stringify(hours),
      });
      if (result.success) {
        toast.success("Hours saved", "Business hours updated successfully.");
        router.refresh();
      } else {
        toast.error("Failed to save", result.error);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Weekly Schedule
            </CardTitle>
            <button
              type="button"
              onClick={copyMonFri}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors hover:border-primary/40"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Mon–Fri
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {hours.map((entry, index) => (
              <div
                key={entry.day}
                className="flex items-center gap-4 py-3 border-b border-border last:border-0"
              >
                {/* Open/Closed toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={entry.isOpen}
                  onClick={() => toggle(index)}
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

                {/* Time inputs or Closed */}
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

      <div className="flex items-center gap-4 pb-8">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground px-6 py-3 h-auto rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {saving ? "Saving..." : "Save Hours"}
        </Button>
      </div>
    </div>
  );
}
