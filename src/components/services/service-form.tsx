"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { createService, updateService } from "@/app/actions/services";

// ── Types ──────────────────────────────────────────────────────────────────

export type ServiceFormCategory = {
  id: string;
  name: string;
  icon: string | null;
};

export interface ServiceFormProps {
  /** Provide to put the form in edit mode */
  service?: {
    id: string;
    name: string;
    categoryId: string;
    price: number;
    durationMins: number;
    active: boolean;
    isAddon: boolean;
    imageUrl: string | null;
    bufferTimeBefore: number;
    bufferTimeAfter: number;
    onlineBooking: boolean;
  };
  categories: ServiceFormCategory[];
  onSuccess?: () => void;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, "Service name is required"),
  categoryId: z.string().min(1, "Category is required"),
  price: z.number().min(0, "Price must be 0 or more"),
  durationMins: z.number().int().min(1, "Duration must be at least 1 minute"),
  active: z.boolean(),
  isAddon: z.boolean(),
  imageUrl: z.string().optional(),
  bufferTimeBefore: z.number().int().min(0),
  bufferTimeAfter: z.number().int().min(0),
  onlineBooking: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ── Component ──────────────────────────────────────────────────────────────

export function ServiceForm({ service, categories, onSuccess }: ServiceFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const isEdit = !!service;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: service?.name ?? "",
      categoryId: service?.categoryId ?? "",
      price: service?.price ?? 0,
      durationMins: service?.durationMins ?? 30,
      active: service?.active ?? true,
      isAddon: service?.isAddon ?? false,
      imageUrl: service?.imageUrl ?? "",
      bufferTimeBefore: service?.bufferTimeBefore ?? 0,
      bufferTimeAfter: service?.bufferTimeAfter ?? 0,
      onlineBooking: service?.onlineBooking ?? true,
    },
  });

  const categoryId = watch("categoryId");
  const active = watch("active");
  const isAddon = watch("isAddon");
  const onlineBooking = watch("onlineBooking");

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const payload = {
      name: values.name.trim(),
      categoryId: values.categoryId,
      price: values.price,
      durationMins: values.durationMins,
      isAddon: values.isAddon,
      imageUrl: values.imageUrl?.trim() || undefined,
      bufferTimeBefore: values.bufferTimeBefore,
      bufferTimeAfter: values.bufferTimeAfter,
      onlineBooking: values.onlineBooking,
    };

    const result = isEdit
      ? await updateService(service.id, { ...payload, active: values.active })
      : await createService(payload);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="sf-name">Service Name</Label>
        <Input
          id="sf-name"
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
        <Label htmlFor="sf-category">Category</Label>
        <Select
          value={categoryId}
          onValueChange={(val) =>
            setValue("categoryId", val ?? "", { shouldValidate: true })
          }
        >
          <SelectTrigger
            id="sf-category"
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
          </SelectContent>
        </Select>
        {errors.categoryId && (
          <p className="text-xs text-destructive">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Price */}
      <div className="space-y-1.5">
        <Label htmlFor="sf-price">Price</Label>
        <Input
          id="sf-price"
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
        <Label htmlFor="sf-duration">Duration (minutes)</Label>
        <Input
          id="sf-duration"
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

      {/* Image URL */}
      <div className="space-y-1.5">
        <Label htmlFor="sf-image">
          Image URL{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="sf-image"
          type="url"
          placeholder="https://example.com/image.jpg"
          {...register("imageUrl")}
        />
      </div>

      {/* Buffer times */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sf-buffer-before">Buffer before (min)</Label>
          <Input
            id="sf-buffer-before"
            type="number"
            min={0}
            step={5}
            placeholder="0"
            {...register("bufferTimeBefore", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-buffer-after">Buffer after (min)</Label>
          <Input
            id="sf-buffer-after"
            type="number"
            min={0}
            step={5}
            placeholder="0"
            {...register("bufferTimeAfter", { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Add-on toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium">Add-on service</p>
          <p className="text-xs text-muted-foreground">
            Can be combined with main services at booking
          </p>
        </div>
        <Switch
          checked={isAddon}
          onCheckedChange={(val) => setValue("isAddon", val, { shouldValidate: true })}
        />
      </div>

      {/* Online booking toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium">Online booking</p>
          <p className="text-xs text-muted-foreground">
            Show this service on the public booking page
          </p>
        </div>
        <Switch
          checked={onlineBooking}
          onCheckedChange={(val) => setValue("onlineBooking", val, { shouldValidate: true })}
        />
      </div>

      {/* Active toggle — only shown in edit mode */}
      {isEdit && (
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">
              Inactive services won&apos;t appear in booking
            </p>
          </div>
          <Switch
            checked={active}
            onCheckedChange={(val) => setValue("active", val, { shouldValidate: true })}
          />
        </div>
      )}

      {serverError && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {serverError}
        </p>
      )}

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          {isEdit ? "Save Changes" : "Add Service"}
        </Button>
      </div>
    </form>
  );
}
