"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  Pencil,
  Trash2,
  PlusCircle,
  CheckCircle2,
  Loader2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Branch } from "@/app/actions/branches";
import {
  saveBranch,
  updateBranch,
  deleteBranch,
  setMainBranch,
} from "@/app/actions/branches";

// ─── Common timezones list ─────────────────────────────────────────────────

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

// ─── Empty form defaults ───────────────────────────────────────────────────

function defaultHours() {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const result: Record<string, { open: string; close: string; closed: boolean }> = {};
  for (const day of days) {
    result[day] = { open: "09:00", close: "18:00", closed: day === "sunday" };
  }
  return result;
}

function emptyForm(): Omit<Branch, "id"> {
  return {
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    manager: "",
    isMain: false,
    isActive: true,
    active: true,
    timezone: "UTC",
    staffIds: [],
    businessHours: defaultHours(),
    createdAt: new Date().toISOString(),
  };
}

// ─── Branch form modal ─────────────────────────────────────────────────────

interface BranchFormModalProps {
  open: boolean;
  onClose: () => void;
  initial?: Branch | null;
  onSaved: () => void;
}

function BranchFormModal({ open, onClose, initial, onSaved }: BranchFormModalProps) {
  const [form, setForm] = useState<Omit<Branch, "id">>(
    initial ? {
      name: initial.name,
      address: initial.address,
      city: initial.city ?? "",
      phone: initial.phone ?? "",
      email: initial.email ?? "",
      manager: initial.manager ?? "",
      isMain: initial.isMain,
      isActive: initial.isActive,
      active: initial.active ?? true,
      timezone: initial.timezone ?? "UTC",
      staffIds: initial.staffIds ?? [],
      businessHours: initial.businessHours ?? defaultHours(),
      createdAt: initial.createdAt ?? new Date().toISOString(),
    } : emptyForm()
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEdit = !!initial;

  function handleChange(field: keyof Omit<Branch, "id">, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Branch name is required.");
      return;
    }
    setError(null);

    startTransition(async () => {
      let result: { success: boolean; error?: string };
      if (isEdit && initial) {
        result = await updateBranch(initial.id, form);
      } else {
        result = await saveBranch(form);
      }

      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onSaved();
      onClose();
    });
  }

  // Reset form when opening with new initial value
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setLastOpen(true);
    setError(null);
    setForm(initial ? {
      name: initial.name,
      address: initial.address,
      city: initial.city ?? "",
      phone: initial.phone ?? "",
      email: initial.email ?? "",
      manager: initial.manager ?? "",
      isMain: initial.isMain,
      isActive: initial.isActive,
      active: initial.active ?? true,
      timezone: initial.timezone ?? "UTC",
      staffIds: initial.staffIds ?? [],
      businessHours: initial.businessHours ?? defaultHours(),
      createdAt: initial.createdAt ?? new Date().toISOString(),
    } : emptyForm());
  } else if (!open && lastOpen) {
    setLastOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Branch" : "Add Branch"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="branch-name">Branch Name *</Label>
            <Input
              id="branch-name"
              placeholder="e.g. Downtown Branch"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="branch-address">Address</Label>
            <Input
              id="branch-address"
              placeholder="123 Main St, City, State"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="branch-phone">Phone</Label>
            <Input
              id="branch-phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="branch-email">Email</Label>
            <Input
              id="branch-email"
              type="email"
              placeholder="branch@example.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <Label htmlFor="branch-timezone">Timezone</Label>
            <select
              id="branch-timezone"
              value={form.timezone}
              onChange={(e) => handleChange("timezone", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="branch-active" className="text-sm font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive branches are hidden from clients</p>
            </div>
            <Switch
              id="branch-active"
              checked={form.isActive}
              onCheckedChange={(v) => handleChange("isActive", v)}
            />
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? "Save Changes" : "Add Branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirm modal ──────────────────────────────────────────────────

interface DeleteConfirmProps {
  open: boolean;
  branch: Branch | null;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteConfirmModal({ open, branch, onClose, onDeleted }: DeleteConfirmProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!branch) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBranch(branch.id);
      if (!result.success) {
        setError(result.error ?? "Failed to delete branch.");
        return;
      }
      onDeleted();
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Branch</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{branch?.name}</span>?
            This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main manager component ────────────────────────────────────────────────

interface BranchesManagerProps {
  initialBranches: Branch[];
}

export function BranchesManager({ initialBranches }: BranchesManagerProps) {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [addOpen, setAddOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [settingMainId, setSettingMainId] = useState<string | null>(null);
  const [mainError, setMainError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    // We rely on router.refresh() to re-fetch and re-render from server
  }

  async function handleSetMain(id: string) {
    setSettingMainId(id);
    setMainError(null);
    const result = await setMainBranch(id);
    setSettingMainId(null);
    if (!result.success) {
      setMainError(result.error ?? "Failed to set main branch.");
      return;
    }
    setBranches((prev) => prev.map((b) => ({ ...b, isMain: b.id === id })));
    refresh();
  }

  return (
    <div className="space-y-6">
      {/* Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {branches.length === 0
            ? "No branches yet. Add your first location."
            : `${branches.length} branch${branches.length !== 1 ? "es" : ""}`}
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <PlusCircle className="w-4 h-4" />
          Add Branch
        </Button>
      </div>

      {mainError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {mainError}
        </div>
      )}

      {/* Branch cards grid */}
      {branches.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onEdit={() => setEditBranch(branch)}
              onDelete={() => setDeletingBranch(branch)}
              onSetMain={() => handleSetMain(branch.id)}
              isSettingMain={settingMainId === branch.id}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl border-dashed border-border">
          <Building2 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">No branches yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Add your salon locations to manage multiple branches
          </p>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <PlusCircle className="w-4 h-4" />
            Add First Branch
          </Button>
        </div>
      )}

      {/* Add modal */}
      <BranchFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initial={null}
        onSaved={refresh}
      />

      {/* Edit modal */}
      <BranchFormModal
        open={!!editBranch}
        onClose={() => setEditBranch(null)}
        initial={editBranch}
        onSaved={refresh}
      />

      {/* Delete confirm */}
      <DeleteConfirmModal
        open={!!deletingBranch}
        branch={deletingBranch}
        onClose={() => setDeletingBranch(null)}
        onDeleted={refresh}
      />
    </div>
  );
}

// ─── Branch card ───────────────────────────────────────────────────────────

interface BranchCardProps {
  branch: Branch;
  onEdit: () => void;
  onDelete: () => void;
  onSetMain: () => void;
  isSettingMain: boolean;
}

function BranchCard({ branch, onEdit, onDelete, onSetMain, isSettingMain }: BranchCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3 transition-all",
        branch.isMain
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card",
        !branch.isActive && "opacity-60"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">{branch.name}</h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {branch.isMain && (
              <Badge className="text-[10px] h-5 px-1.5 bg-primary/15 text-primary border-primary/30">
                <Star className="w-2.5 h-2.5 mr-0.5" />
                Main
              </Badge>
            )}
            <Badge
              variant={branch.isActive ? "secondary" : "outline"}
              className="text-[10px] h-5 px-1.5"
            >
              {branch.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1">
        {branch.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{branch.address}</span>
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span>{branch.phone}</span>
          </div>
        )}
        {branch.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{branch.email}</span>
          </div>
        )}
        {branch.timezone && branch.timezone !== "UTC" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="w-3 h-3 flex-shrink-0" />
            <span>{branch.timezone}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2"
          onClick={onEdit}
        >
          <Pencil className="w-3 h-3" />
          Edit
        </Button>
        {!branch.isMain && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={onSetMain}
            disabled={isSettingMain}
          >
            {isSettingMain ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3" />
            )}
            Set as main
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2 ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </Button>
      </div>
    </div>
  );
}
