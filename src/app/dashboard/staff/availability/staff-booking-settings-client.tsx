"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StaffBookingSetting } from "@/app/actions/settings";
import { saveStaffBookingSettings } from "@/app/actions/settings";

interface StaffMember {
  id: string;
  name: string;
}

interface Props {
  staff: StaffMember[];
  initialSettings: Record<string, StaffBookingSetting>;
}

const DEFAULT_SETTING: StaffBookingSetting = {
  acceptsOnlineBookings: true,
};

export function StaffBookingSettingsClient({ staff, initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, StaffBookingSetting>>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  function getSetting(staffId: string): StaffBookingSetting {
    return settings[staffId] ?? DEFAULT_SETTING;
  }

  function update(staffId: string, patch: Partial<StaffBookingSetting>) {
    setSettings((prev) => ({
      ...prev,
      [staffId]: { ...getSetting(staffId), ...patch },
    }));
    setSaveSuccess(false);
  }

  function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);
    startTransition(async () => {
      const res = await saveStaffBookingSettings(settings);
      if (res.success) {
        setSaveSuccess(true);
        router.refresh();
      } else {
        setSaveError(res.error ?? "Failed to save");
      }
    });
  }

  if (staff.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No staff members found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
        <span>Staff Member</span>
        <span className="text-center">Online Bookings</span>
        <span className="text-center">Max Clients/Day</span>
        <span className="text-center">Advance Booking (days)</span>
      </div>

      {staff.map((member) => {
        const s = getSetting(member.id);
        return (
          <div
            key={member.id}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-colors"
          >
            {/* Name */}
            <div>
              <p className="text-sm font-semibold text-foreground">{member.name}</p>
            </div>

            {/* Online bookings toggle */}
            <div className="flex justify-center">
              <button
                type="button"
                role="switch"
                aria-checked={s.acceptsOnlineBookings}
                onClick={() => update(member.id, { acceptsOnlineBookings: !s.acceptsOnlineBookings })}
                className={[
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                  s.acceptsOnlineBookings ? "bg-primary" : "bg-input",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                    s.acceptsOnlineBookings ? "translate-x-6" : "translate-x-1",
                  ].join(" ")}
                />
              </button>
            </div>

            {/* Max clients per day */}
            <div className="flex justify-center">
              <input
                type="number"
                min={1}
                max={100}
                placeholder="—"
                value={s.maxClientsPerDay ?? ""}
                onChange={(e) => update(member.id, { maxClientsPerDay: e.target.value ? Number(e.target.value) : undefined })}
                className="w-20 h-9 px-3 text-center rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Advance booking days */}
            <div className="flex justify-center">
              <input
                type="number"
                min={1}
                max={365}
                placeholder="—"
                value={s.advanceBookingDays ?? ""}
                onChange={(e) => update(member.id, { advanceBookingDays: e.target.value ? Number(e.target.value) : undefined })}
                className="w-24 h-9 px-3 text-center rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        );
      })}

      {/* Save */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div>
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          {saveSuccess && <p className="text-sm text-green-700 dark:text-green-400">Settings saved.</p>}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
