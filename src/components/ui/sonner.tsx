"use client"

/**
 * sonner.tsx — simple toast notification system
 *
 * Usage:
 *   import { toast } from "@/components/ui/sonner"
 *   toast.success("Saved!")
 *   toast.error("Something went wrong")
 *   toast.info("Did you know…")
 *
 * Render <Toaster /> once in your layout (already added to dashboard/layout.tsx).
 * This module re-exports the full base-ui toast stack with a simple API on top.
 */

import {
  toast as baseToast,
  Toaster,
  createToastManager,
  useToastManager,
} from "@/components/ui/toast"

// Convenience wrappers matching the sonner API surface
const toast = {
  success: (message: string, description?: string) =>
    baseToast.add({ title: message, description, type: "success" }),

  error: (message: string, description?: string) =>
    baseToast.add({ title: message, description, type: "error" }),

  info: (message: string, description?: string) =>
    baseToast.add({ title: message, description, type: "info" }),

  warning: (message: string, description?: string) =>
    baseToast.add({ title: message, description, type: "warning" }),

  loading: (message: string, description?: string) =>
    baseToast.add({ title: message, description, type: "loading" }),

  /** Generic — pass any options supported by base-ui toast */
  message: (message: string, description?: string) =>
    baseToast.add({ title: message, description }),
}

export { toast, Toaster, createToastManager, useToastManager }
