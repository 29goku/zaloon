"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Check, Palette, Monitor, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Preset definitions
// ---------------------------------------------------------------------------

type Preset = {
  id: string;
  label: string;
  /** CSS color used for the --primary token in light mode */
  light: string;
  /** CSS color used for the --primary token in dark mode */
  dark: string;
  /** Foreground on the light primary swatch */
  lightFg: string;
  /** Foreground on the dark primary swatch */
  darkFg: string;
};

const PRESETS: Preset[] = [
  {
    id: "amber",
    label: "Amber",
    light: "#d97c10",
    dark: "#F48E16",
    lightFg: "#ffffff",
    darkFg: "#020502",
  },
  {
    id: "violet",
    label: "Violet",
    light: "#7c3aed",
    dark: "#a78bfa",
    lightFg: "#ffffff",
    darkFg: "#020502",
  },
  {
    id: "rose",
    label: "Rose",
    light: "#e11d48",
    dark: "#fb7185",
    lightFg: "#ffffff",
    darkFg: "#020502",
  },
  {
    id: "emerald",
    label: "Emerald",
    light: "#059669",
    dark: "#6ee7b7",
    lightFg: "#ffffff",
    darkFg: "#020502",
  },
  {
    id: "sky",
    label: "Sky",
    light: "#0284c7",
    dark: "#7dd3fc",
    lightFg: "#ffffff",
    darkFg: "#020502",
  },
  {
    id: "slate",
    label: "Slate",
    light: "#475569",
    dark: "#94a3b8",
    lightFg: "#ffffff",
    darkFg: "#020502",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyPreset(preset: Preset, isDark: boolean) {
  const color = isDark ? preset.dark : preset.light;
  document.documentElement.style.setProperty("--primary", color);
  localStorage.setItem(
    "zaloon:theme-preset",
    JSON.stringify({ light: preset.light, dark: preset.dark })
  );
}

function applyCustomColor(hex: string, isDark: boolean) {
  document.documentElement.style.setProperty("--primary", hex);
  localStorage.setItem(
    "zaloon:theme-preset",
    JSON.stringify({ light: hex, dark: hex })
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppearancePage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState("#3a8a2a");
  const [compact, setCompact] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Read persisted values after mount
  useEffect(() => {
    setMounted(true);

    const stored = localStorage.getItem("zaloon:theme-preset");
    if (stored) {
      try {
        const { light, dark } = JSON.parse(stored) as {
          light: string;
          dark: string;
        };
        const matched = PRESETS.find(
          (p) => p.light === light && p.dark === dark
        );
        if (matched) {
          setActivePresetId(matched.id);
        } else {
          // custom color
          setCustomColor(isDark ? dark : light);
        }
      } catch {
        // ignore
      }
    }

    const storedCompact = localStorage.getItem("zaloon:compact");
    setCompact(storedCompact === "true");
  }, [isDark]);

  const handlePresetSelect = useCallback(
    (preset: Preset) => {
      setActivePresetId(preset.id);
      applyPreset(preset, isDark);
    },
    [isDark]
  );

  const handleCustomColor = useCallback(
    (hex: string) => {
      setCustomColor(hex);
      setActivePresetId(null);
      applyCustomColor(hex, isDark);
    },
    [isDark]
  );

  const handleCompactToggle = useCallback((checked: boolean) => {
    setCompact(checked);
    if (checked) {
      document.documentElement.setAttribute("data-compact", "true");
      localStorage.setItem("zaloon:compact", "true");
    } else {
      document.documentElement.removeAttribute("data-compact");
      localStorage.setItem("zaloon:compact", "false");
    }
  }, []);

  // Derive the currently active color for preview
  const currentColor = (() => {
    if (activePresetId) {
      const p = PRESETS.find((p) => p.id === activePresetId)!;
      return isDark ? p.dark : p.light;
    }
    return customColor;
  })();

  if (!mounted) {
    return (
      <div className="p-4 md:p-8 max-w-2xl space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted rounded" />
        <div className="h-40 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Palette className="w-7 h-7 text-primary" />
          Appearance
        </h1>
        <p className="text-muted-foreground mt-1">
          Customise the look and feel of your Zaloon workspace.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Brand color presets                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Brand Colour
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sets the primary accent used across buttons, badges, and active
            states.
          </p>
        </div>

        {/* Preset grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            const swatch = isDark ? preset.dark : preset.light;
            const swatchFg = isDark ? preset.darkFg : preset.lightFg;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                aria-label={`Select ${preset.label} theme`}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                {/* Colour swatch */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                  style={{ background: swatch, color: swatchFg }}
                >
                  {isActive && <Check className="w-4 h-4" strokeWidth={2.5} />}
                </div>
                <span className="text-xs font-medium text-foreground">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom colour picker */}
        <div className="flex items-center gap-4 pt-1">
          <label
            htmlFor="custom-color"
            className="text-sm font-medium text-foreground whitespace-nowrap"
          >
            Custom colour
          </label>
          <div className="flex items-center gap-2">
            <input
              id="custom-color"
              type="color"
              value={customColor}
              onChange={(e) => handleCustomColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-card"
              title="Pick a custom primary colour"
            />
            <span className="text-sm font-mono text-muted-foreground">
              {customColor}
            </span>
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Preview
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors"
              style={{ background: currentColor }}
            >
              Book Appointment
            </button>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ background: currentColor }}
            >
              Confirmed
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: currentColor + "22",
                color: currentColor,
                border: `1px solid ${currentColor}44`,
              }}
            >
              VIP Client
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Compact mode                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Compact Mode
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reduces padding and spacing so more content fits on screen.
          </p>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Compact layout
              </p>
              <p className="text-xs text-muted-foreground">
                Tighter padding across cards and pages
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            role="switch"
            aria-checked={compact}
            onClick={() => handleCompactToggle(!compact)}
            className={cn(
              "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
              compact ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200",
                compact ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </label>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Theme mode reminder (points to toggle in sidebar)                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Colour Mode
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Switch between light, dark, or system-matched mode using the toggle
            at the bottom of the sidebar.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {resolvedTheme === "dark" ? (
            <Moon className="w-4 h-4 text-primary" />
          ) : (
            <Sun className="w-4 h-4 text-primary" />
          )}
          Currently using{" "}
          <span className="font-semibold text-foreground capitalize">
            {resolvedTheme}
          </span>{" "}
          mode.
        </div>
      </section>
    </div>
  );
}
