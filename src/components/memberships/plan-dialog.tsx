"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { createPlan, updatePlan } from "@/app/actions/memberships";

// ── Schema ──────────────────────────────────────────────────────────────────

const planSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  price: z.number().min(0, "Price must be 0 or more"),
  sessionsPerMonth: z.number().int().min(1, "Must be at least 1 session"),
  discountPct: z.number().min(0).max(50),
  description: z.string().optional(),
});

type PlanFormValues = z.infer<typeof planSchema>;

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlanDialogPlan {
  id: string;
  name: string;
  price: number;
  sessionsPerMonth: number;
  discountPct: number;
  description: string | null;
}

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a plan to edit, omit for create mode */
  plan?: PlanDialogPlan;
}

// ── Component ────────────────────────────────────────────────────────────────

export function PlanDialog({ open, onOpenChange, plan }: PlanDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(plan);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: plan
      ? {
          name: plan.name,
          price: plan.price,
          sessionsPerMonth: plan.sessionsPerMonth,
          discountPct: plan.discountPct,
          description: plan.description ?? "",
        }
      : {
          name: "",
          price: 0,
          sessionsPerMonth: 4,
          discountPct: 0,
          description: "",
        },
  });

  const discountPct = watch("discountPct");

  // Sync form defaults when plan prop changes (e.g. opening a different plan to edit)
  React.useEffect(() => {
    if (plan) {
      reset({
        name: plan.name,
        price: plan.price,
        sessionsPerMonth: plan.sessionsPerMonth,
        discountPct: plan.discountPct,
        description: plan.description ?? "",
      });
    } else {
      reset({
        name: "",
        price: 0,
        sessionsPerMonth: 4,
        discountPct: 0,
        description: "",
      });
    }
  }, [plan, reset]);

  async function onSubmit(values: PlanFormValues) {
    setServerError(null);
    try {
      const payload = {
        name: values.name.trim(),
        price: values.price,
        sessionsPerMonth: values.sessionsPerMonth,
        discountPct: values.discountPct,
        description: values.description?.trim() || undefined,
      };

      const result = isEdit && plan
        ? await updatePlan(plan.id, payload)
        : await createPlan(payload);

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setServerError("An unexpected error occurred");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setServerError(null);
      if (!isEdit) reset();
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Membership Plan" : "Create Membership Plan"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="pd-name">Plan Name</Label>
            <Input
              id="pd-name"
              placeholder="e.g. Gold Monthly"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label htmlFor="pd-price">Price / Month</Label>
            <Input
              id="pd-price"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              aria-invalid={!!errors.price}
              {...register("price", { valueAsNumber: true })}
            />
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price.message}</p>
            )}
          </div>

          {/* Sessions per month */}
          <div className="space-y-1.5">
            <Label htmlFor="pd-sessions">Sessions per Month</Label>
            <Input
              id="pd-sessions"
              type="number"
              min={1}
              step={1}
              placeholder="4"
              aria-invalid={!!errors.sessionsPerMonth}
              {...register("sessionsPerMonth", { valueAsNumber: true })}
            />
            {errors.sessionsPerMonth && (
              <p className="text-xs text-destructive">{errors.sessionsPerMonth.message}</p>
            )}
          </div>

          {/* Discount % slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pd-discount">Discount on Extra Services</Label>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {discountPct ?? 0}%
              </span>
            </div>
            <Controller
              name="discountPct"
              control={control}
              render={({ field }) => (
                <input
                  id="pd-discount"
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-muted"
                />
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
            </div>
            {errors.discountPct && (
              <p className="text-xs text-destructive">{errors.discountPct.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="pd-description">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="pd-description"
              placeholder="What's included in this plan..."
              rows={3}
              {...register("description")}
            />
          </div>

          {serverError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
