"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FolderPlus, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createCategory } from "@/app/actions/services";

// ── Suggested emoji list ───────────────────────────────────────────────────

const EMOJI_SUGGESTIONS = [
  "✂️", "💅", "💆", "🧖", "💇", "🪮", "💄", "💋", "🧴", "🌸",
  "🎨", "💎", "🌿", "✨", "🔥", "🌺", "🪷", "🧸", "🫧", "🪞",
];

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Component ──────────────────────────────────────────────────────────────

export function AddCategoryDialog() {
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
    resolver: zodResolver(schema),
    defaultValues: { name: "", icon: "" },
  });

  const iconValue = watch("icon");

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createCategory({
      name: values.name.trim(),
      icon: values.icon?.trim() || undefined,
    });

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
    reset();
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
          <Button
            variant="outline"
            className="flex items-center gap-2"
          />
        }
      >
        <FolderPlus className="w-4 h-4" />
        Add Category
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Category name */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Category Name</Label>
            <Input
              id="cat-name"
              placeholder="e.g. Hair Services"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Icon */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-icon">
              Icon{" "}
              <span className="text-muted-foreground font-normal">(emoji, optional)</span>
            </Label>
            <Input
              id="cat-icon"
              placeholder="✂️"
              maxLength={4}
              className="w-20"
              {...register("icon")}
            />

            {/* Emoji quick-pick */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {EMOJI_SUGGESTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setValue("icon", emoji, { shouldValidate: false })}
                  className={[
                    "flex items-center justify-center w-8 h-8 rounded-lg text-base transition-colors",
                    iconValue === emoji
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "hover:bg-muted",
                  ].join(" ")}
                  aria-label={`Select ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {serverError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Add Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
