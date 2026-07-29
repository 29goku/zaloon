"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Save } from "lucide-react";
import { updateStaff } from "@/app/actions/staff";
import { bulkSetServiceCommissionOverrides } from "@/app/actions/payroll";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ServiceWithOverride {
  serviceId: string;
  serviceName: string;
  categoryName: string;
  price: number;
  overridePct: number | null; // null = use staff default
}

interface CommissionSettingsPanelProps {
  staffId: string;
  defaultCommissionPct: number;
  services: ServiceWithOverride[];
}

export function CommissionSettingsPanel({
  staffId,
  defaultCommissionPct,
  services,
}: CommissionSettingsPanelProps) {
  const [defaultPct, setDefaultPct] = useState(String(defaultCommissionPct));
  const [overrides, setOverrides] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const svc of services) {
      m.set(
        svc.serviceId,
        svc.overridePct !== null ? String(svc.overridePct) : ""
      );
    }
    return m;
  });

  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function copyToAll() {
    const num = parseFloat(defaultPct);
    if (isNaN(num) || num < 0 || num > 100) {
      toast.error("Set a valid default rate first (0–100)");
      return;
    }
    const next = new Map<string, string>();
    for (const svc of services) {
      next.set(svc.serviceId, String(num));
    }
    setOverrides(next);
    toast.success(`Set ${num}% for all ${services.length} services`);
  }

  function setOverride(serviceId: string, value: string) {
    setOverrides((prev) => new Map(prev).set(serviceId, value));
  }

  function handleSave() {
    const defaultNum = parseFloat(defaultPct);
    if (isNaN(defaultNum) || defaultNum < 0 || defaultNum > 100) {
      toast.error("Default commission must be between 0 and 100");
      return;
    }

    const overrideList: { serviceId: string; overridePct: number | null }[] =
      [];
    for (const [serviceId, raw] of overrides.entries()) {
      if (raw.trim() === "") {
        overrideList.push({ serviceId, overridePct: null });
      } else {
        const num = parseFloat(raw);
        if (isNaN(num) || num < 0 || num > 100) {
          toast.error(`Override for a service must be between 0 and 100`);
          return;
        }
        overrideList.push({ serviceId, overridePct: num });
      }
    }

    startTransition(async () => {
      const [defaultResult, overrideResult] = await Promise.all([
        updateStaff(staffId, { commissionPct: defaultNum }),
        overrideList.length > 0
          ? bulkSetServiceCommissionOverrides(staffId, overrideList)
          : Promise.resolve({ success: true as const }),
      ]);

      if (!defaultResult.success) {
        toast.error(defaultResult.error);
        return;
      }
      if (!overrideResult.success) {
        toast.error(overrideResult.error);
        return;
      }

      setSaved(true);
      toast.success("Commission settings saved");
      setTimeout(() => {
        router.refresh();
        setSaved(false);
      }, 1200);
    });
  }

  // Group services by category
  const grouped = new Map<string, ServiceWithOverride[]>();
  for (const svc of services) {
    const cat = svc.categoryName;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(svc);
  }

  return (
    <div className="space-y-6">
      {/* Default commission */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Default Commission Rate</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Applied to all services unless a per-service override is set.
          </p>
        </div>
        <div className="flex items-center gap-3 max-w-xs">
          <div className="flex-1">
            <Label htmlFor="default-commission" className="sr-only">
              Default commission %
            </Label>
            <Input
              id="default-commission"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={defaultPct}
              onChange={(e) => setDefaultPct(e.target.value)}
              disabled={isPending}
              placeholder="e.g. 30"
              className="h-9"
            />
          </div>
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>

      {/* Per-service overrides */}
      {services.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Per-Service Commission Overrides
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leave blank to use the default rate. Enter a value to override
                for that specific service.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyToAll}
              disabled={isPending}
              className="flex-shrink-0 text-xs h-8"
            >
              Copy default to all
            </Button>
          </div>

          <div className="divide-y divide-border">
            {Array.from(grouped.entries()).map(([category, svcs]) => (
              <div key={category}>
                <p className="px-5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                  {category}
                </p>
                {svcs.map((svc) => {
                  const raw = overrides.get(svc.serviceId) ?? "";
                  return (
                    <div
                      key={svc.serviceId}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {svc.serviceName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${svc.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-20">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={raw}
                            onChange={(e) =>
                              setOverride(svc.serviceId, e.target.value)
                            }
                            disabled={isPending}
                            placeholder={`${defaultNum(defaultPct)}%`}
                            className="h-8 text-xs text-center"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-3">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {services.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No services assigned. Assign services to this staff member to set
          per-service overrides.
        </p>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={isPending}
          size="sm"
          className="min-w-[100px]"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save
            </>
          )}
        </Button>
        {saved && !isPending && (
          <span className="flex items-center gap-1.5 text-sm text-primary">
            <CheckCircle2 className="w-4 h-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

function defaultNum(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}
