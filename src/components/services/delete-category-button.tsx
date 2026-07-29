"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteCategory } from "@/app/actions/services";

interface DeleteCategoryButtonProps {
  categoryId: string;
  categoryName: string;
  serviceCount: number;
}

export function DeleteCategoryButton({
  categoryId,
  categoryName,
  serviceCount,
}: DeleteCategoryButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    const result = await deleteCategory(categoryId);
    setIsDeleting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        aria-label={`Delete ${categoryName} category`}
        title={`Delete ${categoryName}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <Dialog open={open} onOpenChange={(next) => { if (!next) setError(null); setOpen(next); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>

          {serviceCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{categoryName}</span> has{" "}
              {serviceCount} service{serviceCount !== 1 ? "s" : ""}. Delete all services in this
              category before deleting the category.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the{" "}
              <span className="font-medium text-foreground">{categoryName}</span> category? This
              cannot be undone.
            </p>
          )}

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            {serviceCount === 0 && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-1.5"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
