"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Branch, BranchHours } from "@/app/actions/branches";
import { createBranch, updateBranch } from "@/app/actions/branches";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  avatar?: string | null;
}

interface BranchDialogProps {
  open: boolean;
  onClose: () => void;
  branch?: Branch | null;
  allStaff: StaffMember[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
] as const;

function defaultHours(): Record<string, BranchHours> {
  const result: Record<string, BranchHours> = {};
  for (const { key } of DAYS) {
    result[key] = { open: "09:00", close: "18:00", closed: key === "sunday" };
  }
  return result;
}

// Summarise hours like "Mon–Sat 9am–6pm"
export function summariseHours(hours: Record<string, BranchHours> | undefined): string {
  if (!hours) return "";
  const open = DAYS.filter(({ key }) => !hours[key]?.closed);
  if (open.length === 0) return "Closed all week";
  if (open.length === 1) {
    const h = hours[open[0].key];
    return `${open[0].label} ${fmt12(h.open)}–${fmt12(h.close)}`;
  }
  const first = open[0];
  const last = open[open.length - 1];
  const h = hours[first.key];
  return `${first.label}–${last.label} ${fmt12(h.open)}–${fmt12(h.close)}`;
}

function fmt12(time: string): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === "00" ? `${h12}${ampm}` : `${h12}:${m}${ampm}`;
}

// ─── BranchDialog ──────────────────────────────────────────────────────────────

export function BranchDialog({ open, onClose, branch, allStaff }: BranchDialogProps) {
  const router = useRouter();
  const isEdit = !!branch;

  // ── form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [city, setCity] = useState(branch?.city ?? "");
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [email, setEmail] = useState(branch?.email ?? "");
  const [manager, setManager] = useState(branch?.manager ?? "");
  const [hours, setHours] = useState<Record<string, BranchHours>>(
    branch?.businessHours && Object.keys(branch.businessHours).length > 0
      ? branch.businessHours
      : defaultHours()
  );
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(
    new Set(branch?.staffIds ?? [])
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── reset when dialog reopens ──────────────────────────────────────────────
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setLastOpen(true);
    setName(branch?.name ?? "");
    setAddress(branch?.address ?? "");
    setCity(branch?.city ?? "");
    setPhone(branch?.phone ?? "");
    setEmail(branch?.email ?? "");
    setManager(branch?.manager ?? "");
    setHours(
      branch?.businessHours && Object.keys(branch.businessHours).length > 0
        ? branch.businessHours
        : defaultHours()
    );
    setSelectedStaff(new Set(branch?.staffIds ?? []));
    setError(null);
  } else if (!open && lastOpen) {
    setLastOpen(false);
  }

  // ── hours helpers ──────────────────────────────────────────────────────────
  function setDayHours(day: string, patch: Partial<BranchHours>) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  }

  function copyAllDays() {
    const firstOpen = DAYS.find(({ key }) => !hours[key]?.closed);
    if (!firstOpen) return;
    const template = hours[firstOpen.key];
    setHours((prev) => {
      const next: Record<string, BranchHours> = {};
      for (const { key } of DAYS) {
        next[key] = { ...template, closed: prev[key]?.closed ?? false };
      }
      return next;
    });
  }

  // ── staff helpers ──────────────────────────────────────────────────────────
  function toggleStaff(id: string) {
    setSelectedStaff((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!name.trim()) {
      setError("Branch name is required.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        manager: manager.trim() || undefined,
        businessHours: hours,
        staffIds: Array.from(selectedStaff),
        active: true,
        isActive: true,
        timezone: "UTC",
      };

      let result: { success: boolean; error?: string };
      if (isEdit && branch) {
        result = await updateBranch(branch.id, payload);
      } else {
        result = await createBranch(payload);
      }

      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }

      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Branch" : "Add Branch"}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="hours" className="flex-1">Hours</TabsTrigger>
            <TabsTrigger value="staff" className="flex-1">Staff</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Details ─────────────────────────────────────────────── */}
          <TabsContent value="details" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="bd-name">Branch Name *</Label>
              <Input
                id="bd-name"
                placeholder="e.g. Downtown Branch"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bd-address">Address</Label>
                <Input
                  id="bd-address"
                  placeholder="123 Main St"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bd-city">City</Label>
                <Input
                  id="bd-city"
                  placeholder="New York"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bd-phone">Phone</Label>
                <Input
                  id="bd-phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bd-email">Email</Label>
                <Input
                  id="bd-email"
                  type="email"
                  placeholder="branch@salon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bd-manager">Manager</Label>
              <Input
                id="bd-manager"
                placeholder="Manager name"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* ── Tab 2: Hours ───────────────────────────────────────────────── */}
          <TabsContent value="hours" className="pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Set open/close times for each day.</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={copyAllDays}
              >
                <Copy className="w-3 h-3" />
                Copy to all days
              </Button>
            </div>

            <div className="space-y-2">
              {DAYS.map(({ key, label }) => {
                const day = hours[key] ?? { open: "09:00", close: "18:00", closed: false };
                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2",
                      day.closed ? "opacity-50 border-border" : "border-border"
                    )}
                  >
                    <span className="w-8 text-xs font-medium text-foreground shrink-0">{label}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={day.open}
                        disabled={day.closed}
                        onChange={(e) => setDayHours(key, { open: e.target.value })}
                        className="w-24 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input
                        type="time"
                        value={day.close}
                        disabled={day.closed}
                        onChange={(e) => setDayHours(key, { close: e.target.value })}
                        className="w-24 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch
                        id={`closed-${key}`}
                        checked={day.closed}
                        onCheckedChange={(v) => setDayHours(key, { closed: v })}
                      />
                      <Label htmlFor={`closed-${key}`} className="text-xs text-muted-foreground">
                        Closed
                      </Label>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Tab 3: Staff ───────────────────────────────────────────────── */}
          <TabsContent value="staff" className="pt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Select staff members assigned to this branch.
            </p>
            {allStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No staff members yet.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {allStaff.map((s) => (
                  <label
                    key={s.id}
                    htmlFor={`staff-${s.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-medium">{s.name}</span>
                    <Checkbox
                      id={`staff-${s.id}`}
                      checked={selectedStaff.has(s.id)}
                      onCheckedChange={() => toggleStaff(s.id)}
                    />
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedStaff.size} of {allStaff.length} staff assigned
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : isEdit ? "Save Changes" : "Add Branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
