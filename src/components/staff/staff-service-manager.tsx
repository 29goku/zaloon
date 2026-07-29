"use client";

import { useState, useTransition } from "react";
import { Plus, Minus, Loader2, Clock, DollarSign } from "lucide-react";
import { addStaffService, removeStaffService } from "@/app/actions/staff";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  categoryName: string;
}

interface StaffServiceManagerProps {
  staffId: string;
  allServices: ServiceItem[];
  assignedServiceIds: string[];
  currency: string;
}

export function StaffServiceManager({
  staffId,
  allServices,
  assignedServiceIds,
  currency,
}: StaffServiceManagerProps) {
  const [assigned, setAssigned] = useState<Set<string>>(
    () => new Set(assignedServiceIds)
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  function toggle(serviceId: string, currentlyAssigned: boolean) {
    setPendingId(serviceId);
    startTransition(async () => {
      const result = currentlyAssigned
        ? await removeStaffService(staffId, serviceId)
        : await addStaffService(staffId, serviceId);

      if (!result.success) {
        toast.error(result.error);
      } else {
        setAssigned((prev) => {
          const next = new Set(prev);
          if (currentlyAssigned) {
            next.delete(serviceId);
          } else {
            next.add(serviceId);
          }
          return next;
        });
      }
      setPendingId(null);
    });
  }

  // Group by category
  const grouped: Record<string, ServiceItem[]> = {};
  for (const svc of allServices) {
    if (!grouped[svc.categoryName]) grouped[svc.categoryName] = [];
    grouped[svc.categoryName].push(svc);
  }

  const assignedCount = assigned.size;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="text-xs">
          {assignedCount} assigned
        </Badge>
        <span className="text-xs text-muted-foreground">
          Toggle to add or remove services for this staff member
        </span>
      </div>

      {Object.entries(grouped).map(([category, services]) => (
        <div key={category}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {category}
          </p>
          <div className="space-y-2">
            {services.map((svc) => {
              const isAssigned = assigned.has(svc.id);
              const isPending = pendingId === svc.id;

              return (
                <div
                  key={svc.id}
                  className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                    isAssigned
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-secondary/20"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{svc.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {svc.durationMins}m
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        {fmt(svc.price)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggle(svc.id, isAssigned)}
                    disabled={isPending}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isAssigned
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "bg-primary/15 text-primary hover:bg-primary/25"
                    }`}
                    aria-label={isAssigned ? `Remove ${svc.name}` : `Add ${svc.name}`}
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isAssigned ? (
                      <Minus className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    {isAssigned ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {allServices.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No services found in this salon
        </p>
      )}
    </div>
  );
}
