import { Activity, CalendarDays, UserCircle, DollarSign, Megaphone, Star } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getRecentActivity } from "@/lib/activity-feed";
import {
  activityLabel,
  activityLink,
  relativeTime,
  type ActivityItem,
} from "@/lib/activity-feed-utils";
import { ExportCsvButton } from "@/components/activity/export-csv-button";

export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────────────────

type TypeFilter =
  | "all"
  | "appointments"
  | "clients"
  | "financial"
  | "campaigns"
  | "reviews";

type DateFilter =
  | "today"
  | "yesterday"
  | "7days"
  | "30days"
  | "all";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    date?: string;
  }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeFilterMatch(
  item: ActivityItem,
  filter: TypeFilter
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "appointments":
      return (
        item.type === "appointment_created" ||
        item.type === "appointment_completed" ||
        item.type === "appointment_cancelled"
      );
    case "clients":
      return item.type === "client_added" || item.type === "membership_started";
    case "financial":
      return (
        item.type === "invoice_paid" || item.type === "gift_card_purchased"
      );
    case "campaigns":
      return item.type === "campaign_sent";
    case "reviews":
      return item.type === "review_received";
    default:
      return true;
  }
}

function dateFilterMatch(item: ActivityItem, filter: DateFilter): boolean {
  const now = new Date();
  const then = new Date(item.timestamp);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(todayStart.getDate() - 7);
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(todayStart.getDate() - 30);

  switch (filter) {
    case "today":
      return then >= todayStart;
    case "yesterday":
      return then >= yesterdayStart && then < todayStart;
    case "7days":
      return then >= sevenDaysAgo;
    case "30days":
      return then >= thirtyDaysAgo;
    case "all":
      return true;
    default:
      return true;
  }
}

// ── Summary numbers ───────────────────────────────────────────────────────────

