"use server";

import { prisma } from "@/lib/prisma";
import {
  EXPENSE_CATEGORIES,
  DEFAULT_BUDGETS,
  type ExpenseCategory,
} from "./expenses-constants";

// ── helpers ────────────────────────────────────────────────────────────────────

async function getSalonWithHours() {
  return prisma.salon.findFirst({ select: { id: true, businessHours: true, updatedAt: true } });
}

function parseBusinessHours(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    if (Array.isArray(parsed)) {
      return { __hours: parsed };
    }
  } catch {
    // ignore
  }
  return {};
}

// ── getBudgets ─────────────────────────────────────────────────────────────────

export async function getBudgets(): Promise<Record<ExpenseCategory, number>> {
  const salon = await getSalonWithHours();
  const bh = parseBusinessHours(salon?.businessHours ?? null);
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
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

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

    const existing = parseBusinessHours(salon.businessHours);
    const merged = { ...existing, __budgets: clean };

    await prisma.salon.update({
      where: { id: salon.id },
      data: {
        updatedAt: new Date(),
        businessHours: JSON.stringify(merged),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveBudgets]", err);
    return { success: false, error: "Failed to save budgets" };
  }
}
