import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle2, Clock, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ReminderCard } from "@/components/reminders/reminder-card";
import { ScheduleReminderForm } from "@/components/reminders/schedule-reminder-form";
import { SendAllButton } from "./reminder-actions";
import type { ReminderWithAppointment } from "@/app/actions/reminders";

export const dynamic = "force-dynamic";

// ── tab config ────────────────────────────────────────────────────────────────

type FilterTab = "scheduled" | "sent" | "all";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "scheduled", label: "Scheduled" },
  { key: "sent", label: "Sent" },
  { key: "all", label: "All" },
];

function tabToStatus(tab: FilterTab): "PENDING" | "SENT" | undefined {
  if (tab === "scheduled") return "PENDING";
  if (tab === "sent") return "SENT";
  return undefined;
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const rawTab = typeof sp.tab === "string" ? sp.tab : "all";
  const tab: FilterTab = (["scheduled", "sent", "all"] as FilterTab[]).includes(
    rawTab as FilterTab
  )
    ? (rawTab as FilterTab)
    : "all";

  const statusFilter = tabToStatus(tab);

  // Time boundaries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday

  const [reminders, pendingCount, sentTodayCount, sentWeekCount] = await Promise.all([
    prisma.reminder.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { scheduledAt: "asc" },
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
    }) as Promise<ReminderWithAppointment[]>,
    prisma.reminder.count({ where: { status: "PENDING" } }),
    prisma.reminder.count({
      where: { status: "SENT", sentAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.reminder.count({
      where: { status: "SENT", sentAt: { gte: weekStart, lte: todayEnd } },
    }),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reminders</h1>
            <p className="text-sm text-muted-foreground">
              Simulated SMS, WhatsApp &amp; Email reminders
            </p>
          </div>
        </div>
        <SendAllButton pendingCount={pendingCount} />
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold">{pendingCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sent Today
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">{sentTodayCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sent This Week
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{sentWeekCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Schedule a reminder form ────────────────────────────────────── */}
      <ScheduleReminderForm />

      {/* ── Filter tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/dashboard/reminders?tab=${key}`}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-md transition-colors",
              tab === key
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {key === "scheduled" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Reminders list ─────────────────────────────────────────────── */}
      {reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Bell className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {tab === "scheduled"
              ? "No pending reminders."
              : tab === "sent"
              ? "No sent reminders yet."
              : "No reminders found."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <ReminderCard key={reminder.id} reminder={reminder} />
          ))}
        </div>
      )}
    </div>
  );
}
