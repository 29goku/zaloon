"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Pencil,
  Trash2,
  Loader2,
  X,
  WifiOff,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ServiceForm } from "./service-form";
import { deleteService, toggleServiceActive } from "@/app/actions/services";

interface AddonService {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  active: boolean;
  isAddon: boolean;
  imageUrl: string | null;
  bufferTimeBefore: number;
  bufferTimeAfter: number;
  onlineBooking: boolean;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  staff: { id: string; name: string; avatar: string | null }[];
}

interface AddonsPageClientProps {
  addons: AddonService[];
  allCategories: { id: string; name: string; icon: string | null }[];
  fmt: (n: number) => string;
}

function AddonCard({
  addon,
  allCategories,
  fmt,
}: {
  addon: AddonService;
  allCategories: { id: string; name: string; icon: string | null }[];
  fmt: (n: number) => string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isToggling, setIsToggling] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  async function handleToggle() {
    setIsToggling(true);
    await toggleServiceActive(addon.id, !addon.active);
    setIsToggling(false);
    router.refresh();
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteService(addon.id);
    setIsDeleting(false);
    if (!result.success) {
      setDeleteError(result.error);
      return;
    }
    setDeleteOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-xl">
          {addon.categoryIcon ? (
            <span>{addon.categoryIcon}</span>
          ) : (
            <Layers className="w-5 h-5 text-primary" />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={[
                "text-sm font-semibold truncate",
                addon.active ? "text-foreground" : "text-muted-foreground line-through",
              ].join(" ")}
            >
              {addon.name}
            </p>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              Add-on
            </Badge>
            {!addon.onlineBooking && (
              <span title="Hidden from online booking">
                <WifiOff className="w-3 h-3 text-muted-foreground/60" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {addon.durationMins} min
            </span>
            <span className="text-xs text-muted-foreground">
              Category: {addon.categoryIcon ? `${addon.categoryIcon} ` : ""}{addon.categoryName}
            </span>
            {addon.staff.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {addon.staff.length} staff
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <span className="text-sm font-bold text-primary shrink-0">
          {fmt(addon.price)}
        </span>

        {/* Active toggle */}
        <Switch
          checked={addon.active}
          onCheckedChange={handleToggle}
          disabled={isToggling}
          aria-label={addon.active ? "Deactivate" : "Activate"}
        />

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditOpen(true)}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${addon.name}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setDeleteError(null); setDeleteOpen(true); }}
            className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${addon.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Add-on: {addon.name}</DialogTitle>
          </DialogHeader>
          <ServiceForm
            service={addon}
            categories={allCategories}
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!next) setDeleteError(null);
          setDeleteOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Add-on</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{addon.name}</span>? This cannot be
            undone.
          </p>
          {deleteError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting} className="gap-1.5">
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-1.5">
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddonsPageClient({ addons, allCategories, fmt }: AddonsPageClientProps) {
  // Group by category for display
  const grouped = React.useMemo(() => {
    const map = new Map<string, { categoryName: string; categoryIcon: string | null; addons: AddonService[] }>();
    for (const addon of addons) {
      const existing = map.get(addon.categoryId) ?? {
        categoryName: addon.categoryName,
        categoryIcon: addon.categoryIcon,
        addons: [],
      };
      existing.addons.push(addon);
      map.set(addon.categoryId, existing);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName)
    );
  }, [addons]);

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Add-on services can be combined with primary services during booking. Clients select a
          primary service first, then choose compatible add-ons (e.g. a nail treatment after a
          haircut).
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Add-ons</p>
          <p className="text-2xl font-bold mt-1">{addons.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold mt-1 text-green-500">
            {addons.filter((a) => a.active).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Categories</p>
          <p className="text-2xl font-bold mt-1">{grouped.length}</p>
        </div>
      </div>

      {/* Grouped list */}
      {grouped.map((group) => (
        <div key={group.categoryName} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-lg">{group.categoryIcon ?? "✂️"}</span>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {group.categoryName}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {group.addons.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {group.addons
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((addon) => (
                <AddonCard
                  key={addon.id}
                  addon={addon}
                  allCategories={allCategories}
                  fmt={fmt}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
