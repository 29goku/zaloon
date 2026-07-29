"use client";

import { toast, Toaster, createToastManager, useToastManager } from "@/components/ui/toast";

export { Toaster, createToastManager, useToastManager };

export function useToast() {
  return {
    toast: (opts: {
      title: string;
      description?: string;
      type?: "success" | "error" | "info" | "warning" | "loading";
    }) => {
      toast.add({
        title: opts.title,
        description: opts.description,
        type: opts.type ?? "info",
      });
    },
    success: (title: string, description?: string) => {
      toast.add({ title, description, type: "success" });
    },
    error: (title: string, description?: string) => {
      toast.add({ title, description, type: "error" });
    },
  };
}
