"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Save, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { updateClientPreferences } from "@/app/actions/clients";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtendedClientPreferences {
  preferredStaff?: string;
  allergies?: string[];
  colorPreferences?: string;
  styleNotes?: string;
  skinType?: string;
  notificationPrefs?: {
    sms: boolean;
    email: boolean;
    birthday: boolean;
  };
  internalNotes?: string;
}

export interface StaffOption {
  id: string;
  name: string;
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked
            ? "bg-primary border-primary"
            : "bg-muted border-border"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </label>
  );
}

// ─── Allergies Tag Input ──────────────────────────────────────────────────────

function AllergiesInput({
  allergies,
  onChange,
}: {
  allergies: string[];
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (!trimmed || allergies.includes(trimmed)) return;
    onChange([...allergies, trimmed]);
    setInput("");
  }

  function remove(item: string) {
    onChange(allergies.filter((a) => a !== item));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {allergies.map((a) => (
          <span
            key={a}
            className="inline-flex items-center gap-1 rounded-full bg-[#F41666]/10 border border-[#F41666]/30 px-2.5 py-0.5 text-xs font-medium text-[#F41666]"
          >
            {a}
            <button
              type="button"
              onClick={() => remove(a)}
              aria-label={`Remove allergy ${a}`}
              className="hover:opacity-70 transition-opacity"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {allergies.length === 0 && (
          <span className="text-xs text-muted-foreground self-center">
            None recorded
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(); }
          }}
          placeholder="e.g. PPD, latex, ammonia… (Enter to add)"
          className="flex-1 text-sm h-8"
        />
        <Button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          variant="outline"
          size="sm"
          className="h-8 gap-1"
        >
          <Plus className="size-3" />
          Add
        </Button>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface ClientPreferencesPanelProps {
  clientId: string;
  initialPreferences: ExtendedClientPreferences;
  /** Pass staff list from server — avoids a client-side fetch */
  staffOptions?: StaffOption[];
}

export function ClientPreferencesPanel({
  clientId,
  initialPreferences,
  staffOptions = [],
}: ClientPreferencesPanelProps) {
  const defaultNotifPrefs = { sms: true, email: false, birthday: true };

  const [prefs, setPrefs] = useState<ExtendedClientPreferences>({
    ...initialPreferences,
    allergies: initialPreferences.allergies ?? [],
    notificationPrefs:
      initialPreferences.notificationPrefs ?? defaultNotifPrefs,
  });

  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Reset saved state when prefs change
  useEffect(() => { setSaved(false); }, [prefs]);

  function set<K extends keyof ExtendedClientPreferences>(
    key: K,
    value: ExtendedClientPreferences[K]
  ) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  function setNotif(key: keyof NonNullable<ExtendedClientPreferences["notificationPrefs"]>, value: boolean) {
    setPrefs((p) => ({
      ...p,
      notificationPrefs: { ...(p.notificationPrefs ?? defaultNotifPrefs), [key]: value },
    }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateClientPreferences(
        clientId,
        prefs as Record<string, unknown>
      );
      if (res.success) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  }

  const notif = prefs.notificationPrefs ?? defaultNotifPrefs;

  return (
    <div className="space-y-6">
      {/* Preferred Staff */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Preferred Staff
        </label>
        {staffOptions.length > 0 ? (
          <select
            value={prefs.preferredStaff ?? ""}
            onChange={(e) => set("preferredStaff", e.target.value || undefined)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">No preference</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-muted-foreground">No staff members found.</p>
        )}
      </div>

      {/* Allergies */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Allergies / Sensitivities
        </label>
        <AllergiesInput
          allergies={prefs.allergies ?? []}
          onChange={(next) => set("allergies", next)}
        />
      </div>

      {/* Skin Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Skin Type
        </label>
        <div className="flex flex-wrap gap-2">
          {(["Normal", "Dry", "Oily", "Combination", "Sensitive"] as const).map(
            (type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  set("skinType", prefs.skinType === type ? undefined : type)
                }
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  prefs.skinType === type
                    ? "bg-primary/15 border-primary/50 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {type}
              </button>
            )
          )}
        </div>
      </div>

      {/* Color Preferences */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Color Preferences
        </label>
        <Textarea
          value={prefs.colorPreferences ?? ""}
          onChange={(e) => set("colorPreferences", e.target.value || undefined)}
          placeholder="Hair color notes, brand preferences, previous treatments…"
          className="min-h-[72px] resize-y text-sm"
        />
      </div>

      {/* Style Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Style Notes
        </label>
        <Textarea
          value={prefs.styleNotes ?? ""}
          onChange={(e) => set("styleNotes", e.target.value || undefined)}
          placeholder="General style preferences, length, finish…"
          className="min-h-[72px] resize-y text-sm"
        />
      </div>

      {/* Notification Preferences */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Notification Preferences
        </label>
        <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3 space-y-3">
          <ToggleSwitch
            checked={notif.sms}
            onChange={(v) => setNotif("sms", v)}
            label="SMS reminders"
          />
          <ToggleSwitch
            checked={notif.email}
            onChange={(v) => setNotif("email", v)}
            label="Email reminders"
          />
          <ToggleSwitch
            checked={notif.birthday}
            onChange={(v) => setNotif("birthday", v)}
            label="Birthday messages"
          />
        </div>
      </div>

      {/* Internal Notes (staff-only, yellow bg) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          Internal Notes
          <span className="rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] px-1.5 py-0.5 font-medium">
            Staff only
          </span>
        </label>
        <Textarea
          value={prefs.internalNotes ?? ""}
          onChange={(e) => set("internalNotes", e.target.value || undefined)}
          placeholder="Private notes visible to staff only…"
          className="min-h-[80px] resize-y text-sm bg-yellow-500/5 border-yellow-500/30 focus-visible:ring-yellow-500/40"
        />
      </div>

      {error && (
        <p className="text-xs text-[#F41666]">{error}</p>
      )}

      <Button
        onClick={handleSave}
        disabled={isPending}
        size="sm"
        variant={saved ? "outline" : "default"}
        className="gap-1.5"
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : saved ? (
          <Check className="size-3.5 text-primary" />
        ) : (
          <Save className="size-3.5" />
        )}
        {isPending ? "Saving…" : saved ? "Saved" : "Save Preferences"}
      </Button>
    </div>
  );
}
