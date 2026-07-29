"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, RefreshCw, Percent, DollarSign, Pencil } from "lucide-react";

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
import { createCoupon, updateCoupon } from "@/app/actions/coupons";

// ── Coupon code generator ──────────────────────────────────────────────────────

export function generateCouponCode(): string {
  // No confusable chars (0/O, 1/I/L)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// ── Schema ─────────────────────────────────────────────────────────────────────

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
  active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

// ── Coupon shape for editing ───────────────────────────────────────────────────

export interface CouponData {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderAmt: number;
  maxUses: number | null;
  expiresAt: string | null;
  active: boolean;
}

// ── Preview ────────────────────────────────────────────────────────────────────

function CouponPreview({
  type,
  value,
  minOrderAmt,
  maxUses,
  expiresAt,
}: {
  type: "PERCENTAGE" | "FIXED" | undefined;
  value: string;
  minOrderAmt: string;
  maxUses: string;
  expiresAt: string;
}) {
  const numValue = parseFloat(value);
  const numMin = parseFloat(minOrderAmt || "0");
  const numMax = parseInt(maxUses || "0");

  if (!type || isNaN(numValue) || numValue <= 0) return null;

  const discountText =
    type === "PERCENTAGE"
      ? `${numValue}% off`
      : `$${numValue.toFixed(2)} off`;

  const minText = numMin > 0 ? ` orders over $${numMin.toFixed(0)}` : "";
  const usesText =
    !maxUses || isNaN(numMax) || numMax <= 0
      ? "unlimited uses"
      : `usable ${numMax} time${numMax !== 1 ? "s" : ""}`;
  const expiryText = expiresAt ? `, expires ${expiresAt}` : "";

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
        Preview
      </p>
      <p className="text-foreground">
        This coupon gives{" "}
        <span className="font-semibold text-primary">{discountText}</span>
        {minText},{" "}
        <span className="font-semibold">{usesText}</span>
        {expiryText}.
      </p>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface CouponFormProps {
  /** When provided, renders as an edit dialog for that coupon */
  coupon?: CouponData;
}

export function CouponForm({ coupon }: CouponFormProps) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();
  const isEdit = !!coupon;

  const defaultValues: FormValues = coupon
    ? {
        code: coupon.code,
        type: coupon.type as "PERCENTAGE" | "FIXED",
        value: String(coupon.value),
        minOrderAmt: coupon.minOrderAmt > 0 ? String(coupon.minOrderAmt) : "",
        maxUses: coupon.maxUses != null ? String(coupon.maxUses) : "",
        expiresAt: coupon.expiresAt ?? "",
        active: coupon.active,
      }
    : {
        code: "",
        type: undefined as unknown as "PERCENTAGE" | "FIXED",
        value: "",
        minOrderAmt: "",
        maxUses: "",
        expiresAt: "",
        active: true,
      };

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const selectedType = watch("type");
  const watchValue = watch("value");
  const watchMin = watch("minOrderAmt");
  const watchMaxUses = watch("maxUses");
  const watchExpires = watch("expiresAt");

  function handleGenerate() {
    setValue("code", generateCouponCode(), { shouldValidate: true });
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const payload = {
      code: values.code.toUpperCase(),
      type: values.type,
      value: parseFloat(values.value),
      minOrderAmt: values.minOrderAmt ? parseFloat(values.minOrderAmt) : 0,
      maxUses: values.maxUses ? parseInt(values.maxUses) : null,
      expiresAt: values.expiresAt || null,
      active: values.active,
    };

    const result = isEdit && coupon
      ? await updateCoupon(coupon.id, payload)
      : await createCoupon(payload);

    if (!result.success) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }

    if (!isEdit) reset();
    setOpen(false);
    router.refresh();
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      if (!isEdit) reset();
      setServerError(null);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isEdit ? (
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
            />
          }
        >
          <Pencil className="w-3 h-3" />
          Edit
        </DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <Button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" />
          }
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit Coupon — ${coupon!.code}` : "Create Coupon"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
          {/* Code */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-code">
              Code <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="coupon-code"
                placeholder="e.g. SUMMER20"
                aria-invalid={!!errors.code}
                {...register("code", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
                className="uppercase font-mono tracking-wider flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                className="shrink-0 gap-1.5"
                title="Generate random code"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Generate
              </Button>
            </div>
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
                    <SelectValue placeholder="Select discount type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">
                      <span className="flex items-center gap-2">
                        <Percent className="w-3.5 h-3.5" />
                        Percentage (%)
                      </span>
                    </SelectItem>
                    <SelectItem value="FIXED">
                      <span className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5" />
                        Fixed Amount ($)
                      </span>
                    </SelectItem>
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
                <span className="text-muted-foreground font-normal ml-1 text-xs">(percent off)</span>
              )}
              {selectedType === "FIXED" && (
                <span className="text-muted-foreground font-normal ml-1 text-xs">(dollar amount off)</span>
              )}
            </Label>
            <div className="relative">
              {selectedType === "FIXED" && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                  $
                </span>
              )}
              {selectedType === "PERCENTAGE" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                  %
                </span>
              )}
              <Input
                id="coupon-value"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedType === "PERCENTAGE" ? "100" : undefined}
                placeholder={selectedType === "PERCENTAGE" ? "e.g. 20" : "e.g. 15.00"}
                aria-invalid={!!errors.value}
                className={
                  selectedType === "FIXED"
                    ? "pl-6"
                    : selectedType === "PERCENTAGE"
                    ? "pr-6"
                    : ""
                }
                {...register("value")}
              />
            </div>
            {errors.value && (
              <p className="text-xs text-destructive">{errors.value.message}</p>
            )}
          </div>

          {/* Min Order Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-min-order">
              Min Order Amount
              <span className="text-muted-foreground font-normal ml-1 text-xs">(optional)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                $
              </span>
              <Input
                id="coupon-min-order"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00 (no minimum)"
                aria-invalid={!!errors.minOrderAmt}
                className="pl-6"
                {...register("minOrderAmt")}
              />
            </div>
            {errors.minOrderAmt && (
              <p className="text-xs text-destructive">{errors.minOrderAmt.message}</p>
            )}
          </div>

          {/* Max Uses */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-max-uses">
              Max Uses
              <span className="text-muted-foreground font-normal ml-1 text-xs">(blank = unlimited)</span>
            </Label>
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
            <Label htmlFor="coupon-expires">
              Expiry Date
              <span className="text-muted-foreground font-normal ml-1 text-xs">(optional)</span>
            </Label>
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

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive coupons cannot be redeemed
              </p>
            </div>
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  className={[
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    field.value ? "bg-primary" : "bg-input",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform",
                      field.value ? "translate-x-4" : "translate-x-0",
                    ].join(" ")}
                  />
                </button>
              )}
            />
          </div>

          {/* Preview */}
          <CouponPreview
            type={selectedType}
            value={watchValue ?? ""}
            minOrderAmt={watchMin ?? ""}
            maxUses={watchMaxUses ?? ""}
            expiresAt={watchExpires ?? ""}
          />

          {serverError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEdit ? "Saving…" : "Creating…"}
                </>
              ) : isEdit ? (
                "Save Changes"
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
