import type React from "react";
import { prisma } from "@/lib/prisma";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarClock,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RemindersTable } from "@/components/reminders/reminders-table";
import { SendMessageFormServer } from "./send-message-form-server";
import { SendAllButton } from "./reminder-actions";
import { ScheduleForDateForm } from "@/components/reminders/schedule-for-date-form";
import type { ReminderWithRelations } from "@/app/actions/reminders";
import { getTemplates } from "@/app/actions/templates";

export const dynamic = "force-dynamic";

// ── filter tabs ───────────────────────────────────────────────────────────────

type FilterTab = "send" | "all" | "pending" | "sent" | "failed";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "send", label: "Send Now" },
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "sent", label: "Sent" },
  { key: "failed", label: "Failed" },
];

function tabToStatus(tab: FilterTab): string | undefined {
  if (tab === "pending") return "PENDING";
  if (tab === "sent") return "SENT";
  if (tab === "failed") return "FAILED";
  return undefined;
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const rawTab = typeof sp.tab === "string" ? sp.tab : "send";
  const tab: FilterTab = (["send", "all", "pending", "sent", "failed"] as FilterTab[]).includes(
    rawTab as FilterTab
  )
    ? (rawTab as FilterTab)
    : "send";

  // Channel filter
  const channelFilter =
    typeof sp.channel === "string" &&
    ["SMS", "EMAIL", "WHATSAPP"].includes(sp.channel.toUpperCase())
      ? sp.channel.toUpperCase()
      : undefined;

  // Date range filter
  const dateFrom = typeof sp.from === "string" ? sp.from : undefined;
  const dateTo = typeof sp.to === "string" ? sp.to : undefined;

  const statusFilter = tabToStatus(tab);

  // Time boundaries
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const next24hEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Build date-range filter for scheduledAt if provided
  const scheduledAtFilter =
    dateFrom || dateTo
      ? {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
        }
      : undefined;

  const [reminders, clients, pendingCount, sentTodayCount, failedCount, upcoming24hCount, templates] =
    await Promise.all([
      tab !== "send"
        ? (prisma.reminder.findMany({
            where: {
              ...(statusFilter ? { status: statusFilter } : {}),
              ...(channelFilter ? { type: channelFilter } : {}),
              ...(scheduledAtFilter ? { scheduledAt: scheduledAtFilter } : {}),
            },
            orderBy: { scheduledAt: "desc" },
            include: {
              Appointment: {
                select: {
                  id: true,
                  date: true,
                  startTime: true,
                  Client: { select: { id: true, name: true } },
                },
              },
            },
          }) as Promise<ReminderWithRelations[]>)
        : Promise.resolve([] as ReminderWithRelations[]),
      prisma.client.findMany({
        select: { id: true, name: true, phone: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.reminder.count({ where: { status: "PENDING" } }),
      prisma.reminder.count({
        where: { status: "SENT", sentAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.reminder.count({ where: { status: "FAILED" } }),
      prisma.reminder.count({
        where: { status: "PENDING", scheduledAt: { gte: now, lte: next24hEnd } },
      }),
      getTemplates(),
    ]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reminders &amp; Messaging</h1>
            <p className="text-sm text-muted-foreground">
              SMS, WhatsApp &amp; Email outbox for your clients
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard/settings/reminders"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Settings className="size-3.5" />
            Settings
          </Link>
          <SendAllButton pendingCount={pendingCount} />
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Pending"
          value={pendingCount}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          highlight={pendingCount > 0 ? "amber" : undefined}
        />
        <StatCard
          label="Sent Today"
          value={sentTodayCount}
          icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
        />
        <StatCard
          label="Failed"
          value={failedCount}
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          highlight={failedCount > 0 ? "red" : undefined}
        />
        <StatCard
          label="Next 24h"
          value={upcoming24hCount}
          icon={<CalendarClock className="w-5 h-5 text-primary" />}
        />
      </div>

      {/* ── Filter tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={buildTabHref(key, channelFilter, dateFrom, dateTo)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap",
              tab === key
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {key === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {pendingCount}
              </span>
            )}
            {key === "failed" && failedCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-300">
                {failedCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      {tab === "send" ? (
        <div className="space-y-6">
          <SendMessageFormServer clients={clients} templates={templates} />
          <ScheduleForDateForm />
        </div>
      ) : (
        <>
          {/* Filters bar */}
          <FiltersBar currentChannel={channelFilter} dateFrom={dateFrom} dateTo={dateTo} tab={tab} />

          {/* Table */}
          <RemindersTable reminders={reminders} />
        </>
      )}
    </div>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: "amber" | "red";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 space-y-2",
        highlight === "amber" && "border-amber-500/30 bg-amber-50/5",
        highlight === "red" && "border-red-500/30 bg-red-50/5"
      )}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
    </div>
  );
}

function buildTabHref(
  tab: FilterTab,
  channel?: string,
  from?: string,
  to?: string
): string {
  const params = new URLSearchParams({ tab });
  if (channel) params.set("channel", channel);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/dashboard/reminders?${params.toString()}`;
}

function FiltersBar({
  currentChannel,
  dateFrom,
  dateTo,
  tab,
}: {
  currentChannel?: string;
  dateFrom?: string;
  dateTo?: string;
  tab: FilterTab;
}) {
  const channels = ["SMS", "EMAIL", "WHATSAPP"] as const;

  function channelHref(ch: string | undefined) {
    const params = new URLSearchParams({ tab });
    if (ch) params.set("channel", ch);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    return `/dashboard/reminders?${params.toString()}`;
  }

  const channelColors: Record<string, string> = {
    SMS: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    EMAIL: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    WHATSAPP: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-muted-foreground font-medium">Filter by channel:</span>
      <div className="flex gap-1.5">
        <Link
          href={channelHref(undefined)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
            !currentChannel
              ? "bg-primary text-primary-foreground border-transparent"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </Link>
        {channels.map((ch) => (
          <Link
            key={ch}
            href={channelHref(ch)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              currentChannel === ch
                ? channelColors[ch]
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {ch === "WHATSAPP" ? "WhatsApp" : ch}
          </Link>
        ))}
      </div>
    </div>
  );
}
