"use server";

import { getCurrentSalonId } from "@/lib/repositories/base";
import { readSalonBlob, writeSalonBlobKey } from "@/lib/repositories/salon";
import {
  EXPENSE_CATEGORIES,
  DEFAULT_BUDGETS,
  type ExpenseCategory,
} from "./expenses-constants";

// ── getBudgets ─────────────────────────────────────────────────────────────────

export async function getBudgets(): Promise<Record<ExpenseCategory, number>> {
  const salonId = await getCurrentSalonId();
  const bh = await readSalonBlob(salonId);
  const stored = bh.__budgets as Record<string, number> | undefined;

  const result = { ...DEFAULT_BUDGETS };
  if (stored && typeof stored === "object") {
    for (const cat of EXPENSE_CATEGORIES) {
      if (typeof stored[cat] === "number" && stored[cat] >= 0) {
        result[cat] = stored[cat];
      }
    }
  }
  return result;
}

// ── updateBudgets (alias for components) ──────────────────────────────────────

export async function updateBudgets(
  budgets: Record<string, number>
): Promise<{ success: boolean; error?: string }> {
  return saveBudgets(budgets);
}

// ── saveBudgets ────────────────────────────────────────────────────────────────

export async function saveBudgets(
  data: Record<string, number>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const salonId = await getCurrentSalonId();

    // Validate: only known categories, non-negative numbers
    const clean: Record<string, number> = {};
    for (const cat of EXPENSE_CATEGORIES) {
      const val = data[cat];
      if (typeof val === "number" && isFinite(val) && val >= 0) {
        clean[cat] = val;
      } else {
        clean[cat] = DEFAULT_BUDGETS[cat];
      }
    }

    await writeSalonBlobKey(salonId, "__budgets", clean);

    return { success: true };
  } catch (err) {
    console.error("[saveBudgets]", err);
    return { success: false, error: "Failed to save budgets" };
  }
}
