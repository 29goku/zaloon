"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Loader2 } from "lucide-react";

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
import { createInventoryItem, updateInventoryItem } from "@/app/actions/inventory";
import { RETAIL_CATEGORY } from "@/lib/inventory-types";

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "HAIR_PRODUCTS", label: "Hair Products" },
  { value: "COLOR", label: "Color" },
  { value: "TOOLS", label: "Tools" },
  { value: "RETAIL", label: "Retail" },
  { value: "CONSUMABLES", label: "Consumables" },
  { value: "OTHER", label: "Other" },
] as const;

const UNITS = [
  "pcs",
  "ml",
  "g",
  "bottle",
  "box",
  "set",
  "pair",
  "tube",
  "sachet",
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

// ── Schema ─────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum([
    "HAIR_PRODUCTS",
    "COLOR",
    "TOOLS",
    "RETAIL",
    "CONSUMABLES",
    "OTHER",
  ]),
  isRetail: z.boolean(),
  sku: z.string().optional(),
  quantity: z
    .string()
    .refine((v) => !isNaN(parseInt(v)) && parseInt(v) >= 0, {
      message: "Quantity must be 0 or more",
    }),
  unit: z.string().min(1, "Unit is required"),
  minQuantity: z
    .string()
    .refine((v) => !isNaN(parseInt(v)) && parseInt(v) >= 0, {
      message: "Min quantity must be 0 or more",
    }),
  costPrice: z.string().optional(),
  salePrice: z.string().optional(),
  supplier: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ── Props ──────────────────────────────────────────────────────────────────────

interface InventoryItemFormProps {
  /** When provided, the dialog operates in edit mode */
  item?: {
    id: string;
    name: string;
    category: string;
    sku?: string | null;
    quantity: number;
    unit: string;
    minQuantity: number;
    costPrice?: number | null;
    salePrice?: number | null;
    supplier?: string | null;
  };
  /** Override the trigger (defaults to an "Add Item" or pencil-icon button) */
  trigger?: React.ReactNode;
  /** Pre-set isRetail when opening "Add" from the Retail tab */
  defaultIsRetail?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function InventoryItemForm({ item, trigger, defaultIsRetail }: InventoryItemFormProps) {
  const isEdit = !!item;
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const itemIsRetail = item ? item.category === RETAIL_CATEGORY : (defaultIsRetail ?? false);

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
    defaultValues: {
      name: item?.name ?? "",
      category: (item?.category as CategoryValue) ?? (defaultIsRetail ? "RETAIL" : undefined),
      isRetail: itemIsRetail,
      sku: item?.sku ?? "",
      quantity: String(item?.quantity ?? 0),
      unit: item?.unit ?? "pcs",
      minQuantity: String(item?.minQuantity ?? 0),
      costPrice: item?.costPrice != null ? String(item.costPrice) : "",
      salePrice: item?.salePrice != null ? String(item.salePrice) : "",
      supplier: item?.supplier ?? "",
    },
  });

  const watchedIsRetail = watch("isRetail");

  // When isRetail is toggled on, auto-set category to RETAIL
  React.useEffect(() => {
    if (watchedIsRetail) {
      setValue("category", "RETAIL");
    }
  }, [watchedIsRetail, setValue]);

  async function onSubmit(values: FormValues) {
    setServerError(null);

    // isRetail maps to category=RETAIL (schema migration note: will use isRetail field later)
    const effectiveCategory = values.isRetail ? RETAIL_CATEGORY : values.category;

    const payload = {
      name: values.name,
      category: effectiveCategory,
      sku: values.sku || undefined,
      quantity: parseInt(values.quantity),
      unit: values.unit,
      minQuantity: parseInt(values.minQuantity),
      costPrice:
        values.costPrice && values.costPrice !== ""
          ? parseFloat(values.costPrice)
          : null,
      salePrice:
        values.salePrice && values.salePrice !== ""
          ? parseFloat(values.salePrice)
          : null,
      supplier: values.supplier || null,
    };

    let result: { success: true; id?: string } | { success: false; error: string };

    if (isEdit && item) {
      result = await updateInventoryItem(item.id, payload);
    } else {
      result = await createInventoryItem(payload);
    }

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

  const defaultTrigger = isEdit ? (
    <Button
      variant="ghost"
      size="icon-xs"
      title="Edit item"
      onClick={() => setOpen(true)}
    >
      <Pencil className="w-3.5 h-3.5" />
    </Button>
  ) : (
    <Button
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
      onClick={() => setOpen(true)}
    >
      <Plus className="w-4 h-4" />
      Add Item
    </Button>
  );

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
          {trigger}
        </span>
      ) : (
        defaultTrigger
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Inventory Item" : "Add Inventory Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="inv-name"
              placeholder="e.g. Olaplex No. 3"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Label>
              Category <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(val) => field.onChange(val)}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.category}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            )}
          </div>

          {/* Is Retail toggle */}
          <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
            <Controller
              name="isRetail"
              control={control}
              render={({ field }) => (
                <input
                  id="inv-is-retail"
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
              )}
            />
            <div className="flex flex-col">
              <Label htmlFor="inv-is-retail" className="cursor-pointer font-medium">
                Retail Product
              </Label>
              <p className="text-xs text-muted-foreground">
                Mark as a product sold directly to clients
              </p>
            </div>
          </div>

          {/* SKU / Barcode */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-sku">SKU / Barcode</Label>
            <Input
              id="inv-sku"
              placeholder="e.g. OLP-003 or barcode"
              {...register("sku")}
            />
          </div>

          {/* Quantity + Unit row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-qty">
                {isEdit ? "Quantity" : "Initial Quantity"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv-qty"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                aria-invalid={!!errors.quantity}
                {...register("quantity")}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Unit <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(val)}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!errors.unit}>
                      <SelectValue placeholder="pcs" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Min quantity threshold */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-min-qty">
              Low Stock Threshold <span className="text-destructive">*</span>
            </Label>
            <Input
              id="inv-min-qty"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              aria-invalid={!!errors.minQuantity}
              {...register("minQuantity")}
            />
            {errors.minQuantity && (
              <p className="text-xs text-destructive">
                {errors.minQuantity.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Alert when quantity falls to or below this number
            </p>
          </div>

          {/* Cost price + Sale price row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-cost">Cost Price</Label>
              <Input
                id="inv-cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("costPrice")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-sale">
                {watchedIsRetail ? "Retail Price" : "Sale Price"}
              </Label>
              <Input
                id="inv-sale"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("salePrice")}
              />
            </div>
          </div>

          {/* Supplier */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-supplier">Supplier</Label>
            <Input
              id="inv-supplier"
              placeholder="e.g. Salon Centric"
              {...register("supplier")}
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
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Add Item"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
