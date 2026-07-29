"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, CheckCircle2, X } from "lucide-react";
import { updateStaff } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StaffEditPanelProps {
  staffId: string;
  initialName: string;
  initialPhone: string | null;
  initialCommissionPct: number;
}

export function StaffEditPanel({
  staffId,
  initialName,
  initialPhone,
  initialCommissionPct,
}: StaffEditPanelProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [commission, setCommission] = useState(String(initialCommissionPct));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpen() {
    // Reset to current values each time panel opens
    setName(initialName);
    setPhone(initialPhone ?? "");
    setCommission(String(initialCommissionPct));
    setError(null);
    setSaved(false);
    setOpen(true);
  }

  function handleCancel() {
    setOpen(false);
    setError(null);
    setSaved(false);
  }

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }
    const commissionNum = parseFloat(commission);
    if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      setError("Commission must be between 0 and 100");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateStaff(staffId, {
        name: trimmedName,
        phone: phone.trim() || null,
        commissionPct: commissionNum,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      // Refresh server data after a brief moment
      setTimeout(() => {
        router.refresh();
        setOpen(false);
        setSaved(false);
      }, 800);
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Pencil className="w-3.5 h-3.5" />
        Edit
      </Button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4 space-y-3 w-full max-w-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-foreground">Edit Staff</p>
        <button
          type="button"
          onClick={handleCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close edit panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-staff-name">Name</Label>
        <Input
          id="edit-staff-name"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          disabled={isPending}
          placeholder="Staff name"
          aria-invalid={!!error && !name.trim()}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-staff-phone">Phone</Label>
        <Input
          id="edit-staff-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isPending}
          placeholder="+1 555 000 0000"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-staff-commission">Commission %</Label>
        <Input
          id="edit-staff-commission"
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={commission}
          onChange={(e) => { setCommission(e.target.value); setError(null); }}
          disabled={isPending}
          placeholder="e.g. 30"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={isPending} className="min-w-[80px]">
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel} disabled={isPending}>
          Cancel
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
