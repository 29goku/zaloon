"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// ── Zod schemas ────────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES = ["BIRTHDAY", "WIN_BACK", "PROMOTIONAL", "CUSTOM"] as const;
const CAMPAIGN_CHANNELS = ["SMS", "EMAIL", "WHATSAPP"] as const;
const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"] as const;

const createCampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(CAMPAIGN_TYPES, { error: "Type is required" }),
  message: z.string().min(1, "Message is required").max(1600),
  channel: z.enum(CAMPAIGN_CHANNELS, { error: "Channel is required" }),
  subject: z.string().max(200).optional().nullable(),
  targetFilter: z.string().optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(CAMPAIGN_TYPES).optional(),
  message: z.string().min(1).max(1600).optional(),
  channel: z.enum(CAMPAIGN_CHANNELS).optional(),
  subject: z.string().max(200).nullable().optional(),
  targetFilter: z.string().nullable().optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
});

// ── helpers ────────────────────────────────────────────────────────────────────

async function getSalon() {
  return prisma.salon.findFirst();
}

type TargetFilterShape = {
  filter: "all" | "inactive" | "birthday" | "vip" | "segment" | "custom";
  daysInactive?: number;
  segmentId?: string;
  // Custom filter fields
  minVisits?: number;
  minSpend?: number;
  lastVisitBefore?: string; // ISO date
  lastVisitAfter?: string;  // ISO date
  tagsContain?: string;
  clientIds?: string[];
};

function parseTargetFilter(raw: string | null | undefined): TargetFilterShape {
  if (!raw) return { filter: "all" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.filter === "string") {
      return parsed as TargetFilterShape;
    }
    return { filter: "all" };
  } catch {
    return { filter: "all" };
  }
}

// ── getTargetAudience ──────────────────────────────────────────────────────────

export async function getTargetAudience(filterJson: string): Promise<{
  count: number;
  preview: Array<{ id: string; name: string; phone?: string | null; email?: string | null }>;
  error?: string;
}> {
  try {
    const salon = await getSalon();
    if (!salon) return { count: 0, preview: [], error: "No salon found" };

    const filter = parseTargetFilter(filterJson);

    let clients: Array<{ id: string; name: string; phone?: string | null; email?: string | null }> = [];
    let count = 0;

    if (filter.filter === "all") {
      count = await prisma.client.count({ where: { salonId: salon.id } });
      clients = await prisma.client.findMany({
        where: { salonId: salon.id },
        take: 5,
        select: { id: true, name: true, phone: true, email: true },
        orderBy: { createdAt: "desc" },
      });
    } else if (filter.filter === "inactive") {
      const days = filter.daysInactive ?? 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      const where = {
        salonId: salon.id,
        Appointment: { none: { date: { gte: cutoffStr } } },
      } as const;
      count = await prisma.client.count({ where });
      clients = await prisma.client.findMany({
        where,
        take: 5,
        select: { id: true, name: true, phone: true, email: true },
        orderBy: { createdAt: "desc" },
      });
    } else if (filter.filter === "birthday") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const where = {
        salonId: salon.id,
        birthday: { gte: monthStart, lte: monthEnd },
      } as const;
      count = await prisma.client.count({ where });
      clients = await prisma.client.findMany({
        where,
        take: 5,
        select: { id: true, name: true, phone: true, email: true },
        orderBy: { createdAt: "desc" },
      });
    } else if (filter.filter === "vip") {
      // VIP = clients with loyalty points > 100
      const where = {
        salonId: salon.id,
        loyaltyPoints: { gte: 100 },
      } as const;
      count = await prisma.client.count({ where });
      clients = await prisma.client.findMany({
        where,
        take: 5,
        select: { id: true, name: true, phone: true, email: true },
        orderBy: { loyaltyPoints: "desc" },
      });
    } else if (filter.filter === "segment" && filter.segmentId) {
      const { getSegmentClientIds } = await import("@/lib/segments");
      const ids = await getSegmentClientIds(prisma, filter.segmentId);
      count = ids.length;
      const previewIds = ids.slice(0, 5);
      clients = await prisma.client.findMany({
        where: { id: { in: previewIds } },
        select: { id: true, name: true, phone: true, email: true },
      });
    } else if (filter.filter === "custom") {
      // Custom filter: visits, spend, date range, tags, explicit clientIds
      if (filter.clientIds && filter.clientIds.length > 0) {
        count = filter.clientIds.length;
        clients = await prisma.client.findMany({
          where: { id: { in: filter.clientIds.slice(0, 5) } },
          select: { id: true, name: true, phone: true, email: true },
        });
      } else {
        // Build dynamic where
        const where: Record<string, unknown> = { salonId: salon.id };
        if (filter.lastVisitBefore || filter.lastVisitAfter) {
          const dateFilter: Record<string, string> = {};
          if (filter.lastVisitBefore) dateFilter.lte = filter.lastVisitBefore;
          if (filter.lastVisitAfter) dateFilter.gte = filter.lastVisitAfter;
          where.Appointment = { some: { date: dateFilter } };
        }
        if (filter.tagsContain) {
          where.tags = { contains: filter.tagsContain };
        }
        const allClients = await prisma.client.findMany({
          where,
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            Appointment: { select: { totalAmount: true, date: true } },
          },
        });
        const filtered = allClients.filter((c) => {
          if (filter.minVisits !== undefined && c.Appointment.length < filter.minVisits) return false;
          if (filter.minSpend !== undefined) {
            const spent = c.Appointment.reduce((s, a) => s + a.totalAmount, 0);
            if (spent < filter.minSpend) return false;
          }
          return true;
        });
        count = filtered.length;
        clients = filtered.slice(0, 5).map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone ?? null,
          email: c.email ?? null,
        }));
      }
    } else {
      count = await prisma.client.count({ where: { salonId: salon.id } });
      clients = await prisma.client.findMany({
        where: { salonId: salon.id },
        take: 5,
        select: { id: true, name: true, phone: true, email: true },
        orderBy: { createdAt: "desc" },
      });
    }

    return { count, preview: clients };
  } catch (err) {
    console.error("[getTargetAudience]", err);
    return { count: 0, preview: [], error: "Failed to get audience" };
  }
}

