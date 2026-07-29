import { prisma } from "@/lib/prisma";
import { ClipboardList, Clock, Bell, Users, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AddWaitlistDialog } from "@/components/waitlist/add-waitlist-dialog";
import { WaitlistActionButtons } from "./waitlist-actions";
import type { WaitlistStatus } from "@/app/actions/waitlist";

export const dynamic = "force-dynamic";

type TabKey = "ALL" | WaitlistStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "WAITING", label: "Waiting" },
  { key: "NOTIFIED", label: "Notified" },
  { key: "BOOKED", label: "Booked" },
  { key: "CANCELLED", label: "Cancelled" },
];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "WAITING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-transparent";
    case "NOTIFIED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-transparent";
    case "BOOKED":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-transparent";
    case "CANCELLED":
      return "bg-muted text-muted-foreground border-transparent";
    default:
      return "";
  }
}

function formatWaitTime(createdAt: Date): string {
  const diffMs = Date.now() - createdAt.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

function formatWaitTimeLabel(createdAt: Date): string {
  const diffMs = Date.now() - createdAt.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function preferredTimeBadge(time: string | null): string {
  switch (time) {
    case "morning": return "AM";
    case "afternoon": return "PM";
    case "evening": return "Eve";
    default: return "";
  }
}

function formatEstimatedWait(mins: number): string {
  if (mins === 0) return "Next";
  if (mins < 60) return `~${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

const DEFAULT_SERVICE_DURATION = 30;

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const rawTab = typeof sp.tab === "string" ? sp.tab.toUpperCase() : "ALL";
  const activeTab: TabKey = (TABS.map((t) => t.key) as string[]).includes(rawTab)
    ? (rawTab as TabKey)
    : "ALL";

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const salon = await prisma.salon.findFirst({ select: { id: true, slug: true } });
  const bookingLink = salon?.slug ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/book/${salon.slug}` : undefined;

  const [entries, services, staff, allWaitingEntries, counts] = await Promise.all([
    prisma.waitlist.findMany({
      where: activeTab !== "ALL" ? { status: activeTab } : undefined,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        Client: { select: { id: true, name: true } },
        Service: { select: { id: true, name: true, durationMins: true } },
        Staff: { select: { id: true, name: true } },
      },
    }),
    prisma.service.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.staff.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // All WAITING entries for stats + estimated wait calculation
    prisma.waitlist.findMany({
      where: { status: "WAITING" },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        Service: { select: { durationMins: true } },
      },
    }),
    prisma.waitlist.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  // Stats
  const countMap: Record<string, number> = {};
  for (const c of counts) {
    countMap[c.status] = c._count.id;
  }
  const totalCount = Object.values(countMap).reduce((a, b) => a + b, 0);
  const waitingCount = countMap["WAITING"] ?? 0;

  // Notified today
  const notifiedTodayCount = await prisma.waitlist.count({
    where: {
      status: "NOTIFIED",
      notifiedAt: { gte: todayStart },
    },
  });

  // Converted to appointments this week (BOOKED status set this week)
  const convertedThisWeekCount = await prisma.waitlist.count({
    where: {
      status: "BOOKED",
      updatedAt: { gte: weekStart },
    },
  });

  // Build estimated wait per entry (for WAITING entries in order)
  // waitingEntryEstimates: map id -> estimatedWaitMins
  const waitingEstimateMap = new Map<string, number>();
  let cumulativeMins = 0;
  for (const e of allWaitingEntries) {
    waitingEstimateMap.set(e.id, cumulativeMins);
    cumulativeMins += e.Service?.durationMins ?? DEFAULT_SERVICE_DURATION;
  }

  // For currently displayed entries, attach estimate if WAITING
  const entriesWithEstimate = entries.map((e, idx) => ({
    ...e,
    estimatedWaitMins: e.status === "WAITING" ? (waitingEstimateMap.get(e.id) ?? null) : null,
    displayPosition: e.status === "WAITING" ? (allWaitingEntries.findIndex((w) => w.id === e.id) + 1) : idx + 1,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Waitlist</h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} {totalCount === 1 ? "entry" : "entries"} total
            </p>
          </div>
        </div>
        <AddWaitlistDialog services={services} staff={staff} />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{waitingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Waiting</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{notifiedTodayCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Notified today</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{convertedThisWeekCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Booked this week</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">
              {waitingCount > 0
                ? formatEstimatedWait(
                    allWaitingEntries.reduce(
                      (sum, e) => sum + (e.Service?.durationMins ?? DEFAULT_SERVICE_DURATION),
                      0
                    )
                  )
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total queue time</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(({ key, label }) => {
          const count = key === "ALL" ? totalCount : (countMap[key] ?? 0);
          return (
            <Link
              key={key}
              href={`/dashboard/waitlist?tab=${key.toLowerCase()}`}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md whitespace-nowrap transition-colors",
                activeTab === key
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-bold leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-1",
                    activeTab === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Table / list */}
      {entriesWithEstimate.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <ClipboardList className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No waitlist entries found.</p>
          <AddWaitlistDialog services={services} staff={staff} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide w-8">
                  #
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Client
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Phone
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Service
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Preferred
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Est. wait
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Joined
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entriesWithEstimate.map((entry) => (
                <tr
                  key={entry.id}
                  className={cn(
                    "bg-card hover:bg-muted/30 transition-colors",
                    entry.slotAvailableAt && entry.status === "WAITING" && "bg-green-50/50 dark:bg-green-950/20"
                  )}
                >
                  {/* Position number */}
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                      entry.status === "WAITING"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                        : "text-muted-foreground font-mono"
                    )}>
                      {entry.displayPosition}
                    </span>
                  </td>

                  {/* Client name + notes */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{entry.name}</div>
                    {entry.note && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {entry.note}
                      </div>
                    )}
                    {entry.slotAvailableAt && entry.status === "WAITING" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        Slot available
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.phone ?? <span className="text-muted-foreground/50">—</span>}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.Service?.name ?? <span className="text-muted-foreground/50">Any</span>}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {entry.preferredDate && (
                        <span className="text-xs text-foreground">{entry.preferredDate}</span>
                      )}
                      {entry.preferredTime && (
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {preferredTimeBadge(entry.preferredTime)} ({entry.preferredTime})
                        </span>
                      )}
                      {!entry.preferredDate && !entry.preferredTime && (
                        <span className="text-muted-foreground/50">Any</span>
                      )}
                    </div>
                  </td>

                  {/* Estimated wait */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {entry.estimatedWaitMins !== null ? (
                      <span className={cn(
                        "text-xs font-medium",
                        entry.estimatedWaitMins === 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground"
                      )}>
                        {formatEstimatedWait(entry.estimatedWaitMins)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatWaitTimeLabel(entry.createdAt)}
                  </td>

                  <td className="px-4 py-3">
                    <Badge className={cn("text-xs font-medium", statusBadgeClass(entry.status))}>
                      {entry.status}
                    </Badge>
                    {entry.notifiedAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Notified {formatWaitTime(entry.notifiedAt)} ago
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <WaitlistActionButtons
                      id={entry.id}
                      currentStatus={entry.status}
                      position={entry.displayPosition}
                      totalWaiting={waitingCount}
                      entry={{
                        name: entry.name,
                        phone: entry.phone,
                        clientId: entry.Client?.id ?? null,
                        serviceId: entry.Service?.id ?? null,
                        serviceName: entry.Service?.name ?? null,
                        staffId: entry.Staff?.id ?? null,
                        staffName: entry.Staff?.name ?? null,
                        preferredDate: entry.preferredDate,
                        preferredTime: entry.preferredTime,
                        note: entry.note,
                      }}
                      services={services}
                      staff={staff}
                      bookingLink={bookingLink}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
