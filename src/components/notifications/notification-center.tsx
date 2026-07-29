"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Clock,
  AlertCircle,
  Star,
  Package,
  Cake,
  BellRing,
  Calendar,
  X,
  CheckCheck,
  ExternalLink,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { generateNotifications, type Notification } from "@/app/actions/reminders";

// ── localStorage helpers ───────────────────────────────────────────────────────

const READ_KEY = "zaloon-notifications-read";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

// ── Icon per notification type ────────────────────────────────────────────────

function NotifIcon({ type }: { type: Notification["type"] }) {
  switch (type) {
    case "appointment_upcoming":
      return <Clock className="w-4 h-4 text-amber-500" />;
    case "no_show":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case "review_received":
      return <Star className="w-4 h-4 text-yellow-500" />;
    case "low_stock":
      return <Package className="w-4 h-4 text-orange-500" />;
    case "birthday":
      return <Cake className="w-4 h-4 text-pink-500" />;
    case "pending_reminder":
      return <BellRing className="w-4 h-4 text-blue-500" />;
    case "time_off_request":
      return <Calendar className="w-4 h-4 text-purple-500" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

// ── Section label per type ────────────────────────────────────────────────────

function typeSection(type: Notification["type"]): string {
  switch (type) {
    case "appointment_upcoming": return "Upcoming Appointments";
    case "no_show": return "Possible No-Shows";
    case "review_received": return "New Reviews";
    case "low_stock": return "Low Stock";
    case "birthday": return "Birthdays Today";
    case "pending_reminder": return "Pending Reminders";
    case "time_off_request": return "Time-Off Requests";
    default: return "Other";
  }
}

// ── Notification row ──────────────────────────────────────────────────────────

function NotifRow({
  notification,
  isRead,
  onRead,
  onClose,
}: {
  notification: Notification;
  isRead: boolean;
  onRead: (id: string) => void;
  onClose: () => void;
}) {
  const inner = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors group",
        isRead
          ? "opacity-55 hover:opacity-80 hover:bg-muted/20"
          : "hover:bg-muted/40"
      )}
      onClick={() => onRead(notification.id)}
    >
      <div className="mt-0.5 flex-shrink-0">
        <NotifIcon type={notification.type} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", !isRead && "font-medium text-foreground", isRead && "text-muted-foreground")}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>
      {!isRead && (
        <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} onClick={onClose} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ── Main NotificationCenter component ─────────────────────────────────────────

export function NotificationCenter() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Load persisted read IDs on mount
  React.useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  // Fetch notifications on mount
  React.useEffect(() => {
    setLoading(true);
    generateNotifications()
      .then((data) => setNotifications(data))
      .catch(() => {
        // silently fail
      })
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function markRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }

  function markAllRead() {
    const next = new Set(notifications.map((n) => n.id));
    setReadIds(next);
    saveReadIds(next);
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
  }

  // Group notifications by type section
  const sections = React.useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const n of notifications) {
      const label = typeSection(n.type);
      const existing = map.get(label) ?? [];
      existing.push(n);
      map.set(label, existing);
    }
    return map;
  }, [notifications]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          className={cn(
            "relative flex items-center justify-center w-9 h-9 rounded-full",
            "hover:bg-muted transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <Link
              href="/dashboard/notifications"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[480px] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading notifications…
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <CheckCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">All caught up! No notifications.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {[...sections.entries()].map(([sectionLabel, items]) => (
                <section key={sectionLabel}>
                  <p className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted/40">
                    {sectionLabel}
                  </p>
                  {items.map((n) => (
                    <NotifRow
                      key={n.id}
                      notification={n}
                      isRead={readIds.has(n.id)}
                      onRead={markRead}
                      onClose={() => setOpen(false)}
                    />
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {notifications.length} total · {unreadCount} unread
            </span>
            <Link
              href="/dashboard/notifications"
              className="text-xs text-primary hover:underline font-medium"
              onClick={() => setOpen(false)}
            >
              Notification center
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
