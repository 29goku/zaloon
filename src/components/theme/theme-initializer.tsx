"use client";

import { useEffect } from "react";

/**
 * Runs on mount and re-applies persisted theme preset + compact mode
 * to the document root so the CSS custom properties take effect.
 * Must be rendered inside ThemeProvider (client boundary).
 */
export function ThemeInitializer() {
  useEffect(() => {
    // Apply brand color preset
    const preset = localStorage.getItem("zaloon:theme-preset");
    if (preset) {
      try {
        const { light, dark } = JSON.parse(preset) as {
          light: string;
          dark: string;
        };
        const isDark = document.documentElement.classList.contains("dark");
        document.documentElement.style.setProperty(
          "--primary",
          isDark ? dark : light
        );
      } catch {
        // ignore malformed value
      }
    }

    // Apply compact mode
    const compact = localStorage.getItem("zaloon:compact");
    if (compact === "true") {
      document.documentElement.setAttribute("data-compact", "true");
    }
  }, []);

  return null;
}
