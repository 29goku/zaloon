"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCoupon } from "@/app/actions/coupons";

const formSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  type: z.enum(["PERCENTAGE", "FIXED"] as const, { error: "Type is required" }),
  value: z
    .string()
    .min(1, "Value is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Value must be a positive number",
    }),
  minOrderAmt: z
    .string()
    .refine((v) => v === "" || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), {
      message: "Min order must be 0 or greater",
    })
    .optional(),
  maxUses: z
    .string()
    .refine((v) => v === "" || (!isNaN(parseInt(v)) && parseInt(v) > 0), {
      message: "Max uses must be a positive whole number",
    })
    .optional(),
  expiresAt: z
    .string()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Expiry must be YYYY-MM-DD",
    })
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateCouponDialog() {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      type: undefined,
      value: "",
      minOrderAmt: "",
      maxUses: "",
      expiresAt: "",
    },
  });

  const selectedType = watch("type");

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const result = await createCoupon({
      code: values.code.toUpperCase(),
      type: values.type,
      value: parseFloat(values.value),
      minOrderAmt: values.minOrderAmt ? parseFloat(values.minOrderAmt) : 0,
      maxUses: values.maxUses ? parseInt(values.maxUses) : null,
      expiresAt: values.expiresAt || null,
    });

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    reset();
    setOpen(false);
    router.refresh();
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
        Create Coupon
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Coupon</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
          {/* Code */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="coupon-code"
              placeholder="e.g. SUMMER20"
              aria-invalid={!!errors.code}
              {...register("code", {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
              className="uppercase"
            />
            {errors.code && (
              <p className="text-xs text-destructive">{errors.code.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label>
              Type <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(val) => field.onChange(val)}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.type}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>

          {/* Value */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-value">
              Value <span className="text-destructive">*</span>
              {selectedType === "PERCENTAGE" && (
                <span className="text-muted-foreground font-normal ml-1">(percent)</span>
              )}
              {selectedType === "FIXED" && (
                <span className="text-muted-foreground font-normal ml-1">(amount)</span>
              )}
            </Label>
            <Input
              id="coupon-value"
              type="number"
              step="0.01"
              min="0.01"
              placeholder={selectedType === "PERCENTAGE" ? "e.g. 20" : "e.g. 50"}
              aria-invalid={!!errors.value}
              {...register("value")}
            />
            {errors.value && (
              <p className="text-xs text-destructive">{errors.value.message}</p>
            )}
          </div>

          {/* Min Order Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-min-order">Min Order Amount</Label>
            <Input
              id="coupon-min-order"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00 (no minimum)"
              aria-invalid={!!errors.minOrderAmt}
              {...register("minOrderAmt")}
            />
            {errors.minOrderAmt && (
              <p className="text-xs text-destructive">{errors.minOrderAmt.message}</p>
            )}
          </div>

          {/* Max Uses */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-max-uses">Max Uses</Label>
            <Input
              id="coupon-max-uses"
              type="number"
              step="1"
              min="1"
              placeholder="Leave blank for unlimited"
              aria-invalid={!!errors.maxUses}
              {...register("maxUses")}
            />
            {errors.maxUses && (
              <p className="text-xs text-destructive">{errors.maxUses.message}</p>
            )}
          </div>

          {/* Expires At */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-expires">Expiry Date</Label>
            <Input
              id="coupon-expires"
              type="date"
              aria-invalid={!!errors.expiresAt}
              {...register("expiresAt")}
            />
            {errors.expiresAt && (
              <p className="text-xs text-destructive">{errors.expiresAt.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Coupon"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
