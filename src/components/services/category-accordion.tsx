"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Clock,
  Copy,
  ChevronUp,
  Users,
  CalendarCheck,
  WifiOff,
  PlusCircle,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  updateCategory,
  deleteCategory,
  deleteService,
  toggleServiceActive,
  duplicateService,
} from "@/app/actions/services";
import { ServiceForm } from "./service-form";

// ── Types ──────────────────────────────────────────────────────────────────

export type StaffMember = {
  id: string;
  name: string;
  avatar: string | null;
};

export type AccordionService = {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  active: boolean;
  categoryId: string;
  isAddon: boolean;
  imageUrl: string | null;
  bufferTimeBefore: number;
  bufferTimeAfter: number;
  onlineBooking: boolean;
  staff: StaffMember[];
  bookingCount30d: number;
};

export type AccordionCategory = {
  id: string;
  name: string;
  icon: string | null;
  services: AccordionService[];
};

export interface CategoryAccordionProps {
  category: AccordionCategory;
  allCategories: { id: string; name: string; icon: string | null }[];
  currency?: string;
  defaultOpen?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

// ── StaffAvatars ───────────────────────────────────────────────────────────

function StaffAvatars({ staff }: { staff: StaffMember[] }) {
  if (staff.length === 0) return null;

  const visible = staff.slice(0, 4);
  const overflow = staff.length - 4;

  return (
    <div className="flex items-center" title={staff.map((s) => s.name).join(", ")}>
      <span className="text-muted-foreground mr-1">
        <Users className="w-3 h-3 inline" />
      </span>
      <div className="flex -space-x-1.5">
        {visible.map((s) => (
          <div
            key={s.id}
            className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center ring-1 ring-background uppercase"
            title={s.name}
          >
            {s.name.charAt(0)}
          </div>
        ))}
        {overflow > 0 && (
          <div className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[9px] font-bold flex items-center justify-center ring-1 ring-background">
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ServiceRow ─────────────────────────────────────────────────────────────

function ServiceRow({
  service,
  allCategories,
  currency = "USD",
}: {
  service: AccordionService;
  allCategories: { id: string; name: string; icon: string | null }[];
  currency?: string;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [isToggling, setIsToggling] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  async function handleToggleActive() {
    setIsToggling(true);
    await toggleServiceActive(service.id, !service.active);
    setIsToggling(false);
    router.refresh();
  }

  async function handleDuplicate() {
    setIsDuplicating(true);
    await duplicateService(service.id);
    setIsDuplicating(false);
    router.refresh();
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteService(service.id);
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
      <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors">
        {/* Drag hint */}
        <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" aria-hidden />

        {/* Service details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p
              className={[
                "text-sm font-medium truncate",
                service.active ? "text-foreground" : "text-muted-foreground line-through",
              ].join(" ")}
            >
              {service.name}
            </p>
            {service.isAddon && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                Add-on
              </Badge>
            )}
            {!service.onlineBooking && (
              <span title="Hidden from online booking">
                <WifiOff className="w-3 h-3 text-muted-foreground/60" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" />
              {service.durationMins} min
              {(service.bufferTimeBefore > 0 || service.bufferTimeAfter > 0) && (
                <span className="text-muted-foreground/60">
                  {" "}(+{service.bufferTimeBefore}/{service.bufferTimeAfter})
                </span>
              )}
            </p>
            {service.bookingCount30d > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarCheck className="w-3 h-3 shrink-0" />
                {service.bookingCount30d} this month
              </p>
            )}
            <StaffAvatars staff={service.staff} />
          </div>
        </div>

        {/* Price */}
        <span className="text-sm font-bold text-primary shrink-0">
          {fmt(service.price)}
        </span>

        {/* Active toggle */}
        <Switch
          checked={service.active}
          onCheckedChange={handleToggleActive}
          disabled={isToggling}
          aria-label={service.active ? "Deactivate service" : "Activate service"}
        />

        {/* Action buttons (revealed on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            disabled={isDuplicating}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label={`Duplicate ${service.name}`}
            title="Duplicate service"
          >
            {isDuplicating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Edit */}
          <button
            onClick={() => setEditOpen(true)}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${service.name}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={() => setDeleteOpen(true)}
            className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${service.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          <ServiceForm
            service={service}
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
            <DialogTitle>Delete Service</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{service.name}</span>? This cannot be
            undone.
          </p>
          {deleteError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
              className="gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
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

// ── CategoryAccordion ──────────────────────────────────────────────────────

export function CategoryAccordion({
  category,
  allCategories,
  currency = "USD",
  defaultOpen = true,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: CategoryAccordionProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(defaultOpen);

  // Inline category name editing
  const [editingName, setEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(category.name);
  const [isSavingName, setIsSavingName] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  // Delete category
  const [deleteCatOpen, setDeleteCatOpen] = React.useState(false);
  const [isDeletingCat, setIsDeletingCat] = React.useState(false);
  const [deleteCatError, setDeleteCatError] = React.useState<string | null>(null);

  // Add service (quick add)
  const [addServiceOpen, setAddServiceOpen] = React.useState(false);

  function startEditName(e: React.MouseEvent) {
    e.stopPropagation();
    setNameInput(category.name);
    setNameError(null);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }

  function cancelEditName() {
    setEditingName(false);
    setNameInput(category.name);
    setNameError(null);
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError("Name is required");
      return;
    }
    if (trimmed === category.name) {
      setEditingName(false);
      return;
    }

    setIsSavingName(true);
    setNameError(null);
    const result = await updateCategory(category.id, {
      name: trimmed,
      icon: category.icon ?? undefined,
    });
    setIsSavingName(false);

    if (!result.success) {
      setNameError(result.error);
      return;
    }

    setEditingName(false);
    router.refresh();
  }

  async function handleDeleteCategory() {
    setIsDeletingCat(true);
    setDeleteCatError(null);
    const result = await deleteCategory(category.id);
    setIsDeletingCat(false);

    if (!result.success) {
      setDeleteCatError(result.error);
      return;
    }

    setDeleteCatOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors select-none"
          onClick={() => setOpen((prev) => !prev)}
          role="button"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}

          <span className="text-xl shrink-0">{category.icon ?? "✂️"}</span>

          {editingName ? (
            /* Inline name editor */
            <div
              className="flex items-center gap-2 flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                ref={nameInputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") cancelEditName();
                }}
                className="h-7 text-sm font-semibold max-w-60"
                aria-label="Edit category name"
                aria-invalid={!!nameError}
              />
              {nameError && (
                <span className="text-xs text-destructive">{nameError}</span>
              )}
              <button
                onClick={saveName}
                disabled={isSavingName}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50"
                aria-label="Save category name"
              >
                {isSavingName ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={cancelEditName}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Cancel editing"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Static title */
            <span className="font-semibold text-sm flex-1">{category.name}</span>
          )}

          <Badge variant="secondary" className="ml-auto shrink-0">
            {category.services.length}{" "}
            {category.services.length === 1 ? "service" : "services"}
          </Badge>

          {!editingName && (
            <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
              {/* Up / Down reorder */}
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move category up"
                title="Move up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move category down"
                title="Move down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Rename */}
              <button
                onClick={startEditName}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Rename ${category.name}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteCatError(null);
                  setDeleteCatOpen(true);
                }}
                className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Delete ${category.name} category`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Services list */}
        {open && (
          <div className="border-t border-border">
            {category.services.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-4 text-center">
                No services in this category yet
              </p>
            ) : (
              <div className="px-2 py-2 space-y-0.5">
                {category.services.map((service) => (
                  <ServiceRow
                    key={service.id}
                    service={service}
                    allCategories={allCategories}
                    currency={currency}
                  />
                ))}
              </div>
            )}

            {/* Add service to this category */}
            <div className="px-3 pb-3 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAddServiceOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-lg hover:bg-muted w-full"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add service to {category.name}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add service dialog (pre-scoped to this category) */}
      <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Service to {category.name}</DialogTitle>
          </DialogHeader>
          <ServiceForm
            service={undefined}
            categories={allCategories}
            onSuccess={() => setAddServiceOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete category dialog */}
      <Dialog
        open={deleteCatOpen}
        onOpenChange={(next) => {
          if (!next) setDeleteCatError(null);
          setDeleteCatOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>

          {category.services.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{category.name}</span> has{" "}
              {category.services.length} service
              {category.services.length !== 1 ? "s" : ""}. Delete all services in this category
              before deleting it.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the{" "}
              <span className="font-medium text-foreground">{category.name}</span> category? This
              cannot be undone.
            </p>
          )}

          {deleteCatError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {deleteCatError}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCatOpen(false)}
              disabled={isDeletingCat}
            >
              Cancel
            </Button>
            {category.services.length === 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteCategory}
                disabled={isDeletingCat}
                className="gap-1.5"
              >
                {isDeletingCat ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
