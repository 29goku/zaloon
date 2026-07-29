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

export async function createMembershipPlan(...args: Parameters<typeof createPlan>) {
  return createPlan(...args);
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

export async function updateMembershipPlan(...args: Parameters<typeof updatePlan>) {
  return updatePlan(...args);
}

// ── deletePlan ─────────────────────────────────────────────────────────────

export async function deletePlan(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing plan id" };

  try {
    // Check no active memberships reference this plan
    const activeMemberships = await prisma.clientMembership.count({
      where: { planId: id, status: "ACTIVE" },
    });
    if (activeMemberships > 0) {
      return {
        success: false,
        error: `Cannot delete: ${activeMemberships} active membership(s) use this plan. Deactivate the plan instead.`,
      };
    }

    await prisma.membershipPlan.delete({ where: { id } });
    revalidatePath("/dashboard/memberships");
    return { success: true };
  } catch (err) {
    console.error("[deletePlan]", err);
    return { success: false, error: "Failed to delete plan" };
  }
}

export async function deleteMembershipPlan(...args: Parameters<typeof deletePlan>) {
  return deletePlan(...args);
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

    // Calculate end date: start date + 1 month
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const endDate = end.toISOString().slice(0, 10);

    const membership = await prisma.clientMembership.create({
      data: {
        id: randomUUID(),
        clientId,
        planId,
        startDate,
        endDate,
        status: "ACTIVE",
        sessionsUsed: 0,
      },
    });

    revalidatePath("/dashboard/memberships");
    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true, id: membership.id };
  } catch (err) {
    console.error("[enrollClient]", err);
    return { success: false, error: "Failed to enroll client" };
  }
}

// Alias for task-specified name
export async function enrollClientInPlan(
  clientId: string,
  planId: string,
  startDate: string
): Promise<{ success: boolean; membershipId?: string; error?: string }> {
  const res = await enrollClient(clientId, planId, startDate);
  if (res.success) return { success: true, membershipId: res.id };
  return { success: false, error: res.error };
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

// ── renewMembership ────────────────────────────────────────────────────────
// Extends endDate by 1 month, resets sessionsUsed to 0, creates an Invoice.

export async function renewMembership(
  membershipId: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  if (!membershipId) return { success: false, error: "Missing membership id" };

  try {
    const membership = await prisma.clientMembership.findUnique({
      where: { id: membershipId },
      include: {
        Plan: true,
        Client: { select: { id: true } },
      },
    });

    if (!membership) return { success: false, error: "Membership not found" };
    if (membership.status !== "ACTIVE") {
      return { success: false, error: "Only active memberships can be renewed" };
    }

    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    // Extend end date by 1 month from current endDate (or today if not set)
    const baseDate = membership.endDate
      ? new Date(membership.endDate)
      : new Date();
    const newEnd = new Date(baseDate);
    newEnd.setMonth(newEnd.getMonth() + 1);
    const newEndDate = newEnd.toISOString().slice(0, 10);

    const invoiceId = randomUUID();

    await Promise.all([
      prisma.clientMembership.update({
        where: { id: membershipId },
        data: {
          endDate: newEndDate,
          sessionsUsed: 0,
        },
      }),
      prisma.invoice.create({
        data: {
          id: invoiceId,
          salonId: salon.id,
          clientId: membership.clientId,
          total: membership.Plan.price,
          discount: 0,
          paymentMethod: "CASH",
          status: "PAID",
          isRecurring: true,
          note: `Membership renewal — ${membership.Plan.name}`,
          paidAt: new Date(),
          InvoiceItem: {
            create: {
              id: randomUUID(),
              name: `${membership.Plan.name} — Monthly Membership`,
              price: membership.Plan.price,
              qty: 1,
            },
          },
        },
      }),
    ]);

    revalidatePath("/dashboard/memberships");
    revalidatePath(`/dashboard/clients/${membership.clientId}`);
    return { success: true, invoiceId };
  } catch (err) {
    console.error("[renewMembership]", err);
    return { success: false, error: "Failed to renew membership" };
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

// ── getMembershipStats ─────────────────────────────────────────────────────

export async function getMembershipStats(): Promise<{
  activeCount: number;
  monthlyRevenue: number;
  expiringThisWeek: number;
  sessionsUsedThisMonth: number;
}> {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);

    const [activeMemberships, expiringMemberships] = await Promise.all([
      prisma.clientMembership.findMany({
        where: { status: "ACTIVE" },
        include: { Plan: { select: { price: true } } },
      }),
      prisma.clientMembership.findMany({
        where: {
          status: "ACTIVE",
          endDate: { gte: todayStr, lte: sevenDaysLater },
        },
      }),
    ]);

    const activeCount = activeMemberships.length;
    const monthlyRevenue = activeMemberships.reduce((sum, m) => sum + m.Plan.price, 0);
    const expiringThisWeek = expiringMemberships.length;

    // sessionsUsed this month = sum of sessionsUsed for memberships that started this month
    // or that are currently active (sessionsUsed resets on renewal)
    const sessionsUsedThisMonth = activeMemberships.reduce(
      (sum, m) => sum + m.sessionsUsed,
      0
    );

    return { activeCount, monthlyRevenue, expiringThisWeek, sessionsUsedThisMonth };
  } catch (err) {
    console.error("[getMembershipStats]", err);
    return { activeCount: 0, monthlyRevenue: 0, expiringThisWeek: 0, sessionsUsedThisMonth: 0 };
  }
}

// ── redeemMembershipSession ────────────────────────────────────────────────

export async function redeemMembershipSession(membershipId: string): Promise<{
  success: boolean;
  sessionsRemaining?: number;
  error?: string;
}> {
  if (!membershipId) return { success: false, error: "Missing membership id" };

  try {
    const membership = await prisma.clientMembership.findUnique({
      where: { id: membershipId },
      include: { Plan: { select: { sessionsPerMonth: true } } },
    });

    if (!membership) return { success: false, error: "Membership not found" };
    if (membership.status !== "ACTIVE") {
      return { success: false, error: "Membership is not active" };
    }

    const remaining = membership.Plan.sessionsPerMonth - membership.sessionsUsed;
    if (remaining <= 0) {
      return {
        success: false,
        error: "No sessions remaining this month",
        sessionsRemaining: 0,
      };
    }

    const updated = await prisma.clientMembership.update({
      where: { id: membershipId },
      data: { sessionsUsed: { increment: 1 } },
    });

    revalidatePath("/dashboard/memberships");
    revalidatePath(`/dashboard/clients/${membership.clientId}`);

    return {
      success: true,
      sessionsRemaining: membership.Plan.sessionsPerMonth - updated.sessionsUsed,
    };
  } catch (err) {
    console.error("[redeemMembershipSession]", err);
    return { success: false, error: "Failed to redeem session" };
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
