"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "./expenses-constants";
export type { ExpenseCategory, PaymentMethod } from "./expenses-constants";

// ── Zod schemas ────────────────────────────────────────────────────────────────

const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  subcategory: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  receipt: z.string().optional(),
  vendor: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).default("CASH"),
  isRecurring: z.boolean().default(false),
  recurringDay: z.number().int().min(1).max(31).optional().nullable(),
  notes: z.string().optional(),
});

const updateExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  subcategory: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required").optional(),
  amount: z.number().positive("Amount must be greater than 0").optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  receipt: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().int().min(1).max(31).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ── createExpense ──────────────────────────────────────────────────────────────

export async function createExpense(data: {
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  date: string;
  receipt?: string;
  vendor?: string;
  paymentMethod?: string;
  isRecurring?: boolean;
  recurringDay?: number | null;
  notes?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createExpenseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const expense = await prisma.expense.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        category: parsed.data.category,
        subcategory: parsed.data.subcategory ?? null,
        description: parsed.data.description,
        amount: parsed.data.amount,
        date: parsed.data.date,
        receipt: parsed.data.receipt ?? null,
        vendor: parsed.data.vendor ?? null,
        paymentMethod: parsed.data.paymentMethod,
        isRecurring: parsed.data.isRecurring,
        recurringDay: parsed.data.recurringDay ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    return { success: true, id: expense.id };
  } catch (err) {
    console.error("[createExpense]", err);
    return { success: false, error: "Failed to create expense" };
  }
}

// ── updateExpense ──────────────────────────────────────────────────────────────

export async function updateExpense(
  id: string,
  data: {
    category?: string;
    subcategory?: string | null;
    description?: string;
    amount?: number;
    date?: string;
    receipt?: string | null;
    vendor?: string | null;
    paymentMethod?: string;
    isRecurring?: boolean;
    recurringDay?: number | null;
    notes?: string | null;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  const parsed = updateExpenseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Expense not found" };

    await prisma.expense.update({
      where: { id },
      data: {
        ...(parsed.data.category !== undefined && { category: parsed.data.category }),
        ...(parsed.data.subcategory !== undefined && { subcategory: parsed.data.subcategory }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.amount !== undefined && { amount: parsed.data.amount }),
        ...(parsed.data.date !== undefined && { date: parsed.data.date }),
        ...(parsed.data.receipt !== undefined && { receipt: parsed.data.receipt }),
        ...(parsed.data.vendor !== undefined && { vendor: parsed.data.vendor }),
        ...(parsed.data.paymentMethod !== undefined && { paymentMethod: parsed.data.paymentMethod }),
        ...(parsed.data.isRecurring !== undefined && { isRecurring: parsed.data.isRecurring }),
        ...(parsed.data.recurringDay !== undefined && { recurringDay: parsed.data.recurringDay }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[updateExpense]", err);
    return { success: false, error: "Failed to update expense" };
  }
}

// ── deleteExpense ──────────────────────────────────────────────────────────────

export async function deleteExpense(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Expense not found" };

    await prisma.expense.delete({ where: { id } });

    return { success: true };
  } catch (err) {
    console.error("[deleteExpense]", err);
    return { success: false, error: "Failed to delete expense" };
  }
}

// ── getExpenses ────────────────────────────────────────────────────────────────

export async function getExpenses(filter?: {
  category?: string;
  from?: string;
  to?: string;
}) {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return [];

    const expenses = await prisma.expense.findMany({
      where: {
        salonId: salon.id,
        ...(filter?.category && filter.category !== "ALL" && {
          category: filter.category,
        }),
        ...(filter?.from && filter?.to && {
          date: { gte: filter.from, lte: filter.to },
        }),
        ...(filter?.from && !filter?.to && { date: { gte: filter.from } }),
        ...(!filter?.from && filter?.to && { date: { lte: filter.to } }),
      },
      orderBy: { date: "desc" },
    });

    return expenses;
  } catch (err) {
    console.error("[getExpenses]", err);
    return [];
  }
}

// ── getRecurringExpenses ───────────────────────────────────────────────────────

export async function getRecurringExpenses() {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return [];

    const expenses = await prisma.expense.findMany({
      where: {
        salonId: salon.id,
        isRecurring: true,
      },
      orderBy: { recurringDay: "asc" },
    });

    return expenses;
  } catch (err) {
    console.error("[getRecurringExpenses]", err);
    return [];
  }
}