async function getTodaySummary() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [completed, scheduled, cancelled, revAgg, newClients, reviews] =
    await Promise.all([
      prisma.appointment.count({
        where: { date: today, status: "COMPLETED" },
      }),
      prisma.appointment.count({
        where: { date: today, status: "SCHEDULED" },
      }),
      prisma.appointment.count({
        where: { date: today, status: "CANCELLED" },
      }),
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.client.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.review.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

  return {
    completed,
    scheduled,
    cancelled,
    revenue: revAgg._sum.total ?? 0,
    newClients,
    reviews,
  };
}

// ── Filter bar chip ───────────────────────────────────────────────────────────

function FilterChip({
  label,
  href,
  active,
  icon,
}: {
  label: string;
  href: string;
  active: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

// ── Timeline item ─────────────────────────────────────────────────────────────

function TimelineItem({ item }: { item: ActivityItem }) {
  const label = activityLabel(item);
  const href = activityLink(item);
  const rel = relativeTime(item.timestamp);

  return (
    <div className="flex items-start gap-4 py-3 px-4 hover:bg-muted/20 transition-colors group">
      {/* Icon dot */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-muted/60 text-base select-none`}
        aria-hidden="true"
      >
        {item.icon ?? "•"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {item.detail && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.detail}
          </p>
        )}
        {item.amount != null && (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
            ${item.amount.toFixed(2)}
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-muted-foreground tabular-nums">{rel}</span>
        {href && (
          <Link
            href={href}
            className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium"
          >
            View →
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ActivityPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const rawType = sp.type ?? "all";
  const typeFilter: TypeFilter = [
    "all",
    "appointments",
    "clients",
    "financial",
    "campaigns",
    "reviews",
  ].includes(rawType)
    ? (rawType as TypeFilter)
    : "all";

  const rawDate = sp.date ?? "all";
  const dateFilter: DateFilter = [
    "today",
    "yesterday",
    "7days",
    "30days",
    "all",
  ].includes(rawDate)
    ? (rawDate as DateFilter)
    : "all";

  // Fetch more so filters have enough to work with
  const [allActivity, todaySummary, salon] = await Promise.all([
    getRecentActivity(200),
    getTodaySummary(),
    prisma.salon.findFirst({ select: { currency: true } }),
  ]);

  const currency = salon?.currency ?? "USD";
  const currencySymbol = currency === "USD" ? "$" : currency;

  // Apply filters
  const filtered = allActivity
    .filter((item) => typeFilterMatch(item, typeFilter))
    .filter((item) => dateFilterMatch(item, dateFilter));

  // URL builder
  function buildUrl(params: { type?: string; date?: string }) {
    const merged: Record<string, string> = {};
    if (typeFilter !== "all") merged.type = typeFilter;
    if (dateFilter !== "all") merged.date = dateFilter;
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== "all") {
        merged[k] = v;
      } else {
        delete merged[k];
      }
    });
    const qs = new URLSearchParams(merged).toString();
    return `/dashboard/activity${qs ? `?${qs}` : ""}`;
  }

  const TYPE_FILTERS: { key: TypeFilter; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <Activity className="w-3 h-3" /> },
    { key: "appointments", label: "Appointments", icon: <CalendarDays className="w-3 h-3" /> },
    { key: "clients", label: "Clients", icon: <UserCircle className="w-3 h-3" /> },
    { key: "financial", label: "Financial", icon: <DollarSign className="w-3 h-3" /> },
    { key: "campaigns", label: "Campaigns", icon: <Megaphone className="w-3 h-3" /> },
    { key: "reviews", label: "Reviews", icon: <Star className="w-3 h-3" /> },
  ];

  const DATE_FILTERS: { key: DateFilter; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "7days", label: "Last 7 days" },
    { key: "30days", label: "Last 30 days" },
    { key: "all", label: "All time" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Activity Log
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            A chronological record of everything happening in your salon
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/activity/staff"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/40 text-sm font-semibold text-foreground transition-colors"
          >
            Staff Report
          </Link>
          <ExportCsvButton items={filtered} />
        </div>
      </div>

      {/* ─── Today's summary ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Today&apos;s Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryTile
            label="Completed"
            value={todaySummary.completed}
            icon="✅"
            color="text-emerald-600 dark:text-emerald-400"
          />
          <SummaryTile
            label="Scheduled"
            value={todaySummary.scheduled}
            icon="📅"
            color="text-blue-600 dark:text-blue-400"
          />
          <SummaryTile
            label="Cancelled"
            value={todaySummary.cancelled}
            icon="❌"
            color="text-red-600 dark:text-red-400"
          />
          <SummaryTile
            label="Revenue"
            value={`${currencySymbol}${todaySummary.revenue.toFixed(0)}`}
            icon="💰"
            color="text-amber-600 dark:text-amber-400"
          />
          <SummaryTile
            label="New Clients"
            value={todaySummary.newClients}
            icon="👤"
            color="text-violet-600 dark:text-violet-400"
          />
          <SummaryTile
            label="Reviews"
            value={todaySummary.reviews}
            icon="⭐"
            color="text-yellow-600 dark:text-yellow-400"
          />
        </div>
      </div>

      {/* ─── Filters ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Type filter */}
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map(({ key, label, icon }) => (
            <FilterChip
              key={key}
              label={label}
              icon={icon}
              href={buildUrl({ type: key, date: rawDate })}
              active={typeFilter === key}
            />
          ))}
        </div>

        {/* Date filter */}
        <div className="flex flex-wrap gap-2">
          {DATE_FILTERS.map(({ key, label }) => (
            <FilterChip
              key={key}
              label={label}
              href={buildUrl({ type: rawType, date: key })}
              active={dateFilter === key}
            />
          ))}
        </div>
      </div>

      {/* ─── Timeline ─────────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Activity Timeline
          </h2>
          <span className="text-xs text-muted-foreground">
            {filtered.length} event{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No activity found for the selected filters.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {filtered.map((item) => (
              <TimelineItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Summary tile ──────────────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/40">
      <span className="text-base" aria-hidden="true">
        {icon}
      </span>
      <span className={`text-xl font-bold leading-none ${color}`}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
