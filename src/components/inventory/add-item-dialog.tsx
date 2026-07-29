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
import { createItem } from "@/app/actions/inventory";

const CATEGORIES = [
  { value: "HAIR_PRODUCTS", label: "Hair Products" },
  { value: "COLOR", label: "Color" },
  { value: "TOOLS", label: "Tools" },
  { value: "RETAIL", label: "Retail" },
  { value: "CONSUMABLES", label: "Consumables" },
  { value: "OTHER", label: "Other" },
] as const;

const UNITS = ["pcs", "ml", "g", "bottle", "box", "set", "pair", "tube", "sachet"] as const;

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

export function AddItemDialog() {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: undefined,
      sku: "",
      quantity: "0",
      unit: "pcs",
      minQuantity: "0",
      costPrice: "",
      salePrice: "",
      supplier: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createItem({
      name: values.name,
      category: values.category,
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
        Add Item
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
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

          {/* SKU */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-sku">SKU</Label>
            <Input
              id="inv-sku"
              placeholder="e.g. OLP-003"
              {...register("sku")}
            />
          </div>

          {/* Quantity + Unit row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-qty">
                Initial Quantity <span className="text-destructive">*</span>
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
              <p className="text-xs text-destructive">{errors.minQuantity.message}</p>
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
              <Label htmlFor="inv-sale">Sale Price</Label>
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
              ) : (
                "Add Item"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
