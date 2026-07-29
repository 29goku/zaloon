"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addBranch } from "@/app/actions/settings";

const schema = z.object({
  name: z.string().min(1, "Branch name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function AddBranchForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      address: "",
      city: "",
      phone: "",
    },
  });

  const nameValue = watch("name");

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setValue("name", val);
    setValue("slug", toSlug(val), { shouldValidate: true });
  }

  async function onSubmit(data: FormData) {
    setServerError(null);
    const result = await addBranch(data);
    // If result comes back (redirect throws, so only errors return here)
    if (!result.success) {
      setServerError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="branch-name">Branch Name *</Label>
        <Input
          id="branch-name"
          placeholder="e.g. Downtown Branch"
          {...register("name")}
          onChange={handleNameChange}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <Label htmlFor="branch-slug">URL Slug *</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">/book/</span>
          <Input
            id="branch-slug"
            placeholder="downtown-branch"
            {...register("slug")}
            aria-invalid={!!errors.slug}
          />
        </div>
        {errors.slug ? (
          <p className="text-xs text-destructive">{errors.slug.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Auto-generated from name. Used in your booking link.
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="branch-phone">Phone</Label>
        <Input
          id="branch-phone"
          type="tel"
          placeholder="+1 (555) 000-0000"
          {...register("phone")}
        />
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="branch-address">Address</Label>
        <Input
          id="branch-address"
          placeholder="123 Main St"
          {...register("address")}
        />
      </div>

      {/* City */}
      <div className="space-y-1.5">
        <Label htmlFor="branch-city">City</Label>
        <Input
          id="branch-city"
          placeholder="New York"
          {...register("city")}
        />
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating branch…
            </>
          ) : (
            "Create Branch"
          )}
        </Button>
      </div>
    </form>
  );
}
