"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { reprioritizeWaitlist } from "@/app/actions/waitlist";
import { KanbanCardActions } from "./kanban-card-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KanbanEntry {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  status: string;
  position: number;
  notifiedAt: Date | null;
  createdAt: Date;
  estimatedWaitMins: number | null;
  displayPosition: number;
  // optional enriched fields
  clientId?: string | null;
  serviceId?: string | null;
  staffId?: string | null;
  Service: { id?: string; name: string } | null;
  Staff: { id?: string; name: string } | null;
}

interface KanbanColumnProps {
  title: string;
  status: string;
  entries: KanbanEntry[];
  totalWaiting: number;
  accentClass: string;
  headerBg: string;
  services?: { id: string; name: string }[];
  staff?: { id: string; name: string }[];
  bookingLink?: string;
}

function formatWaitTimeLabel(createdAt: Date): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatEstWait(mins: number | null): string | null {
  if (mins === null) return null;
  if (mins === 0) return "Next up";
  if (mins < 60) return `~${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

function KanbanCard({
  entry,
  isWaiting,
  totalWaiting,
  services,
  staff,
  bookingLink,
}: {
  entry: KanbanEntry;
  isWaiting: boolean;
  totalWaiting: number;
  services?: { id: string; name: string }[];
  staff?: { id: string; name: string }[];
  bookingLink?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleMoveUp() {
    if (entry.displayPosition <= 1) return;
    startTransition(async () => {
      await reprioritizeWaitlist(entry.id, entry.displayPosition - 1);
      router.refresh();
    });
  }

  function handleMoveDown() {
    if (entry.displayPosition >= totalWaiting) return;
    startTransition(async () => {
      await reprioritizeWaitlist(entry.id, entry.displayPosition + 1);
      router.refresh();
    });
  }

  const estWait = formatEstWait(entry.estimatedWaitMins);

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow space-y-2">
      {/* Top row: position badge + name */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isWaiting && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 flex-shrink-0">
              {entry.displayPosition}
            </span>
          )}
          <span className="font-medium text-sm text-foreground truncate">
            {entry.name}
          </span>
        </div>
        {isWaiting && (
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-5 p-0 text-muted-foreground hover:text-foreground"
              disabled={isPending || entry.displayPosition <= 1}
              onClick={handleMoveUp}
            >
              <ChevronUp className="w-2.5 h-2.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-5 p-0 text-muted-foreground hover:text-foreground"
              disabled={isPending || entry.displayPosition >= totalWaiting}
              onClick={handleMoveDown}
            >
              <ChevronDown className="w-2.5 h-2.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Service */}
      {entry.Service && (
        <p className="text-xs text-muted-foreground truncate">
          {entry.Service.name}
          {entry.Staff ? ` · ${entry.Staff.name}` : ""}
        </p>
      )}

      {/* Preferred time & wait estimate */}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">
          {entry.preferredDate
            ? entry.preferredDate
            : entry.preferredTime
            ? entry.preferredTime.charAt(0).toUpperCase() +
              entry.preferredTime.slice(1)
            : "Any time"}
        </span>
        {estWait && (
          <span
            className={cn(
              "font-medium",
              entry.estimatedWaitMins === 0
                ? "text-green-600 dark:text-green-400"
                : "text-muted-foreground"
            )}
          >
            {estWait}
          </span>
        )}
      </div>

      {/* Joined + notified */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
        <span>Joined {formatWaitTimeLabel(entry.createdAt)}</span>
        {entry.notifiedAt && (
          <span className="text-blue-500 dark:text-blue-400">Notified</span>
        )}
      </div>

      {/* Phone */}
      {entry.phone && (
        <p className="text-[11px] text-muted-foreground truncate">{entry.phone}</p>
      )}

      {/* Note */}
      {entry.note && (
        <p className="text-[11px] text-muted-foreground/70 line-clamp-2 italic">
          &ldquo;{entry.note}&rdquo;
        </p>
      )}

      {/* Actions slot */}
      {(services || staff) && (
        <div className="pt-1 border-t border-border">
          <KanbanCardActions
            entry={entry}
            services={services ?? []}
            staff={staff ?? []}
            totalWaiting={totalWaiting}
            bookingLink={bookingLink}
          />
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  title,
  status,
  entries,
  totalWaiting,
  accentClass,
  headerBg,
  services,
  staff,
  bookingLink,
}: KanbanColumnProps) {
  const isWaiting = status === "WAITING";

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-xl",
          headerBg
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold", accentClass)}>
            {title}
          </span>
          <Badge
            className={cn(
              "text-[10px] font-bold h-4 min-w-[16px] px-1",
              accentClass,
              "bg-transparent border-current"
            )}
          >
            {entries.length}
          </Badge>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-8 text-center">
            <p className="text-xs text-muted-foreground/50">No entries</p>
          </div>
        ) : (
          entries.map((entry) => (
            <KanbanCard
              key={entry.id}
              entry={entry}
              isWaiting={isWaiting}
              totalWaiting={totalWaiting}
              services={services}
              staff={staff}
              bookingLink={bookingLink}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban Board ────────────────────────────────────────────────────────

interface WaitlistKanbanProps {
  entries: KanbanEntry[];
  totalWaiting: number;
  services?: { id: string; name: string }[];
  staff?: { id: string; name: string }[];
  bookingLink?: string;
}

const COLUMNS: {
  status: string;
  title: string;
  accentClass: string;
  headerBg: string;
}[] = [
  {
    status: "WAITING",
    title: "Waiting",
    accentClass: "text-amber-600 dark:text-amber-400",
    headerBg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    status: "NOTIFIED",
    title: "Notified",
    accentClass: "text-blue-600 dark:text-blue-400",
    headerBg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    status: "BOOKED",
    title: "Booked",
    accentClass: "text-green-600 dark:text-green-400",
    headerBg: "bg-green-50 dark:bg-green-950/30",
  },
  {
    status: "CANCELLED",
    title: "Cancelled",
    accentClass: "text-muted-foreground",
    headerBg: "bg-muted/50",
  },
];

export function WaitlistKanban({ entries, totalWaiting, services, staff, bookingLink }: WaitlistKanbanProps) {
  const grouped = React.useMemo(() => {
    const map: Record<string, KanbanEntry[]> = {
      WAITING: [],
      NOTIFIED: [],
      BOOKED: [],
      CANCELLED: [],
    };
    for (const e of entries) {
      if (map[e.status]) {
        map[e.status].push(e);
      }
    }
    return map;
  }, [entries]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.status}
          title={col.title}
          status={col.status}
          entries={grouped[col.status] ?? []}
          totalWaiting={totalWaiting}
          accentClass={col.accentClass}
          headerBg={col.headerBg}
          services={services}
          staff={staff}
          bookingLink={bookingLink}
        />
      ))}
    </div>
  );
}
