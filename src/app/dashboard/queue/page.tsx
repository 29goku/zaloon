import { Users, Clock, Tv, CircleDot } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getQueueForToday } from "@/app/actions/appointments";
import { QueueActions } from "./queue-actions";

export const dynamic = "force-dynamic";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "SCHEDULED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-transparent";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-transparent";
    case "COMPLETED":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-transparent";
    case "NO_SHOW":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-transparent";
    default:
      return "bg-muted text-muted-foreground border-transparent";
  }
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function WaitBadge({ mins }: { mins: number }) {
  if (mins === 0) {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
        Now
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">~{mins} min</span>
  );
}

export default async function QueuePage() {
  const { entries, staffCards } = await getQueueForToday();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const activeCount = entries.filter(
    (e) => e.status === "SCHEDULED" || e.status === "IN_PROGRESS"
  ).length;
  const completedCount = entries.filter(
    (e) => e.status === "COMPLETED"
  ).length;
  const inProgressCount = entries.filter(
    (e) => e.status === "IN_PROGRESS"
  ).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Queue</h1>
            <p className="text-sm text-muted-foreground">{today}</p>
          </div>
        </div>
        <Link
          href="/queue-display"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
        >
          <Tv className="w-4 h-4" />
          TV Display
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{entries.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total today</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <CircleDot className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground mt-1">In progress</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{activeCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Remaining</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{completedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </div>
        </div>
      </div>

      {/* Staff queue cards */}
      {staffCards.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Staff Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {staffCards.map((card) => (
              <div
                key={card.staffId}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                {/* Staff name + idle */}
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-foreground">
                    {card.staffName}
                  </p>
                  {card.idleMins !== null && !card.currentAppointment && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      Idle {card.idleMins}m
                    </span>
                  )}
                  {card.currentAppointment && (
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                      Busy
                    </span>
                  )}
                  {!card.currentAppointment && card.idleMins === null && !card.nextAppointment && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      Free
                    </span>
                  )}
                </div>

                {/* Current */}
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                    Now serving
                  </p>
                  {card.currentAppointment ? (
                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2.5">
                      <p className="text-sm font-medium text-foreground">
                        {card.currentAppointment.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {card.currentAppointment.services}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTime(card.currentAppointment.startTime)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </div>

                {/* Next */}
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                    Up next
                  </p>
                  {card.nextAppointment ? (
                    <div className="bg-muted/40 rounded-lg p-2.5">
                      <p className="text-sm font-medium text-foreground">
                        {card.nextAppointment.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {card.nextAppointment.services}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTime(card.nextAppointment.startTime)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No more appointments</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Queue table */}
      <section>
        <h2 className="text-base font-semibold mb-3">Today&apos;s Queue</h2>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-xl border border-border">
            <Users className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No appointments scheduled for today.</p>
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
                    Services
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Est. Wait
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Staff
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
                    className={cn(
                      "bg-card hover:bg-muted/30 transition-colors",
                      entry.status === "IN_PROGRESS" &&
                        "bg-amber-50/40 dark:bg-amber-950/10",
                      entry.status === "COMPLETED" && "opacity-60",
                      entry.status === "NO_SHOW" && "opacity-50"
                    )}
                  >
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {entry.position}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {entry.clientName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px]">
                      <p className="truncate">{entry.services}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatTime(entry.startTime)}
                    </td>
                    <td className="px-4 py-3">
                      {entry.status === "SCHEDULED" ? (
                        <WaitBadge mins={entry.estimatedWaitMins} />
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {entry.staffName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "text-xs font-medium",
                          statusBadgeClass(entry.status)
                        )}
                      >
                        {entry.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <QueueActions id={entry.id} status={entry.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
