"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveServiceBookingSettings, type ServiceBookingSetting } from "@/app/actions/settings";

interface Service {
  id: string;
  name: string;
  price: number;
  durationMins: number;
}

interface Props {
  services: Service[];
  initialSettings: Record<string, ServiceBookingSetting>;
}

export function ServiceBookingSettingsClient({ services, initialSettings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<Record<string, ServiceBookingSetting>>(initialSettings);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function updateSetting(serviceId: string, key: keyof ServiceBookingSetting, value: ServiceBookingSetting[typeof key]) {
    setSettings((prev) => ({
      ...prev,
      [serviceId]: {
        ...(prev[serviceId] ?? { onlineBookingEnabled: true }),
        [key]: value,
      },
    }));
    setSaved(false);
  }

  function handleSave() {
    setError("");
    startTransition(async () => {
      const result = await saveServiceBookingSettings(settings);
      if (result.success) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to save settings.");
      }
    });
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No active services found. Add services to configure per-service booking settings.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {services.map((service) => {
        const s = settings[service.id] ?? { onlineBookingEnabled: true };
        return (
          <Card key={service.id} className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                {service.name}
                <span className="text-xs font-normal text-muted-foreground">
                  {service.durationMins} min
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.onlineBookingEnabled}
                  onClick={() => updateSetting(service.id, "onlineBookingEnabled", !s.onlineBookingEnabled)}
                  className={[
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    s.onlineBookingEnabled ? "bg-primary" : "bg-input",
                  ].join(" ")}
                >
                  <span className={["pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform", s.onlineBookingEnabled ? "translate-x-4" : "translate-x-0"].join(" ")} />
                </button>
                <Label className="text-sm cursor-pointer" onClick={() => updateSetting(service.id, "onlineBookingEnabled", !s.onlineBookingEnabled)}>
                  Online booking {s.onlineBookingEnabled ? "enabled" : "disabled"}
                </Label>
              </div>

              {s.onlineBookingEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max advance (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 60"
                      value={s.maxAdvanceDays ?? ""}
                      onChange={(e) => updateSetting(service.id, "maxAdvanceDays", e.target.value ? parseInt(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Gap between bookings (days)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 0"
                      value={s.requiredGapDays ?? ""}
                      onChange={(e) => updateSetting(service.id, "requiredGapDays", e.target.value ? parseInt(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Booking note</Label>
                    <Input
                      type="text"
                      placeholder="Shown at booking"
                      value={s.bookingNote ?? ""}
                      onChange={(e) => updateSetting(service.id, "bookingNote", e.target.value || undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending} className="gap-1.5">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </Button>
        {saved && <p className="text-xs text-primary">Settings saved!</p>}
      </div>
    </div>
  );
}
