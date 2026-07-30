import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MessageSquare, Mail, Send, Clock, Megaphone, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { QuickMessageDialog } from "@/components/communications/quick-message-dialog";
import { CommunicationsFeed } from "@/components/communications/communications-feed";

export const dynamic = "force-dynamic";

async function getStats(salonId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [remindersSentThisMonth, pendingReminders, campaignsThisMonth, scheduledMessages] =
    await Promise.all([
      prisma.reminder.count({
        where: {
          salonId,
          status: "SENT",
          sentAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.reminder.count({ where: { salonId, status: "PENDING" } }),
      prisma.campaign.count({
        where: {
          salonId,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.reminder.count({
        where: {
          salonId,
          status: "PENDING",
          scheduledAt: { gt: now },
        },
      }),
    ]);

  return { remindersSentThisMonth, pendingReminders, campaignsThisMonth, scheduledMessages };
}

async function getMessages(salonId: string) {
  const [reminders, campaigns] = await Promise.all([
    prisma.reminder.findMany({
      where: { salonId },
      orderBy: { scheduledAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        status: true,
        message: true,
        scheduledAt: true,
        sentAt: true,
        clientId: true,
      },
    }),
    prisma.campaign.findMany({
      where: { salonId },
      orderBy: { scheduledAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        channel: true,
        status: true,
        recipientCount: true,
        scheduledAt: true,
        sentAt: true,
        createdAt: true,
      },
    }),
  ]);

  // Fetch client names for reminders that have clientId
  const clientIds = [...new Set(reminders.map((r) => r.clientId).filter(Boolean) as string[])];
  const clientMap: Record<string, string> = {};
  if (clientIds.length > 0) {
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    });
    for (const c of clients) clientMap[c.id] = c.name;
  }

  return { reminders, campaigns, clientMap };
}

export default async function CommunicationsPage() {
  const salon = await prisma.salon.findFirst({ select: { id: true } });
  if (!salon) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-muted-foreground">No salon found.</p>
      </div>
    );
  }

  const [stats, { reminders, campaigns, clientMap }] = await Promise.all([
    getStats(salon.id),
    getMessages(salon.id),
  ]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Messages
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Unified inbox for reminders and campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <QuickMessageDialog>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              <MessageSquare className="w-4 h-4" />
              Send Message
            </button>
          </QuickMessageDialog>
          <Link
            href="/dashboard/marketing/campaigns/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-400/10 flex items-center justify-center">
              <Send className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Sent This Month</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.remindersSentThisMonth}</p>
          <p className="text-xs text-muted-foreground mt-0.5">reminders delivered</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.pendingReminders}</p>
          <p className="text-xs text-muted-foreground mt-0.5">awaiting delivery</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-violet-400/10 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Campaigns</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.campaignsThisMonth}</p>
          <p className="text-xs text-muted-foreground mt-0.5">this month</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-400/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Scheduled</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.scheduledMessages}</p>
          <p className="text-xs text-muted-foreground mt-0.5">future reminders</p>
        </div>
      </div>

      {/* Feed with tabs */}
      <CommunicationsFeed
        reminders={reminders.map((r) => ({
          ...r,
          scheduledAt: r.scheduledAt.toISOString(),
          sentAt: r.sentAt?.toISOString() ?? null,
          clientName: r.clientId ? (clientMap[r.clientId] ?? null) : null,
        }))}
        campaigns={campaigns.map((c) => ({
          ...c,
          scheduledAt: c.scheduledAt?.toISOString() ?? null,
          sentAt: c.sentAt?.toISOString() ?? null,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
