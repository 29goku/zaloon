"use client";

import * as React from "react";
import { Download, Search, TrendingDown, TrendingUp, Users, DollarSign, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type HistoryAppointment = {
  id: string;
  date: string;
  startTime: string;
  totalAmount: number;
  status: string;
  client: { id: string; name: string } | null;
  staff: { id: string; name: string };
  services: {
    service: { id: string; name: string; price: number };
    staff?: { id: string; name: string } | null;
  }[];
};

export type HistoryStats = {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  avgTicket: number;
};

interface AppointmentHistoryTableProps {
  appointments: HistoryAppointment[];
  staff: { id: string; name: string }[];
  currency: string;
  stats: HistoryStats;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-Show",
};

const STATUS_CLASS: Record<string, string> = {
  COMPLETED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  NO_SHOW: "bg-muted text-muted-foreground",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function getMonthKey(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  return `${year}-${month}`;
}

function formatMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en", { month: "long", year: "numeric" });
}

function exportToCSV(appointments: HistoryAppointment[], currency: string) {
  const headers = ["Date", "Time", "Client", "Staff", "Services", "Amount", "Status"];
  const rows = appointments.map((a) => [
    a.date,
    a.startTime,
    a.client?.name ?? "Walk-in",
    a.staff.name,
    a.services.map((s) => s.service.name).join("; "),
    a.totalAmount.toFixed(2),
    STATUS_LABEL[a.status] ?? a.status,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `appointment-history-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Stats Panel ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-secondary/50 p-4 flex flex-col gap-2">
      <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", accent ?? "bg-primary/10")}>
        <Icon className={cn("w-4 h-4", accent ? "text-foreground" : "text-primary")} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatsSidebar({ stats, currency }: { stats: HistoryStats; currency: string }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 0 }).format(n);

  return (
    <aside className="w-full lg:w-64 xl:w-72 shrink-0">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Analytics
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
        <StatCard
          label="Total appointments"
          value={stats.total.toString()}
          icon={Users}
          accent="bg-primary/10"
        />
        <StatCard
          label="Completion rate"
          value={`${stats.completionRate.toFixed(1)}%`}
          sub={`${stats.completed} completed`}
          icon={CheckCircle2}
          accent="bg-emerald-500/15"
        />
        <StatCard
          label="Cancellation rate"
          value={`${stats.cancellationRate.toFixed(1)}%`}
          sub={`${stats.cancelled} cancelled`}
          icon={TrendingDown}
          accent="bg-rose-500/15"
        />
        <StatCard
          label="No-show rate"
          value={`${stats.noShowRate.toFixed(1)}%`}
          sub={`${stats.noShow} no-shows`}
          icon={TrendingUp}
          accent="bg-amber-500/15"
        />
        <StatCard
          label="Avg ticket (completed)"
          value={stats.completed > 0 ? fmt(stats.avgTicket) : "—"}
          icon={DollarSign}
          accent="bg-primary/10"
        />
      </div>
    </aside>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type SortField = "date" | "client" | "amount";
type SortDir = "asc" | "desc";
type StatusFilter = "ALL" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No-Show" },
];

export function AppointmentHistoryTable({
  appointments,
  staff,
  currency,
  stats,
}: AppointmentHistoryTableProps) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [staffFilter, setStaffFilter] = React.useState<string>("ALL");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sortField, setSortField] = React.useState<SortField>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 0 }).format(n);

  // ── Filter & sort ───────────────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    let list = [...appointments];

    if (statusFilter !== "ALL") {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (staffFilter !== "ALL") {
      list = list.filter((a) => a.staff.id === staffFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => (a.client?.name ?? "walk-in").toLowerCase().includes(q));
    }

    if (dateFrom) {
      list = list.filter((a) => a.date >= dateFrom);
    }

    if (dateTo) {
      list = list.filter((a) => a.date <= dateTo);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
      } else if (sortField === "client") {
        cmp = (a.client?.name ?? "").localeCompare(b.client?.name ?? "");
      } else if (sortField === "amount") {
        cmp = a.totalAmount - b.totalAmount;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [appointments, statusFilter, staffFilter, search, dateFrom, dateTo, sortField, sortDir]);

  // ── Group by month ──────────────────────────────────────────────────────────

  const monthGroups = React.useMemo(() => {
    const groups: Record<string, HistoryAppointment[]> = {};
    for (const appt of filtered) {
      const key = getMonthKey(appt.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(appt);
    }
    // Sort months descending
    const sortedKeys = Object.keys(groups).sort().reverse();
    return sortedKeys.map((key) => ({ key, label: formatMonthKey(key), items: groups[key] }));
  }, [filtered]);

  // ── Sort toggle ─────────────────────────────────────────────────────────────

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="text-muted-foreground/40 ml-1">↕</span>;
    return <span className="text-primary ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── Table side ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Filters toolbar */}
        <div className="flex flex-col gap-3 mb-5">
          {/* Row 1: search + export */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by client name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(filtered, currency)}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>

          {/* Row 2: status filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                  statusFilter === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
                )}
              >
                {label}
              </button>
            ))}

            {/* Staff filter */}
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="text-sm bg-secondary border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-7"
              >
                <option value="ALL">All staff</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {/* Date range */}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm bg-secondary border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-7"
                title="From date"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm bg-secondary border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-7"
                title="To date"
              />
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-3">
          Showing {filtered.length} of {appointments.length} appointments
        </p>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No appointments match your filters</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_2fr_90px_100px] gap-4 px-4 pb-1 border-b border-border">
              <button
                onClick={() => toggleSort("date")}
                className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
              >
                Date <SortIcon field="date" />
              </button>
              <button
                onClick={() => toggleSort("client")}
                className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
              >
                Client <SortIcon field="client" />
              </button>
              <span className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Staff
              </span>
              <span className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Services
              </span>
              <button
                onClick={() => toggleSort("amount")}
                className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
              >
                Amount <SortIcon field="amount" />
              </button>
              <span className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </span>
            </div>

            {/* Month-grouped rows */}
            {monthGroups.map(({ key, label, items }) => (
              <div key={key}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="flex-1 h-px bg-border" />
                  {label}
                  <span className="text-muted-foreground/60">({items.length})</span>
                  <span className="flex-1 h-px bg-border" />
                </p>

                <div className="space-y-2">
                  {items.map((appt) => (
                    <div
                      key={appt.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_2fr_90px_100px] gap-4 items-center p-4 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
                    >
                      {/* Date + time */}
                      <div>
                        <p className="text-sm font-medium text-foreground">{formatDate(appt.date)}</p>
                        <p className="text-xs text-muted-foreground">{appt.startTime}</p>
                      </div>

                      {/* Client */}
                      <p className="text-sm text-foreground">
                        {appt.client?.name ?? <span className="text-muted-foreground italic">Walk-in</span>}
                      </p>

                      {/* Staff */}
                      <p className="text-sm text-muted-foreground">{appt.staff.name}</p>

                      {/* Services */}
                      <p className="text-xs text-muted-foreground truncate">
                        {appt.services.map((s) => s.service.name).join(", ") || "—"}
                      </p>

                      {/* Amount */}
                      <p className="text-sm font-semibold text-foreground text-right">
                        {fmt(appt.totalAmount)}
                      </p>

                      {/* Status badge */}
                      <div className="flex justify-end">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            STATUS_CLASS[appt.status] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {STATUS_LABEL[appt.status] ?? appt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Stats sidebar ──────────────────────────────────────────────────── */}
      <StatsSidebar stats={stats} currency={currency} />
    </div>
  );
}
