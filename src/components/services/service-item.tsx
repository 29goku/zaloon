"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Loader2, Check, X, Clock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateService, deleteService } from "@/app/actions/services";

// ── Types ──────────────────────────────────────────────────────────────────

interface ServiceItemProps {
  service: {
    id: string;
    name: string;
    price: number;
    durationMins: number;
  };
  currency: string;
  fmt: (n: number) => string;
}

// ── Edit schema ────────────────────────────────────────────────────────────

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().min(0, "Price must be 0 or more"),
  durationMins: z.number().int().min(1, "Duration must be at least 1 minute"),
});

type EditValues = z.infer<typeof editSchema>;

// ── Component ──────────────────────────────────────────────────────────────

export function ServiceItem({ service, fmt }: ServiceItemProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: service.name,
      price: service.price,
      durationMins: service.durationMins,
    },
  });

  // ── Edit ────────────────────────────────────────────────────────────────

  function handleEditOpen(next: boolean) {
    if (!next) {
      reset({ name: service.name, price: service.price, durationMins: service.durationMins });
      setServerError(null);
    }
    setEditOpen(next);
  }

  async function onEditSubmit(values: EditValues) {
    setServerError(null);
    const result = await updateService(service.id, {
      name: values.name.trim(),
      price: values.price,
      durationMins: values.durationMins,
    });

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setEditOpen(false);
    router.refresh();
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  async function handleConfirmDelete() {
    setIsDeleting(true);
    setServerError(null);
    const result = await deleteService(service.id);
    setIsDeleting(false);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setDeleteConfirmOpen(false);
    router.refresh();
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group">
        <div>
          <p className="font-medium text-foreground text-sm">{service.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {service.durationMins} min
          </p>
        </div>

        <div className="flex items-center gap-2">
          <p className="font-bold text-primary text-sm">{fmt(service.price)}</p>

          {/* Edit button */}
          <button
            onClick={() => setEditOpen(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${service.name}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${service.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={handleEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-name-${service.id}`}>Name</Label>
              <Input
                id={`edit-name-${service.id}`}
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-price-${service.id}`}>Price</Label>
              <Input
                id={`edit-price-${service.id}`}
                type="number"
                min={0}
                step={0.01}
                aria-invalid={!!errors.price}
                {...register("price", { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="text-xs text-destructive">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-duration-${service.id}`}>Duration (minutes)</Label>
              <Input
                id={`edit-duration-${service.id}`}
                type="number"
                min={1}
                step={1}
                aria-invalid={!!errors.durationMins}
                {...register("durationMins", { valueAsNumber: true })}
              />
              {errors.durationMins && (
                <p className="text-xs text-destructive">{errors.durationMins.message}</p>
              )}
            </div>

            {serverError && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{service.name}</span>? This cannot be
            undone.
          </p>

          {serverError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
              className="gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
