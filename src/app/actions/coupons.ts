"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentSalonId } from "@/lib/repositories/base";

// ── Zod schemas ────────────────────────────────────────────────────────────────

const COUPON_TYPES = ["PERCENTAGE", "FIXED"] as const;

const createCouponSchema = z.object({
  code: z.string().min(1, "Code is required").max(50).transform((v) => v.toUpperCase()),
  type: z.enum(COUPON_TYPES, { error: "Type is required" }),
  value: z.number().positive("Value must be greater than 0"),
  minOrderAmt: z.number().min(0).default(0),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry must be YYYY-MM-DD")
    .nullable()
    .optional(),
  active: z.boolean().default(true),
});

const updateCouponSchema = z.object({
  code: z.string().min(1).max(50).transform((v) => v.toUpperCase()).optional(),
  type: z.enum(COUPON_TYPES).optional(),
  value: z.number().positive().optional(),
  minOrderAmt: z.number().min(0).optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  active: z.boolean().optional(),
});

// ── createCoupon ───────────────────────────────────────────────────────────────

export async function createCoupon(data: {
  code: string;
  type: string;
  value: number;
  minOrderAmt?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  active?: boolean;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createCouponSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salonId = await getCurrentSalonId();

    // Check for duplicate code within this salon
    const existing = await prisma.coupon.findFirst({
      where: { salonId, code: parsed.data.code },
    });
    if (existing) {
      return { success: false, error: "A coupon with this code already exists" };
    }

    const coupon = await prisma.coupon.create({
      data: {
        id: randomUUID(),
        salonId,
        code: parsed.data.code,
        type: parsed.data.type,
        value: parsed.data.value,
        minOrderAmt: parsed.data.minOrderAmt ?? 0,
        maxUses: parsed.data.maxUses ?? null,
        expiresAt: parsed.data.expiresAt ?? null,
        active: parsed.data.active ?? true,
      },
    });

    return { success: true, id: coupon.id };
  } catch (err) {
    console.error("[createCoupon]", err);
    return { success: false, error: "Failed to create coupon" };
  }
}

// ── updateCoupon ───────────────────────────────────────────────────────────────

export async function updateCoupon(
  id: string,
  data: {
    code?: string;
    type?: string;
    value?: number;
    minOrderAmt?: number;
    maxUses?: number | null;
    expiresAt?: string | null;
    active?: boolean;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  const parsed = updateCouponSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Coupon not found" };

    // If code is changing, check for conflicts
    if (parsed.data.code && parsed.data.code !== existing.code) {
      const conflict = await prisma.coupon.findFirst({
        where: { salonId: existing.salonId, code: parsed.data.code, id: { not: id } },
      });
      if (conflict) {
        return { success: false, error: "A coupon with this code already exists" };
      }
    }

    await prisma.coupon.update({
      where: { id },
      data: {
        ...(parsed.data.code !== undefined && { code: parsed.data.code }),
        ...(parsed.data.type !== undefined && { type: parsed.data.type }),
        ...(parsed.data.value !== undefined && { value: parsed.data.value }),
        ...(parsed.data.minOrderAmt !== undefined && { minOrderAmt: parsed.data.minOrderAmt }),
        ...(parsed.data.maxUses !== undefined && { maxUses: parsed.data.maxUses }),
        ...(parsed.data.expiresAt !== undefined && { expiresAt: parsed.data.expiresAt }),
        ...(parsed.data.active !== undefined && { active: parsed.data.active }),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[updateCoupon]", err);
    return { success: false, error: "Failed to update coupon" };
  }
}

// ── deleteCoupon ───────────────────────────────────────────────────────────────

export async function deleteCoupon(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  try {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Coupon not found" };

    await prisma.coupon.delete({ where: { id } });

    return { success: true };
  } catch (err) {
    console.error("[deleteCoupon]", err);
    return { success: false, error: "Failed to delete coupon" };
  }
}

// ── toggleCouponActive ─────────────────────────────────────────────────────────

export async function toggleCouponActive(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  try {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return { success: false, error: "Coupon not found" };

    await prisma.coupon.update({
      where: { id },
      data: { active: !coupon.active },
    });

    return { success: true };
  } catch (err) {
    console.error("[toggleCouponActive]", err);
    return { success: false, error: "Failed to toggle coupon" };
  }
}

// ── validateCoupon ─────────────────────────────────────────────────────────────

export async function validateCoupon(
  code: string,
  orderAmount: number
): Promise<{
  valid: boolean;
  discount: number;
  coupon?: {
    id: string;
    code: string;
    type: string;
    value: number;
  };
  error?: string;
}> {
  if (!code) return { valid: false, discount: 0, error: "Code is required" };

  try {
    const salonId = await getCurrentSalonId();

    const coupon = await prisma.coupon.findFirst({
      where: { salonId, code: code.toUpperCase() },
    });

    if (!coupon) return { valid: false, discount: 0, error: "Coupon not found" };
    if (!coupon.active) return { valid: false, discount: 0, error: "Coupon is inactive" };

    // Check expiry
    if (coupon.expiresAt) {
      const today = new Date().toISOString().split("T")[0];
      if (today > coupon.expiresAt) {
        return { valid: false, discount: 0, error: "Coupon has expired" };
      }
    }

    // Check usage limit
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, discount: 0, error: "Coupon usage limit reached" };
    }

    // Check minimum order amount
    if (orderAmount < coupon.minOrderAmt) {
      return {
        valid: false,
        discount: 0,
        error: `Minimum order amount of ${coupon.minOrderAmt} required`,
      };
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === "PERCENTAGE") {
      discount = (orderAmount * coupon.value) / 100;
    } else {
      // FIXED
      discount = Math.min(coupon.value, orderAmount);
    }

    return {
      valid: true,
      discount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
    };
  } catch (err) {
    console.error("[validateCoupon]", err);
    return { valid: false, discount: 0, error: "Failed to validate coupon" };
  }
}

// ── applyCoupon ────────────────────────────────────────────────────────────────

export async function applyCoupon(
  code: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!code) return { success: false, error: "Code is required" };

  try {
    const salonId = await getCurrentSalonId();

    const coupon = await prisma.coupon.findFirst({
      where: { salonId, code: code.toUpperCase() },
    });

    if (!coupon) return { success: false, error: "Coupon not found" };

    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });

    return { success: true };
  } catch (err) {
    console.error("[applyCoupon]", err);
    return { success: false, error: "Failed to apply coupon" };
  }
}

// ── getCoupons ─────────────────────────────────────────────────────────────────

export async function getCoupons() {
  try {
    const salonId = await getCurrentSalonId();

    return prisma.coupon.findMany({
      where: { salonId },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[getCoupons]", err);
    return [];
  }
}
