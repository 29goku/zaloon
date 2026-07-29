"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";

import { createStaff } from "@/app/actions/staff";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  commissionPct: z.number().min(0, "Min 0").max(100, "Max 100"),
});

type FormValues = z.infer<typeof schema>;

export function AddStaffDialog() {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as import("react-hook-form").Resolver<FormValues>,
    defaultValues: { name: "", phone: "", commissionPct: 0 },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createStaff({
      name: values.name,
      phone: values.phone || undefined,
      commissionPct: values.commissionPct,
    });

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    reset();
    setOpen(false);
    router.refresh();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
      setServerError(null);
    }
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Staff
      </button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-name">Name</Label>
            <Input
              id="staff-name"
              placeholder="e.g. Priya Sharma"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-phone">Phone (optional)</Label>
            <Input
              id="staff-phone"
              type="tel"
              placeholder="e.g. +91 98765 43210"
              {...register("phone")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-commission">Commission %</Label>
            <Controller
              name="commissionPct"
              control={control}
              render={({ field }) => (
                <Input
                  id="staff-commission"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  placeholder="e.g. 30"
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  aria-invalid={!!errors.commissionPct}
                />
              )}
            />
            {errors.commissionPct && (
              <p className="text-xs text-destructive">{errors.commissionPct.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Staff
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
