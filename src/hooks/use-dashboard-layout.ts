"use client"

import { useState, useEffect } from "react"
import { WIDGETS, WidgetId } from "@/components/dashboard/widget-registry"

const STORAGE_KEY = "zaloon:dashboard-layout"

function buildDefaults(): Record<WidgetId, boolean> {
  return Object.fromEntries(
    Object.entries(WIDGETS).map(([id, cfg]) => [id, cfg.defaultVisible])
  ) as Record<WidgetId, boolean>
}

export function useDashboardLayout() {
  const [visible, setVisible] = useState<Record<WidgetId, boolean>>(buildDefaults)

  // Load saved layout from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Record<WidgetId, boolean>>
        // Merge stored values with defaults so newly added widgets get their default
        setVisible((prev) => {
          const merged = { ...prev }
          for (const id of Object.keys(WIDGETS) as WidgetId[]) {
            if (id in parsed) {
              merged[id] = parsed[id]!
            }
          }
          return merged
        })
      }
    } catch {
      // Ignore malformed localStorage data
    }
  }, [])

  function toggleWidget(id: WidgetId) {
    setVisible((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore quota errors
      }
      return next
    })
  }

  function resetLayout() {
    const defaults = buildDefaults()
    setVisible(defaults)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }

  return { visible, toggleWidget, resetLayout }
}
