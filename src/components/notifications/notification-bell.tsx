"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  Clock,
  Cake,
  AlertCircle,
  BellRing,
  Package,
  ExternalLink,
  CheckCheck,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  getNotifications,
  type NotificationsResult,
  type NotificationAppointment,
  type NotificationClient,
  type NotificationReminder,
  type NotificationInventoryItem,
} from "@/app/actions/notifications";
import { isToday, format } from "date-fns";

// ── localStorage helpers ───────────────────────────────────────────────────────

const LAST_SEEN_KEY = "zaloon_notifications_last_seen";

function getLastSeen(): Date | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    return raw ? new Date(raw) : null;
  } catch {
    return null;
  }
}

function saveLastSeen(d: Date) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, d.toISOString());
  } catch {
    // ignore
  }
}

// ── label helpers ─────────────────────────────────────────────────────────────

function appointmentTimeLabel(apt: NotificationAppointment): string {
  return isToday(new Date(apt.date + "T00:00:00"))
    ? `Today at ${apt.startTime}`
    : `${apt.date} at ${apt.startTime}`;
}

function reminderLabel(r: NotificationReminder): string {
  const appt = r.Appointment;
  if (appt?.Client) return `${appt.Client.name} — ${appt.date} ${appt.startTime}`;
  return `${r.type} reminder`;
}

// ── sub-components ─────────────────────────────────────────────────────────────

type NotificationRowProps = {
  icon: React.ReactNode;
  message: string;
  sub: string;
  isNew: boolean;
  danger?: boolean;
  href?: string;
};

function NotificationRow({ icon, message, sub, isNew, danger, href }: NotificationRowProps) {
  const inner = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        isNew
          ? danger
            ? "bg-amber-50/60 dark:bg-amber-900/15 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            : "hover:bg-muted/50"
          : "opacity-55 hover:opacity-75 hover:bg-muted/30"
      )}
    >
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm text-foreground leading-snug", isNew && "font-medium")}>
          {message}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      {isNew && (
        <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block" prefetch={false}>
        {inner}
      </Link>
    );
  }
  return inner;
}

type SectionHeaderProps = {
  label: string;
  color: string; // tailwind text color class
};

