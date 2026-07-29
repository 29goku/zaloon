import { prisma } from "@/lib/prisma";
import { ClipboardList } from "lucide-react";
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
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

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

  const [entries, services, staff] = await Promise.all([
    prisma.waitlist.findMany({
      where: activeTab !== "ALL" ? { status: activeTab } : undefined,
      orderBy: { createdAt: "asc" },
      include: {
        Client: { select: { id: true, name: true } },
        Service: { select: { id: true, name: true } },
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
  ]);

  // Tab counts
  const counts = await prisma.waitlist.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const countMap: Record<string, number> = {};
  for (const c of counts) {
    countMap[c.status] = c._count.id;
  }
  const totalCount = Object.values(countMap).reduce((a, b) => a + b, 0);

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
      {entries.length === 0 ? (
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
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Phone
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Service
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Preferred Staff
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Wait Time
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
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="bg-card hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{entry.name}</div>
                    {entry.note && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {entry.note}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.phone ?? <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.Service?.name ?? <span className="text-muted-foreground/50">Any</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.Staff?.name ?? <span className="text-muted-foreground/50">Any</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatWaitTime(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn("text-xs font-medium", statusBadgeClass(entry.status))}>
                      {entry.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <WaitlistActionButtons id={entry.id} currentStatus={entry.status} />
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
