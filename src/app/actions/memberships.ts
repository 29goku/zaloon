"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// ── Schemas ────────────────────────────────────────────────────────────────

const createPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  price: z.number().min(0, "Price must be 0 or more"),
  sessionsPerMonth: z.number().int().min(1, "Sessions must be at least 1"),
  discountPct: z.number().min(0).max(100).default(0),
  description: z.string().optional(),
});

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  sessionsPerMonth: z.number().int().min(1).optional(),
  discountPct: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// ── createPlan ─────────────────────────────────────────────────────────────

export async function createPlan(
  data: CreatePlanInput
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createPlanSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const plan = await prisma.membershipPlan.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name: parsed.data.name,
        price: parsed.data.price,
        sessionsPerMonth: parsed.data.sessionsPerMonth,
        discountPct: parsed.data.discountPct ?? 0,
        description: parsed.data.description ?? null,
      },
    });

    revalidatePath("/dashboard/memberships");
    return { success: true, id: plan.id };
  } catch (err) {
    console.error("[createPlan]", err);
    return { success: false, error: "Failed to create plan" };
  }
}

// ── updatePlan ─────────────────────────────────────────────────────────────

export async function updatePlan(
  id: string,
  data: UpdatePlanInput
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = updatePlanSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const { name, price, sessionsPerMonth, discountPct, description, active } = parsed.data;

    await prisma.membershipPlan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(sessionsPerMonth !== undefined && { sessionsPerMonth }),
        ...(discountPct !== undefined && { discountPct }),
        ...(description !== undefined && { description: description || null }),
        ...(active !== undefined && { active }),
      },
    });

    revalidatePath("/dashboard/memberships");
    return { success: true };
  } catch (err) {
    console.error("[updatePlan]", err);
    return { success: false, error: "Failed to update plan" };
  }
}

// ── enrollClient ───────────────────────────────────────────────────────────

export async function enrollClient(
  clientId: string,
  planId: string,
  startDate: string
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!clientId || !planId || !startDate) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    const [client, plan] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }),
      prisma.membershipPlan.findUnique({ where: { id: planId }, select: { id: true, active: true } }),
    ]);

    if (!client) return { success: false, error: "Client not found" };
    if (!plan) return { success: false, error: "Plan not found" };
    if (!plan.active) return { success: false, error: "Plan is inactive" };

    const membership = await prisma.clientMembership.create({
      data: {
        id: randomUUID(),
        clientId,
        planId,
        startDate,
        status: "ACTIVE",
        sessionsUsed: 0,
      },
    });

    revalidatePath("/dashboard/memberships");
    return { success: true, id: membership.id };
  } catch (err) {
    console.error("[enrollClient]", err);
    return { success: false, error: "Failed to enroll client" };
  }
}

// ── cancelMembership ───────────────────────────────────────────────────────

export async function cancelMembership(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing membership id" };

  try {
    const today = new Date().toISOString().slice(0, 10);

    await prisma.clientMembership.update({
      where: { id },
      data: {
        status: "CANCELLED",
        endDate: today,
      },
    });

    revalidatePath("/dashboard/memberships");
    return { success: true };
  } catch (err) {
    console.error("[cancelMembership]", err);
    return { success: false, error: "Failed to cancel membership" };
  }
}

// ── getMemberships ─────────────────────────────────────────────────────────

export async function getMemberships(filter?: {
  clientId?: string;
  status?: string;
}) {
  try {
    const memberships = await prisma.clientMembership.findMany({
      where: {
        ...(filter?.clientId && { clientId: filter.clientId }),
        ...(filter?.status && { status: filter.status }),
      },
      include: {
        Client: { select: { id: true, name: true, phone: true, email: true } },
        Plan: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true as const, memberships };
  } catch (err) {
    console.error("[getMemberships]", err);
    return { success: false as const, error: "Failed to fetch memberships", memberships: [] };
  }
}

// ── assignMembership ───────────────────────────────────────────────────────
// Alias for enrollClient that auto-sets today as startDate
export async function assignMembership(
  clientId: string,
  planId: string
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!clientId || !planId) {
    return { success: false, error: "Missing clientId or planId" };
  }

  // Cancel any existing active membership first
  try {
    const existing = await prisma.clientMembership.findFirst({
      where: { clientId, status: "ACTIVE" },
      select: { id: true },
    });
    if (existing) {
      const today = new Date().toISOString().slice(0, 10);
      await prisma.clientMembership.update({
        where: { id: existing.id },
        data: { status: "CANCELLED", endDate: today },
      });
    }
  } catch {
    // non-fatal — proceed to enroll
  }

  const today = new Date().toISOString().slice(0, 10);
  return enrollClient(clientId, planId, today);
}
