import { PrismaClient } from "@prisma/client";

// ── Segment definitions ────────────────────────────────────────────────────────

export interface Segment {
  id: string;
  name: string;
  description: string;
  color: string; // Tailwind color class suffix (e.g. "blue-500")
  icon: string; // emoji
}

export const PREDEFINED_SEGMENTS: Segment[] = [
  {
    id: "new",
    name: "New Clients",
    description: "Joined in last 30 days",
    color: "blue-500",
    icon: "✨",
  },
  {
    id: "loyal",
    name: "Loyal Clients",
    description: "10+ visits",
    color: "purple-500",
    icon: "⭐",
  },
  {
    id: "at_risk",
    name: "At Risk",
    description: "No visit in 45–90 days",
    color: "amber-500",
    icon: "⚠️",
  },
  {
    id: "lost",
    name: "Lost Clients",
    description: "No visit in 90+ days",
    color: "red-500",
    icon: "💔",
  },
  {
    id: "vip",
    name: "VIP",
    description: "Marked as VIP",
    color: "yellow-500",
    icon: "👑",
  },
  {
    id: "birthday",
    name: "Birthday Month",
    description: "Birthday this month",
    color: "pink-500",
    icon: "🎂",
  },
  {
    id: "high_spend",
    name: "High Spenders",
    description: "Lifetime spend > $500",
    color: "green-500",
    icon: "💎",
  },
];

// ── getSegmentClientIds ────────────────────────────────────────────────────────

/**
 * Returns client IDs for the given salonId that match the given segment.
 */
export async function getSegmentClientIds(
  prisma: PrismaClient,
  salonId: string,
  segmentId: string
): Promise<string[]> {
  const now = new Date();

  switch (segmentId) {
    case "new": {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      const clients = await prisma.client.findMany({
        where: { salonId, createdAt: { gte: cutoff } },
        select: { id: true },
      });
      return clients.map((c) => c.id);
    }

    case "loyal": {
      // Clients whose Appointment count >= 10
      const clients = await prisma.client.findMany({
        where: {
          salonId,
          Appointment: { some: {} },
        },
        select: {
          id: true,
          _count: { select: { Appointment: true } },
        },
      });
      return clients.filter((c) => c._count.Appointment >= 10).map((c) => c.id);
    }

    case "at_risk": {
      const from = new Date(now);
      from.setDate(from.getDate() - 90);
      const to = new Date(now);
      to.setDate(to.getDate() - 45);
      const fromStr = from.toISOString().split("T")[0];
      const toStr = to.toISOString().split("T")[0];
      // Had an appointment in [90, 45] days ago window but none more recent
      const clients = await prisma.client.findMany({
        where: {
          salonId,
          Appointment: {
            some: { date: { gte: fromStr, lte: toStr } },
            none: { date: { gt: toStr } },
          },
        },
        select: { id: true },
      });
      return clients.map((c) => c.id);
    }

    case "lost": {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      // Had at least one appointment ever, but none in the last 90 days
      const clients = await prisma.client.findMany({
        where: {
          salonId,
          Appointment: {
            some: {},
            none: { date: { gte: cutoffStr } },
          },
        },
        select: { id: true },
      });
      return clients.map((c) => c.id);
    }

    case "vip": {
      const clients = await prisma.client.findMany({
        where: { salonId, isVip: true },
        select: { id: true },
      });
      return clients.map((c) => c.id);
    }

    case "birthday": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const clients = await prisma.client.findMany({
        where: {
          salonId,
          birthday: { gte: monthStart, lte: monthEnd },
        },
        select: { id: true },
      });
      return clients.map((c) => c.id);
    }

    case "high_spend": {
      // Sum Appointment.totalAmount per client > 500
      const clients = await prisma.client.findMany({
        where: { salonId },
        select: {
          id: true,
          Appointment: { select: { totalAmount: true } },
        },
      });
      return clients
        .filter(
          (c) => c.Appointment.reduce((sum, a) => sum + a.totalAmount, 0) > 500
        )
        .map((c) => c.id);
    }

    default:
      return [];
  }
}

// ── getSegmentCount ────────────────────────────────────────────────────────────

/**
 * Convenience wrapper that returns just the count.
 */
export async function getSegmentCount(
  prisma: PrismaClient,
  salonId: string,
  segmentId: string
): Promise<number> {
  const ids = await getSegmentClientIds(prisma, salonId, segmentId);
  return ids.length;
}
