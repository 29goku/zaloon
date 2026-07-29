import Link from "next/link";
import { format, isToday } from "date-fns";
import {
  Clock,
  AlertCircle,
  BellRing,
  Cake,
  Package,
  ArrowRight,
  CheckCheck,
} from "lucide-react";
import { getNotifications } from "@/app/actions/notifications";
import { MarkAllReadButton } from "./mark-all-read-button";

export const metadata = { title: "Notification Center — Zaloon" };

// ── colour/config per category ────────────────────────────────────────────────

const categoryConfig = {
  appointments: {
    label: "Appointments",
    accent: "border-amber-400 dark:border-amber-500",
    headerBg: "bg-amber-50 dark:bg-amber-900/20",
    headerText: "text-amber-700 dark:text-amber-300",
    dotColor: "bg-amber-400",
  },
  reminders: {
    label: "Pending Reminders",
    accent: "border-blue-400 dark:border-blue-500",
    headerBg: "bg-blue-50 dark:bg-blue-900/20",
    headerText: "text-blue-700 dark:text-blue-300",
    dotColor: "bg-blue-400",
  },
  birthdays: {
    label: "Birthdays",
    accent: "border-pink-400 dark:border-pink-500",
    headerBg: "bg-pink-50 dark:bg-pink-900/20",
    headerText: "text-pink-700 dark:text-pink-300",
    dotColor: "bg-pink-400",
  },
  lowstock: {
    label: "Low Stock",
    accent: "border-orange-400 dark:border-orange-500",
    headerBg: "bg-orange-50 dark:bg-orange-900/20",
    headerText: "text-orange-700 dark:text-orange-300",
    dotColor: "bg-orange-400",
  },
} as const;

type CategoryKey = keyof typeof categoryConfig;

// ── helper: section wrapper ───────────────────────────────────────────────────

function Section({
  category,
  count,
  children,
}: {
  category: CategoryKey;
  count: number;
  children: React.ReactNode;
}) {
  const cfg = categoryConfig[category];
  if (count === 0) return null;
  return (
    <section className={`rounded-xl border border-border overflow-hidden`}>
      {/* Section header */}
      <div className={`flex items-center gap-3 px-5 py-3 border-b border-border ${cfg.headerBg}`}>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
        <h2 className={`text-sm font-semibold ${cfg.headerText}`}>{cfg.label}</h2>
        <span className="ml-auto text-xs text-muted-foreground font-medium">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
      {/* Items */}
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

// ── helper: individual notification row ───────────────────────────────────────

function NotifRow({
  icon,
  title,
  subtitle,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex items-start gap-4 px-5 py-4 bg-background hover:bg-muted/30 transition-colors">
      <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="flex-shrink-0 flex items-center gap-1 text-xs text-primary font-medium hover:underline whitespace-nowrap mt-0.5"
        >
          {actionLabel}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function NotificationsPage() {
  const data = await getNotifications();

  const totalCount =
    data.upcomingToday.length +
    data.overdueAppointments.length +
    data.pendingReminders.length +
    data.birthdaysThisWeek.length +
    data.lowStockItems.length;

  const now = new Date();

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount === 0
              ? "You're all caught up — nothing to action right now."
              : `${totalCount} ${totalCount === 1 ? "notification" : "notifications"} across all categories`}
          </p>
        </div>
        {totalCount > 0 && <MarkAllReadButton />}
      </div>

      {totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCheck className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm text-muted-foreground">All caught up! Check back later.</p>
        </div>
      )}

      {/* ── Appointments: upcoming ── */}
      <Section category="appointments" count={data.upcomingToday.length + data.overdueAppointments.length}>
        {data.upcomingToday.map((apt) => (
          <NotifRow
            key={`upcoming:${apt.id}`}
            icon={<Clock className="w-4 h-4 text-amber-500" />}
            title={
              apt.Client
                ? `${apt.Client.name} with ${apt.Staff?.name ?? "Staff"}`
                : `Walk-in with ${apt.Staff?.name ?? "Staff"}`
            }
            subtitle={
              isToday(new Date(apt.date + "T00:00:00"))
                ? `Today at ${apt.startTime}`
                : `${apt.date} at ${apt.startTime}`
            }
            actionLabel="View Appointment"
            actionHref="/dashboard/appointments"
          />
        ))}
        {data.overdueAppointments.map((apt) => (
          <NotifRow
            key={`overdue:${apt.id}`}
            icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
            title={`OVERDUE — ${
              apt.Client
                ? `${apt.Client.name} with ${apt.Staff?.name ?? "Staff"}`
                : `Walk-in with ${apt.Staff?.name ?? "Staff"}`
            }`}
            subtitle={`${apt.date} at ${apt.startTime} · was SCHEDULED`}
            actionLabel="View Appointment"
            actionHref="/dashboard/appointments"
          />
        ))}
      </Section>

      {/* ── Reminders: pending ── */}
      <Section category="reminders" count={data.pendingReminders.length}>
        {data.pendingReminders.map((r) => {
          const appt = r.Appointment;
          const title = appt?.Client
            ? `${appt.Client.name} — ${appt.date} at ${appt.startTime}`
            : r.type + " reminder";
          return (
            <NotifRow
              key={`reminder:${r.id}`}
              icon={<BellRing className="w-4 h-4 text-blue-500" />}
              title={title}
              subtitle={`${r.type} · Due ${format(new Date(r.scheduledAt), "MMM d, h:mm a")}`}
              actionLabel="Send Reminder"
              actionHref="/dashboard/reminders"
            />
          );
        })}
      </Section>

      {/* ── Birthdays ── */}
      <Section category="birthdays" count={data.birthdaysThisWeek.length}>
        {data.birthdaysThisWeek.map((client) => {
          const bdayStr = client.birthday
            ? format(
                new Date(now.getFullYear(), client.birthday.getMonth(), client.birthday.getDate()),
                "MMMM d"
              )
            : "";
          const todayBirthday =
            client.birthday &&
            client.birthday.getMonth() === now.getMonth() &&
            client.birthday.getDate() === now.getDate();
          return (
            <NotifRow
              key={`birthday:${client.id}`}
              icon={<Cake className="w-4 h-4 text-pink-500" />}
              title={`${client.name}${todayBirthday ? " 🎂 Today!" : ""}`}
              subtitle={bdayStr ? `Birthday on ${bdayStr}` : "Birthday this week"}
              actionLabel="View Client"
              actionHref={`/dashboard/clients`}
            />
          );
        })}
      </Section>

      {/* ── Low Stock ── */}
      <Section category="lowstock" count={data.lowStockItems.length}>
        {data.lowStockItems.map((item) => (
          <NotifRow
            key={`stock:${item.id}`}
            icon={<Package className="w-4 h-4 text-orange-500" />}
            title={item.name}
            subtitle={`${item.quantity} ${item.unit} in stock · minimum is ${item.minQuantity} ${item.unit} · category: ${item.category.replace(/_/g, " ").toLowerCase()}`}
          />
        ))}
      </Section>
    </div>
  );
}
