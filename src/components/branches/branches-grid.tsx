"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Crown,
  Pencil,
  Trash2,
  PlusCircle,
  CheckCircle2,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { deleteBranch, setMainBranch } from "@/app/actions/branches";
import { BranchDialog, summariseHours } from "@/components/branches/branch-dialog";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  avatar?: string | null;
}

interface BranchesGridProps {
  initialBranches: Branch[];
  allStaff: StaffMember[];
}

// ─── Delete confirm ─────────────────────────────────────────────────────────────

function DeleteConfirmModal({
  open,
  branch,
  onClose,
  onDeleted,
}: {
  open: boolean;
  branch: Branch | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
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

// ─── Staff avatar row ───────────────────────────────────────────────────────────

function StaffAvatarRow({ staffIds, allStaff }: { staffIds: string[]; allStaff: StaffMember[] }) {
  const assigned = allStaff.filter((s) => staffIds.includes(s.id));
  if (assigned.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No staff assigned</p>;
  }
  const visible = assigned.slice(0, 5);
  const overflow = assigned.length - visible.length;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex -space-x-1.5">
        {visible.map((s) => (
          <div
            key={s.id}
            title={s.name}
            className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[9px] font-bold text-primary shrink-0"
          >
            {s.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {overflow > 0 && (
          <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium text-muted-foreground shrink-0">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {assigned.map((s) => s.name).slice(0, 3).join(", ")}
        {assigned.length > 3 ? ` +${assigned.length - 3} more` : ""}
      </span>
    </div>
  );
}

// ─── Branch card ────────────────────────────────────────────────────────────────

function BranchCard({
  branch,
  allStaff,
  onEdit,
  onDelete,
  onSetMain,
  isSettingMain,
}: {
  branch: Branch;
  allStaff: StaffMember[];
  onEdit: () => void;
  onDelete: () => void;
  onSetMain: () => void;
  isSettingMain: boolean;
}) {
  const staffCount = (branch.staffIds ?? []).length;
  const hoursSummary = summariseHours(branch.businessHours);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3 transition-all",
        branch.isMain
          ? "border-yellow-500/40 bg-yellow-500/5"
          : "border-border bg-card",
        !(branch.active ?? branch.isActive) && "opacity-60"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {branch.isMain && (
              <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            )}
            <h3 className="font-semibold text-sm text-foreground truncate">{branch.name}</h3>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {branch.isMain && (
              <Badge className="text-[10px] h-5 px-1.5 bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400">
                Main Branch
              </Badge>
            )}
            <Badge
              variant={(branch.active ?? branch.isActive) ? "secondary" : "outline"}
              className="text-[10px] h-5 px-1.5"
            >
              {(branch.active ?? branch.isActive) ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              {staffCount} staff
            </Badge>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        {(branch.address || branch.city) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {[branch.address, branch.city].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 shrink-0" />
            <span>{branch.phone}</span>
          </div>
        )}
        {branch.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{branch.email}</span>
          </div>
        )}
        {branch.manager && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{branch.manager}</span>
          </div>
        )}
        {hoursSummary && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">{hoursSummary}</span>
          </div>
        )}
      </div>

      {/* Staff avatars */}
      <div className="pt-1 border-t border-border">
        <StaffAvatarRow staffIds={branch.staffIds ?? []} allStaff={allStaff} />
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
        {!branch.isMain && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main BranchesGrid ──────────────────────────────────────────────────────────

export function BranchesGrid({ initialBranches, allStaff }: BranchesGridProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [settingMainId, setSettingMainId] = useState<string | null>(null);
  const [mainError, setMainError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
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
    refresh();
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {initialBranches.length === 0
            ? "No branches yet. Add your first location."
            : `${initialBranches.length} branch${initialBranches.length !== 1 ? "es" : ""}`}
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

      {/* Branch cards */}
      {initialBranches.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              allStaff={allStaff}
              onEdit={() => setEditBranch(branch)}
              onDelete={() => setDeletingBranch(branch)}
              onSetMain={() => handleSetMain(branch.id)}
              isSettingMain={settingMainId === branch.id}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl border-dashed border-border">
          <Building2 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">No branches yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Add your first salon location to start managing multiple branches
          </p>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <PlusCircle className="w-4 h-4" />
            Add First Branch
          </Button>
        </div>
      )}

      {/* Add dialog */}
      <BranchDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        branch={null}
        allStaff={allStaff}
      />

      {/* Edit dialog */}
      <BranchDialog
        open={!!editBranch}
        onClose={() => setEditBranch(null)}
        branch={editBranch}
        allStaff={allStaff}
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
