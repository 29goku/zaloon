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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createCategory, createService } from "@/app/actions/services";

// ── Types ──────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  icon: string | null;
};

interface AddServiceDialogProps {
  categories: Category[];
  /** When true the dialog pre-checks the "Add-on service" toggle */
  defaultAddon?: boolean;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const NEW_CATEGORY_VALUE = "__new__";

const formSchema = z
  .object({
    name: z.string().min(1, "Service name is required"),
    categoryId: z.string().min(1, "Category is required"),
    newCategoryName: z.string().optional(),
    newCategoryIcon: z.string().optional(),
    price: z.number().min(0, "Price must be 0 or more"),
    durationMins: z.number().int().min(1, "Duration must be at least 1 minute"),
  })
  .superRefine((val, ctx) => {
    if (val.categoryId === NEW_CATEGORY_VALUE) {
      if (!val.newCategoryName || val.newCategoryName.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Category name is required",
          path: ["newCategoryName"],
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

// ── Component ──────────────────────────────────────────────────────────────

export function AddServiceDialog({ categories, defaultAddon = false }: AddServiceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      newCategoryName: "",
      newCategoryIcon: "",
      price: 0,
      durationMins: 30,
    },
  });

  const categoryId = watch("categoryId");
  const isNewCategory = categoryId === NEW_CATEGORY_VALUE;

  async function onSubmit(values: FormValues) {
    setServerError(null);

    try {
      let resolvedCategoryId = values.categoryId;

      // Create category first if "new category" was selected
      if (values.categoryId === NEW_CATEGORY_VALUE) {
        const catResult = await createCategory({
          name: values.newCategoryName!.trim(),
          icon: values.newCategoryIcon?.trim() || undefined,
        });

        if (!catResult.success) {
          setServerError(catResult.error);
          return;
        }

        resolvedCategoryId = catResult.id;
      }

      const svcResult = await createService({
        name: values.name.trim(),
        categoryId: resolvedCategoryId,
        price: values.price,
        durationMins: values.durationMins,
        isAddon: defaultAddon || undefined,
      });

      if (!svcResult.success) {
        setServerError(svcResult.error);
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
        Add Service
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Service Name */}
          <div className="space-y-1.5">
            <Label htmlFor="svc-name">Service Name</Label>
            <Input
              id="svc-name"
              placeholder="e.g. Haircut"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="svc-category">Category</Label>
            <Select
              value={categoryId}
              onValueChange={(val) => setValue("categoryId", val ?? "", { shouldValidate: true })}
            >
              <SelectTrigger
                id="svc-category"
                className="w-full"
                aria-invalid={!!errors.categoryId}
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ""}
                    {cat.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_CATEGORY_VALUE}>
                  + New category
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          {/* New category fields (revealed when "New category" is selected) */}
          {isNewCategory && (
            <div className="space-y-3 pl-3 border-l-2 border-border">
              <div className="space-y-1.5">
                <Label htmlFor="new-cat-name">Category Name</Label>
                <Input
                  id="new-cat-name"
                  placeholder="e.g. Hair"
                  aria-invalid={!!errors.newCategoryName}
                  {...register("newCategoryName")}
                />
                {errors.newCategoryName && (
                  <p className="text-xs text-destructive">
                    {errors.newCategoryName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-cat-icon">
                  Icon <span className="text-muted-foreground font-normal">(emoji, optional)</span>
                </Label>
                <Input
                  id="new-cat-icon"
                  placeholder="✂️"
                  maxLength={4}
                  {...register("newCategoryIcon")}
                />
              </div>
            </div>
          )}

          {/* Price */}
          <div className="space-y-1.5">
            <Label htmlFor="svc-price">Price</Label>
            <Input
              id="svc-price"
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

          {/* Duration */}
          <div className="space-y-1.5">
            <Label htmlFor="svc-duration">Duration (minutes)</Label>
            <Input
              id="svc-duration"
              type="number"
              min={1}
              step={1}
              placeholder="30"
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
              Add Service
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
