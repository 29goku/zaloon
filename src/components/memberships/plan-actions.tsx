"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Loader2, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updatePlan } from "@/app/actions/memberships";

// ── Types ──────────────────────────────────────────────────────────────────

type Plan = {
  id: string;
  name: string;
  price: number;
  sessionsPerMonth: number;
  discountPct: number;
  description: string | null;
  active: boolean;
};

// ── Toggle active ──────────────────────────────────────────────────────────

export function PlanActiveToggle({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleToggle(checked: boolean) {
    setPending(true);
    await updatePlan(plan.id, { active: checked });
    router.refresh();
    setPending(false);
  }

  return (
    <Switch
      checked={plan.active}
      onCheckedChange={handleToggle}
      disabled={pending}
      aria-label={plan.active ? "Deactivate plan" : "Activate plan"}
    />
  );
}

// ── Edit dialog ────────────────────────────────────────────────────────────

const editSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  price: z.number().min(0, "Price must be 0 or more"),
  sessionsPerMonth: z.number().int().min(1, "Must be at least 1"),
  discountPct: z.number().min(0).max(100),
  description: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

export function EditPlanDialog({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: plan.name,
      price: plan.price,
      sessionsPerMonth: plan.sessionsPerMonth,
      discountPct: plan.discountPct,
      description: plan.description ?? "",
    },
  });

  async function onSubmit(values: EditValues) {
    setServerError(null);
    try {
      const result = await updatePlan(plan.id, {
        name: values.name.trim(),
        price: values.price,
        sessionsPerMonth: values.sessionsPerMonth,
        discountPct: values.discountPct,
        description: values.description?.trim() || undefined,
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setServerError("An unexpected error occurred");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset({
        name: plan.name,
        price: plan.price,
        sessionsPerMonth: plan.sessionsPerMonth,
        discountPct: plan.discountPct,
        description: plan.description ?? "",
      });
      setServerError(null);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Edit plan" />
        }
      >
        <Pencil className="w-4 h-4" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Plan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Plan Name</Label>
            <Input id="edit-name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-price">Monthly Price</Label>
            <Input
              id="edit-price"
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
            <Label htmlFor="edit-sessions">Sessions per Month</Label>
            <Input
              id="edit-sessions"
              type="number"
              min={1}
              step={1}
              aria-invalid={!!errors.sessionsPerMonth}
              {...register("sessionsPerMonth", { valueAsNumber: true })}
            />
            {errors.sessionsPerMonth && (
              <p className="text-xs text-destructive">{errors.sessionsPerMonth.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-discount">
              Discount on Extra Services{" "}
              <span className="text-muted-foreground font-normal">(%)</span>
            </Label>
            <Input
              id="edit-discount"
              type="number"
              min={0}
              max={100}
              step={1}
              aria-invalid={!!errors.discountPct}
              {...register("discountPct", { valueAsNumber: true })}
            />
            {errors.discountPct && (
              <p className="text-xs text-destructive">{errors.discountPct.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea id="edit-desc" rows={3} {...register("description")} />
          </div>

          {serverError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Cancel membership button ───────────────────────────────────────────────

import { cancelMembership } from "@/app/actions/memberships";

export function CancelMembershipButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleCancel() {
    if (!confirm("Cancel this membership? This cannot be undone.")) return;
    setPending(true);
    await cancelMembership(id);
    router.refresh();
    setPending(false);
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Cancel membership"
      disabled={pending}
      onClick={handleCancel}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
    </Button>
  );
}
