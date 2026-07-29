"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { createPlan } from "@/app/actions/memberships";

// ── Schema ─────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  price: z.number().min(0, "Price must be 0 or more"),
  sessionsPerMonth: z.number().int().min(1, "Must be at least 1 session"),
  discountPct: z.number().min(0).max(100),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ── Component ──────────────────────────────────────────────────────────────

export function CreatePlanDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: 0,
      sessionsPerMonth: 4,
      discountPct: 0,
      description: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const result = await createPlan({
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
      reset();
      router.refresh();
    } catch {
      setServerError("An unexpected error occurred");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
      setServerError(null);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" />
        }
      >
        <Plus className="w-4 h-4" />
        Add Plan
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Membership Plan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
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
            <Label htmlFor="plan-price">Monthly Price</Label>
            <Input
              id="plan-price"
              type="number"
              min={0}
              step={0.01}
              placeholder="0"
              aria-invalid={!!errors.price}
              {...register("price", { valueAsNumber: true })}
            />
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price.message}</p>
            )}
          </div>

          {/* Sessions per month */}
          <div className="space-y-1.5">
            <Label htmlFor="plan-sessions">Sessions per Month</Label>
            <Input
              id="plan-sessions"
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

          {/* Discount % */}
          <div className="space-y-1.5">
            <Label htmlFor="plan-discount">
              Discount on Extra Services{" "}
              <span className="text-muted-foreground font-normal">(%)</span>
            </Label>
            <Input
              id="plan-discount"
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="0"
              aria-invalid={!!errors.discountPct}
              {...register("discountPct", { valueAsNumber: true })}
            />
            {errors.discountPct && (
              <p className="text-xs text-destructive">{errors.discountPct.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="plan-description">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="plan-description"
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
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
