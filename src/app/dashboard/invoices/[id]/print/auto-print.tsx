"use client";

import { useEffect } from "react";

/**
 * Triggers window.print() 500 ms after mount.
 * Rendered inside the print page so it only fires when the
 * standalone print/receipt route is visited directly.
 */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(t);
  }, []);

  return null;
}
