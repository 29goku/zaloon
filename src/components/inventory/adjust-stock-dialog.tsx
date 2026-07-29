"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { adjustStock } from "@/app/actions/inventory";

const TRANSACTION_TYPES = [
  { value: "IN", label: "Stock In", description: "Add items to inventory" },
  { value: "OUT", label: "Stock Out", description: "Remove items from inventory" },
  { value: "ADJUSTMENT", label: "Adjustment", description: "Correct inventory count" },
] as const;

const formSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine(
      (v) => {
        const n = parseInt(v);
        return !isNaN(n) && n > 0;
      },
      { message: "Quantity must be a positive number" }
    ),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AdjustStockDialogProps {
  itemId: string;
  itemName: string;
  currentQuantity: number;
  unit: string;
  trigger?: React.ReactNode;
}

export function AdjustStockDialog({
  itemId,
  itemName,
  currentQuantity,
  unit,
  trigger,
}: AdjustStockDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "IN",
      quantity: "",
      note: "",
    },
  });

  const watchedType = watch("type");
  const watchedQty = watch("quantity");

  // Preview the resulting quantity
  const previewQty = React.useMemo(() => {
    const qty = parseInt(watchedQty || "0");
    if (isNaN(qty) || qty <= 0) return null;
    if (watchedType === "IN") return Math.max(0, currentQuantity + qty);
    if (watchedType === "OUT") return Math.max(0, currentQuantity - qty);
    // ADJUSTMENT: treat quantity as the delta (negative values use minus prefix in note)
    return Math.max(0, currentQuantity + qty);
  }, [watchedType, watchedQty, currentQuantity]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await adjustStock(
      itemId,
      parseInt(values.quantity),
      values.type,
      values.note || undefined
    );

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

  const typeColors = {
    IN: "text-emerald-600 dark:text-emerald-400",
    OUT: "text-rose-600 dark:text-rose-400",
    ADJUSTMENT: "text-amber-600 dark:text-amber-400",
  };

  return (
    <>
      {/* Render trigger outside the Dialog so we have full control over its appearance */}
      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 text-xs"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Adjust
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>

        {/* Item info */}
        <div className="rounded-lg bg-secondary/60 px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">{itemName}</p>
          <p className="text-muted-foreground mt-0.5">
            Current stock:{" "}
            <span className="font-semibold text-foreground">
              {currentQuantity} {unit}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
          {/* Transaction type */}
          <div className="flex flex-col gap-1.5">
            <Label>
              Type <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) =>
                    field.onChange(val as "IN" | "OUT" | "ADJUSTMENT")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex flex-col">
                          <span className="font-medium">{t.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {t.description}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Quantity */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-qty">
              Quantity <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="adj-qty"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 5"
                aria-invalid={!!errors.quantity}
                className="pr-12"
                {...register("quantity")}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {unit}
              </span>
            </div>
            {errors.quantity && (
              <p className="text-xs text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          {/* Resulting quantity preview */}
          {previewQty !== null && (
            <div
              className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-secondary/60 ${typeColors[watchedType]}`}
            >
              {watchedType === "IN" ? (
                <ArrowUpCircle className="w-4 h-4 flex-shrink-0" />
              ) : watchedType === "OUT" ? (
                <ArrowDownCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
              )}
              <span>
                New stock:{" "}
                <span className="font-semibold">
                  {previewQty} {unit}
                </span>
              </span>
            </div>
          )}

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-note">Note</Label>
            <Textarea
              id="adj-note"
              placeholder="Optional reason or note…"
              rows={2}
              {...register("note")}
            />
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
                  Saving…
                </>
              ) : (
                "Apply"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