// ── estimateAudience ───────────────────────────────────────────────────────────

export async function estimateAudience(
  filter: string
): Promise<{ count: number; preview: string[] }> {
  const result = await getTargetAudience(filter);
  return {
    count: result.count,
    preview: result.preview.map((c) => c.name),
  };
}

// ── getCampaignById ────────────────────────────────────────────────────────────

export async function getCampaignById(id: string) {
  try {
    return await prisma.campaign.findUnique({ where: { id } });
  } catch (err) {
    console.error("[getCampaignById]", err);
    return null;
  }
}

// ── getCampaigns ───────────────────────────────────────────────────────────────

export async function getCampaigns() {
  try {
    const salon = await getSalon();
    if (!salon) return [];

    return prisma.campaign.findMany({
      where: { salonId: salon.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[getCampaigns]", err);
    return [];
  }
}

// ── createCampaign ─────────────────────────────────────────────────────────────

export async function createCampaign(data: {
  name: string;
  type: string;
  message: string;
  channel: string;
  subject?: string | null;
  targetFilter?: string | null;
  scheduledAt?: Date | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createCampaignSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salon = await getSalon();
    if (!salon) return { success: false, error: "No salon found" };

    const campaign = await prisma.campaign.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name: parsed.data.name,
        type: parsed.data.type,
        message: parsed.data.message,
        channel: parsed.data.channel,
        subject: parsed.data.subject ?? null,
        targetFilter: parsed.data.targetFilter ?? null,
        status: "DRAFT",
        scheduledAt: parsed.data.scheduledAt ?? null,
      },
    });

    return { success: true, id: campaign.id };
  } catch (err) {
    console.error("[createCampaign]", err);
    return { success: false, error: "Failed to create campaign" };
  }
}

// ── updateCampaign ─────────────────────────────────────────────────────────────

export async function updateCampaign(
  id: string,
  data: {
    name?: string;
    type?: string;
    message?: string;
    channel?: string;
    subject?: string | null;
    targetFilter?: string | null;
    status?: string;
    scheduledAt?: Date | null;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  const parsed = updateCampaignSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Campaign not found" };
    if (existing.status === "COMPLETED") {
      return { success: false, error: "Cannot edit a completed campaign" };
    }

    await prisma.campaign.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.type !== undefined && { type: parsed.data.type }),
        ...(parsed.data.message !== undefined && { message: parsed.data.message }),
        ...(parsed.data.channel !== undefined && { channel: parsed.data.channel }),
        ...(parsed.data.subject !== undefined && { subject: parsed.data.subject }),
        ...(parsed.data.targetFilter !== undefined && { targetFilter: parsed.data.targetFilter }),
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        ...(parsed.data.scheduledAt !== undefined && { scheduledAt: parsed.data.scheduledAt }),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[updateCampaign]", err);
    return { success: false, error: "Failed to update campaign" };
  }
}

