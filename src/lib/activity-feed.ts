"use server";

import { prisma } from "@/lib/prisma";
import type { ActivityItem } from "@/lib/activity-feed-utils";

const TYPE_META: Record<
  ActivityItem["type"],
  { icon: string; color: string }
> = {
  appointment_created: { icon: "📅", color: "text-blue-500" },
  appointment_completed: { icon: "✅", color: "text-emerald-500" },
  appointment_cancelled: { icon: "❌", color: "text-red-500" },
  client_added: { icon: "👤", color: "text-violet-500" },
  invoice_paid: { icon: "💰", color: "text-amber-500" },
  staff_added: { icon: "✂️", color: "text-cyan-500" },
  review_received: { icon: "⭐", color: "text-yellow-500" },
  membership_started: { icon: "🎫", color: "text-pink-500" },
  gift_card_purchased: { icon: "🎁", color: "text-orange-500" },
  campaign_sent: { icon: "📢", color: "text-indigo-500" },
};

export async function getRecentActivity(
  limit = 50
): Promise<ActivityItem[]> {
  const FETCH = Math.ceil(limit / 5) + 5;

  const [appointments, clients, invoices, staff, reviews, campaigns] =
    await Promise.all([
      prisma.appointment.findMany({
        take: FETCH * 2,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          Client: { select: { id: true, name: true } },
          Staff: { select: { id: true, name: true } },
          AppointmentService: {
            select: { Service: { select: { name: true } } },
          },
        },
      }),
      prisma.client.findMany({
        take: FETCH,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.invoice.findMany({
        take: FETCH,
        orderBy: { createdAt: "desc" },
        where: { status: "PAID" },
        select: {
          id: true,
          total: true,
          createdAt: true,
          Client: { select: { id: true, name: true } },
        },
      }),
      prisma.staff.findMany({
        take: FETCH,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.review.findMany({
        take: FETCH,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rating: true,
          createdAt: true,
          Client: { select: { id: true, name: true } },
          Staff: { select: { id: true, name: true } },
        },
      }),
      prisma.campaign.findMany({
        take: FETCH,
        orderBy: { createdAt: "desc" },
        where: { status: { in: ["ACTIVE", "COMPLETED"] } },
        select: {
          id: true,
          name: true,
          sentAt: true,
          createdAt: true,
          recipientCount: true,
        },
      }),
    ]);

  const items: ActivityItem[] = [];

  for (const appt of appointments) {
    let type: ActivityItem["type"];
    if (appt.status === "COMPLETED") type = "appointment_completed";
    else if (appt.status === "CANCELLED") type = "appointment_cancelled";
    else type = "appointment_created";

    const serviceNames = appt.AppointmentService.map(
      (as) => as.Service.name
    ).join(", ");
    const meta = TYPE_META[type];
    items.push({
      id: `appt-${appt.id}`,
      type,
      entityId: appt.id,
      entityName: appt.Client?.name ?? "Walk-in",
      detail: appt.Staff.name + (serviceNames ? ` · ${serviceNames}` : ""),
      amount: appt.totalAmount > 0 ? appt.totalAmount : undefined,
      timestamp: appt.createdAt.toISOString(),
      icon: meta.icon,
      color: meta.color,
    });
  }

  for (const c of clients) {
    const meta = TYPE_META.client_added;
    items.push({
      id: `client-${c.id}`,
      type: "client_added",
      entityId: c.id,
      entityName: c.name,
      timestamp: c.createdAt.toISOString(),
      icon: meta.icon,
      color: meta.color,
    });
  }

  for (const inv of invoices) {
    const meta = TYPE_META.invoice_paid;
    items.push({
      id: `inv-${inv.id}`,
      type: "invoice_paid",
      entityId: inv.id,
      entityName: inv.Client?.name ?? "Walk-in",
      amount: inv.total,
      timestamp: inv.createdAt.toISOString(),
      icon: meta.icon,
      color: meta.color,
    });
  }

  for (const s of staff) {
    const meta = TYPE_META.staff_added;
    items.push({
      id: `staff-${s.id}`,
      type: "staff_added",
      entityId: s.id,
      entityName: s.name,
      timestamp: s.createdAt.toISOString(),
      icon: meta.icon,
      color: meta.color,
    });
  }

  for (const r of reviews) {
    const meta = TYPE_META.review_received;
    items.push({
      id: `review-${r.id}`,
      type: "review_received",
      entityId: r.id,
      entityName: r.Client?.name ?? "Anonymous",
      detail: r.Staff
        ? `${r.rating}★ for ${r.Staff.name}`
        : `${r.rating}★`,
      timestamp: r.createdAt.toISOString(),
      icon: meta.icon,
      color: meta.color,
    });
  }

  for (const c of campaigns) {
    const meta = TYPE_META.campaign_sent;
    items.push({
      id: `campaign-${c.id}`,
      type: "campaign_sent",
      entityId: c.id,
      entityName: c.name,
      detail:
        c.recipientCount > 0
          ? `${c.recipientCount} recipients`
          : undefined,
      timestamp: (c.sentAt ?? c.createdAt).toISOString(),
      icon: meta.icon,
      color: meta.color,
    });
  }

  const seen = new Set<string>();
  return items
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export async function getRecentChanges(): Promise<{
  newClients: number;
  newAppointments: number;
  completedToday: number;
  revenueToday: number;
  pendingReminders: number;
}> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const today = now.toISOString().split("T")[0];

  const [
    newClients,
    newAppointments,
    completedToday,
    revAgg,
    pendingReminders,
  ] = await Promise.all([
    prisma.client.count({ where: { createdAt: { gte: yesterday } } }),
    prisma.appointment.count({ where: { createdAt: { gte: yesterday } } }),
    prisma.appointment.count({
      where: { date: today, status: "COMPLETED" },
    }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.reminder.count({ where: { status: "PENDING" } }),
  ]);

  return {
    newClients,
    newAppointments,
    completedToday,
    revenueToday: revAgg._sum.total ?? 0,
    pendingReminders,
  };
}
