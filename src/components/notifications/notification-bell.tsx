"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { Bell, Clock, Cake, AlertCircle, CheckCheck } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getNotifications,
  type NotificationsResult,
  type NotificationAppointment,
  type NotificationClient,
} from "@/app/actions/notifications";
import { formatDistanceToNow, parse, isToday } from "date-fns";

const STORAGE_KEY = "zaloon_read_notification_ids";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function notificationId(type: string, id: string) {
  return `${type}:${id}`;
}

function appointmentTimeLabel(apt: NotificationAppointment): string {
  const [h, m] = apt.startTime.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return isToday(new Date(apt.date + "T00:00:00"))
    ? `Today at ${apt.startTime}`
    : `${apt.date} at ${apt.startTime}`;
}

export function NotificationBell() {
  const [data, setData] = useState<NotificationsResult | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // Load data + read IDs on mount
  useEffect(() => {
    setReadIds(getReadIds());
    startTransition(async () => {
      const result = await getNotifications();
      setData(result);
    });
  }, []);

  const allNotifications: Array<{ id: string; type: "upcoming" | "birthday" | "overdue" }> =
    data
      ? [
          ...data.upcomingToday.map((a) => ({ id: notificationId("upcoming", a.id), type: "upcoming" as const })),
          ...data.birthdaysThisWeek.map((c) => ({ id: notificationId("birthday", c.id), type: "birthday" as const })),
          ...data.overdueAppointments.map((a) => ({
            id: notificationId("overdue", a.id),
            type: "overdue" as const,
          })),
        ]
      : [];

  const unreadCount = allNotifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = useCallback(() => {
    const newIds = new Set(readIds);
    allNotifications.forEach((n) => newIds.add(n.id));
    setReadIds(newIds);
    saveReadIds(newIds);
  }, [allNotifications, readIds]);

  const isRead = (id: string) => readIds.has(id);

  return (
    <Popover>
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
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
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
        </div>

        {/* Body */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
          {isPending && !data ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading notifications…
            </div>
          ) : allNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              All caught up! No notifications.
            </div>
          ) : (
            <>
              {/* Upcoming today */}
              {data && data.upcomingToday.length > 0 && (
                <section>
                  <p className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold bg-muted/40">
                    Upcoming (next 3 hours)
                  </p>
                  {data.upcomingToday.map((apt) => {
                    const nid = notificationId("upcoming", apt.id);
                    return (
                      <NotificationRow
                        key={nid}
                        read={isRead(nid)}
                        icon={<Clock className="w-4 h-4 text-blue-500" />}
                        message={
                          apt.client
                            ? `${apt.client.name} with ${apt.staff?.name ?? "Staff"}`
                            : `Walk-in with ${apt.staff?.name ?? "Staff"}`
                        }
                        time={appointmentTimeLabel(apt)}
                      />
                    );
                  })}
                </section>
              )}

              {/* Birthdays this week */}
              {data && data.birthdaysThisWeek.length > 0 && (
                <section>
                  <p className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold bg-muted/40">
                    Birthdays this week
                  </p>
                  {data.birthdaysThisWeek.map((client) => {
                    const nid = notificationId("birthday", client.id);
                    const bdayStr = client.birthday
                      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
                          client.birthday
                        )
                      : "";
                    return (
                      <NotificationRow
                        key={nid}
                        read={isRead(nid)}
                        icon={<Cake className="w-4 h-4 text-pink-500" />}
                        message={`${client.name}'s birthday`}
                        time={bdayStr}
                      />
                    );
                  })}
                </section>
              )}

              {/* Overdue / missed */}
              {data && data.overdueAppointments.length > 0 && (
                <section>
                  <p className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold bg-muted/40">
                    Missed / Overdue
                  </p>
                  {data.overdueAppointments.map((apt) => {
                    const nid = notificationId("overdue", apt.id);
                    return (
                      <NotificationRow
                        key={nid}
                        read={isRead(nid)}
                        icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
                        message={
                          apt.client
                            ? `${apt.client.name} with ${apt.staff?.name ?? "Staff"}`
                            : `Walk-in with ${apt.staff?.name ?? "Staff"}`
                        }
                        time={`${apt.date} at ${apt.startTime}`}
                        danger
                      />
                    );
                  })}
                </section>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ----- Row sub-component -----
function NotificationRow({
  icon,
  message,
  time,
  read,
  danger,
}: {
  icon: React.ReactNode;
  message: string;
  time: string;
  read: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        read ? "opacity-60" : "bg-background hover:bg-muted/50",
        danger && !read && "bg-amber-50/40 dark:bg-amber-900/10"
      )}
    >
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm text-foreground", !read && "font-medium")}>{message}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
      </div>
      {!read && (
        <div className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
      )}
    </div>
  );
}