function SectionHeader({ label, color }: SectionHeaderProps) {
  return (
    <p
      className={cn(
        "px-4 py-2 text-[11px] uppercase tracking-wider font-semibold bg-muted/40",
        color
      )}
    >
      {label}
    </p>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [data, setData] = useState<NotificationsResult | null>(null);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load persisted lastSeen and fetch data on mount
  useEffect(() => {
    setLastSeen(getLastSeen());
    startTransition(async () => {
      const result = await getNotifications();
      setData(result);
    });
  }, []);

  // When popover closes, bump lastSeen so everything seen becomes "read"
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        const now = new Date();
        setLastSeen(now);
        saveLastSeen(now);
      }
    },
    []
  );

  // A notification is "new" if lastSeen is null (first visit) or data was fetched after lastSeen
  // We use the fetch time as proxy — all items are new until the user opens the bell.
  // For a more granular check we use badgeCount from the server.
  const badgeCount = data?.badgeCount ?? 0;
  // Once opened once (lastSeen set), unread = items newer than lastSeen.
  // We approximate: if lastSeen exists and is within 5min of now, all are "read".
  const isNew = (createdAt?: Date | string) => {
    if (!lastSeen) return true;
    if (!createdAt) return true;
    return new Date(createdAt) > lastSeen;
  };

  const hasAny =
    data &&
    (data.upcomingToday.length > 0 ||
      data.overdueAppointments.length > 0 ||
      data.pendingReminders.length > 0 ||
      data.birthdaysThisWeek.length > 0 ||
      data.lowStockItems.length > 0);

  const markAllRead = useCallback(() => {
    const now = new Date();
    setLastSeen(now);
    saveLastSeen(now);
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className={cn(
            "relative flex items-center justify-center w-9 h-9 rounded-full",
            "hover:bg-muted transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <Bell className="w-5 h-5 text-foreground" />
          {badgeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          <div className="flex items-center gap-3">
            {badgeCount > 0 && (
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
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[460px] overflow-y-auto divide-y divide-border">
          {isPending && !data ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading notifications…
            </div>
          ) : !hasAny ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              All caught up! No notifications.
            </div>
          ) : (
            <>
              {/* ── Appointments: upcoming (amber) ── */}
              {data && data.upcomingToday.length > 0 && (
                <section>
                  <SectionHeader label="Appointments — next 2 hours" color="text-amber-600 dark:text-amber-400" />
                  {data.upcomingToday.map((apt) => (
                    <NotificationRow
                      key={`upcoming:${apt.id}`}
                      isNew={isNew(apt.date)}
                      icon={<Clock className="w-4 h-4 text-amber-500" />}
                      message={
                        apt.Client
                          ? `${apt.Client.name} with ${apt.Staff?.name ?? "Staff"}`
                          : `Walk-in with ${apt.Staff?.name ?? "Staff"}`
                      }
                      sub={appointmentTimeLabel(apt)}
                      href="/dashboard/appointments"
                    />
                  ))}
                </section>
              )}

              {/* ── Appointments: overdue (amber/danger) ── */}
              {data && data.overdueAppointments.length > 0 && (
                <section>
                  <SectionHeader label="Missed / Overdue" color="text-amber-700 dark:text-amber-300" />
                  {data.overdueAppointments.map((apt) => (
                    <NotificationRow
                      key={`overdue:${apt.id}`}
                      isNew={isNew(apt.date)}
                      icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
                      message={
                        apt.Client
                          ? `${apt.Client.name} with ${apt.Staff?.name ?? "Staff"}`
                          : `Walk-in with ${apt.Staff?.name ?? "Staff"}`
                      }
                      sub={`${apt.date} at ${apt.startTime}`}
                      danger
                      href="/dashboard/appointments"
                    />
                  ))}
                </section>
              )}

              {/* ── Reminders: pending (blue) ── */}
              {data && data.pendingReminders.length > 0 && (
                <section>
                  <SectionHeader label="Pending Reminders" color="text-blue-600 dark:text-blue-400" />
                  {data.pendingReminders.map((r) => (
                    <NotificationRow
                      key={`reminder:${r.id}`}
                      isNew={isNew(r.scheduledAt)}
                      icon={<BellRing className="w-4 h-4 text-blue-500" />}
                      message={reminderLabel(r)}
                      sub={`${r.type} · Due ${format(new Date(r.scheduledAt), "MMM d, h:mm a")}`}
                      href="/dashboard/reminders"
                    />
                  ))}
                </section>
              )}

              {/* ── Birthdays (pink) ── */}
              {data && data.birthdaysThisWeek.length > 0 && (
                <section>
                  <SectionHeader label="Birthdays this week" color="text-pink-600 dark:text-pink-400" />
                  {data.birthdaysThisWeek.map((client) => {
                    const bdayStr = client.birthday
                      ? new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                        }).format(client.birthday)
                      : "";
                    const todayBirthday =
                      client.birthday &&
                      client.birthday.getMonth() === new Date().getMonth() &&
                      client.birthday.getDate() === new Date().getDate();
                    return (
                      <NotificationRow
                        key={`birthday:${client.id}`}
                        isNew={isNew()} // birthdays are always "new" if present
                        icon={<Cake className="w-4 h-4 text-pink-500" />}
                        message={`${client.name}'s birthday${todayBirthday ? " 🎂 Today!" : ""}`}
                        sub={bdayStr}
                        href="/dashboard/clients"
                      />
                    );
                  })}
                </section>
              )}

              {/* ── Low Stock (orange) ── */}
              {data && data.lowStockItems.length > 0 && (
                <section>
                  <SectionHeader label="Low Stock" color="text-orange-600 dark:text-orange-400" />
                  {data.lowStockItems.map((item) => (
                    <NotificationRow
                      key={`stock:${item.id}`}
                      isNew={true}
                      icon={<Package className="w-4 h-4 text-orange-500" />}
                      message={item.name}
                      sub={`${item.quantity} ${item.unit} remaining (min: ${item.minQuantity})`}
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
