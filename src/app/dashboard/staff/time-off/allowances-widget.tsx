"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTimeOffAllowances } from "@/app/actions/timeoff";

interface StaffRow {
  id: string;
  name: string;
}

interface Props {
  staff: StaffRow[];
  allowances: Record<string, { allowedDays: number; usedDays: number }>;
  usedDaysMap: Record<string, number>;
}

export function AllowancesWidget({ staff, allowances, usedDaysMap }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const DEFAULT_ALLOWED = 15;

  function startEdit() {
    const vals: Record<string, string> = {};
    for (const s of staff) {
      vals[s.id] = String(allowances[s.id]?.allowedDays ?? DEFAULT_ALLOWED);
    }
    setEditValues(vals);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditValues({});
  }

  function saveEdit() {
    const numeric: Record<string, number> = {};
    for (const [staffId, val] of Object.entries(editValues)) {
      const n = parseInt(val, 10);
      if (isNaN(n) || n < 0) {
        toast.error("Allowances must be non-negative numbers");
        return;
      }
      numeric[staffId] = n;
    }

    startTransition(async () => {
      const result = await updateTimeOffAllowances(numeric);
      if (!result.success) {
        toast.error(result.error ?? "Failed to update allowances");
        return;
      }
      toast.success("Allowances updated");
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Annual leave allowances ({new Date().getFullYear()})
        </p>
        {!editing ? (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={startEdit}>
            <Pencil className="w-3 h-3 mr-1" />
            Set
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-green-600 hover:text-green-700"
              onClick={saveEdit}
              disabled={isPending}
            >
              <Check className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={cancelEdit}
              disabled={isPending}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {staff.map((s) => {
          const allowed = allowances[s.id]?.allowedDays ?? DEFAULT_ALLOWED;
          const used = usedDaysMap[s.id] ?? 0;
          const pct = allowed > 0 ? Math.min(100, Math.round((used / allowed) * 100)) : 0;
          const remaining = Math.max(0, allowed - used);
          const isOver = used > allowed;

          return (
            <div key={s.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                  {s.name}
                </span>
                {editing ? (
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    className="h-6 w-16 text-xs px-2 text-right"
                    value={editValues[s.id] ?? String(allowed)}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, [s.id]: e.target.value }))
                    }
                  />
                ) : (
                  <span
                    className={`text-xs font-semibold ${
                      isOver ? "text-red-500" : "text-muted-foreground"
                    }`}
                  >
                    {used}/{allowed}d
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isOver
                      ? "bg-red-500"
                      : pct >= 80
                      ? "bg-amber-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {!editing && (
                <p className="text-[10px] text-muted-foreground">
                  {remaining} day{remaining !== 1 ? "s" : ""} remaining
                </p>
              )}
            </div>
          );
        })}
      </div>

      {staff.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No staff found</p>
      )}
    </div>
  );
}