// ── deleteCampaign ─────────────────────────────────────────────────────────────

export async function deleteCampaign(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  try {
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Campaign not found" };

    await prisma.campaign.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    console.error("[deleteCampaign]", err);
    return { success: false, error: "Failed to delete campaign" };
  }
}

// ── launchCampaign ─────────────────────────────────────────────────────────────

export async function launchCampaign(
  id: string
): Promise<{ success: true; recipientCount: number } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  try {
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Campaign not found" };
    if (existing.status === "COMPLETED") {
      return { success: false, error: "Campaign has already been completed" };
    }

    const audienceResult = await getTargetAudience(
      existing.targetFilter ?? JSON.stringify({ filter: "all" })
    );
    const recipientCount = audienceResult.count;

    // Simulate open rate (35%) and click rate (10%)
    const openCount = Math.round(recipientCount * 0.35);
    const clickCount = Math.round(recipientCount * 0.1);

    await prisma.campaign.update({
      where: { id },
      data: {
        status: "ACTIVE",
        sentAt: new Date(),
        recipientCount,
        openCount,
        clickCount,
        scheduledAt: existing.scheduledAt ?? new Date(),
      },
    });

    return { success: true, recipientCount };
  } catch (err) {
    console.error("[launchCampaign]", err);
    return { success: false, error: "Failed to launch campaign" };
  }
}

// ── updateCampaignStatus ───────────────────────────────────────────────────────

export async function updateCampaignStatus(
  id: string,
  status: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };
  const allowed = CAMPAIGN_STATUSES;
  if (!allowed.includes(status as (typeof allowed)[number])) {
    return { success: false, error: `Invalid status: ${status}` };
  }
  try {
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Campaign not found" };
    await prisma.campaign.update({ where: { id }, data: { status } });
    return { success: true };
  } catch (err) {
    console.error("[updateCampaignStatus]", err);
    return { success: false, error: "Failed to update status" };
  }
}

// ── getCampaignRecipientCount ──────────────────────────────────────────────────

export async function getCampaignRecipientCount(filter: string): Promise<number> {
  try {
    const result = await getTargetAudience(filter);
    return result.count;
  } catch {
    return 0;
  }
}

// ── createCampaignAndSend ──────────────────────────────────────────────────────
// Creates a campaign and immediately marks it as ACTIVE (sent). Used for quick
// "Send to selected clients" flows from the clients grid.

export async function createCampaignAndSend(data: {
  name: string;
  type: string;
  message: string;
  channel: string;
  subject?: string | null;
  targetFilter?: string | null;
  recipientCount: number;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createCampaignSchema.safeParse({
    ...data,
    scheduledAt: null,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salon = await getSalon();
    if (!salon) return { success: false, error: "No salon found" };

    const openCount = Math.round(data.recipientCount * 0.35);
    const clickCount = Math.round(data.recipientCount * 0.1);

    const campaign = await prisma.campaign.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name: parsed.data.name,
        type: parsed.data.type,
        message: parsed.data.message,
        channel: parsed.data.channel,
        subject: parsed.data.subject ?? null,
        targetFilter: parsed.data.targetFilter ?? null,
        status: "ACTIVE",
        sentAt: new Date(),
        scheduledAt: new Date(),
        recipientCount: data.recipientCount,
        openCount,
        clickCount,
      },
    });

    return { success: true, id: campaign.id };
  } catch (err) {
    console.error("[createCampaignAndSend]", err);
    return { success: false, error: "Failed to create and send campaign" };
  }
}

// ── pauseCampaign ──────────────────────────────────────────────────────────────

export async function pauseCampaign(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  try {
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Campaign not found" };
    if (existing.status !== "ACTIVE") {
      return { success: false, error: "Only active campaigns can be paused" };
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "PAUSED" },
    });

    return { success: true };
  } catch (err) {
    console.error("[pauseCampaign]", err);
    return { success: false, error: "Failed to pause campaign" };
  }
}
