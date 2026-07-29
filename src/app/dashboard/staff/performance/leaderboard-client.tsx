"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Target,
  Crown,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { saveStaffGoals } from "@/app/actions/settings";

// ── types ─────────────────────────────────────────────────────────────────────

export interface StaffStat {
  id: string;
  name: string;
  role: string;
  commissionPct: number;
  currentMonth: {
    appointments: number;
    revenue: number;
    avgTicket: number;
    commission: number;
  };
  lastMonth: {
    revenue: number;
  };
  attendanceRate: number; // shifts worked / scheduled * 100
  avgRating: number;
  reviewCount: number;
}

type SortKey = "rank" | "appointments" | "revenue" | "rating" | "commission" | "attendance";
type SortDir = "asc" | "desc";

// ── helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-violet-500/20 text-violet-400",
  "bg-blue-500/20 text-blue-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-rose-500/20 text-rose-400",
  "bg-amber-500/20 text-amber-400",
  "bg-cyan-500/20 text-cyan-400",
  "bg-fuchsia-500/20 text-fuchsia-400",
  "bg-orange-500/20 text-orange-400",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

// ── Leaderboard Table ─────────────────────────────────────────────────────────

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}

function SortHeader({ label, sortKey, currentSort, dir, onSort, align = "right" }: SortHeaderProps) {
  const active = currentSort === sortKey;
  const Icon = active ? (dir === "desc" ? ChevronDown : ChevronUp) : ChevronsUpDown;
  return (
    <th
      className={`px-4 py-3 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(sortKey)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {label}
        <Icon className={`w-3.5 h-3.5 ${active ? "text-primary" : "text-muted-foreground/50"}`} />
      </span>
    </th>
  );
}

// ── Goals Modal ───────────────────────────────────────────────────────────────

interface GoalsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staff: StaffStat[];
  goals: Record<string, number>;
  onSaved: (goals: Record<string, number>) => void;
  fmt: (n: number) => string;
}

function GoalsModal({ open, onOpenChange, staff, goals, onSaved, fmt }: GoalsModalProps) {
  const [localGoals, setLocalGoals] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      staff.map((s) => [s.id, goals[s.id] != null ? String(goals[s.id]) : ""])
    )
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const parsed: Record<string, number> = {};
    for (const [id, val] of Object.entries(localGoals)) {
      const n = parseFloat(val);
      if (!isNaN(n) && n >= 0) parsed[id] = n;
    }
    startTransition(async () => {
      const res = await saveStaffGoals(parsed);
      if (res.success) {
        onSaved(parsed);
        onOpenChange(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Set Monthly Revenue Goals
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-80 overflow-y-auto py-2 pr-1">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(s.name)}`}>
                {getInitials(s.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                {goals[s.id] != null && (
                  <p className="text-xs text-muted-foreground">Current: {fmt(goals[s.id])}</p>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="Target"
                value={localGoals[s.id] ?? ""}
                onChange={(e) =>
                  setLocalGoals((prev) => ({ ...prev, [s.id]: e.target.value }))
                }
                className="w-28 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 text-right"
              />
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save Goals"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

interface LeaderboardClientProps {
  staff: StaffStat[];
  initialGoals: Record<string, number>;
  currency: string;
}

export function LeaderboardClient({ staff, initialGoals, currency }: LeaderboardClientProps) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [goals, setGoals] = useState<Record<string, number>>(initialGoals);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...staff].sort((a, b) => {
    let diff = 0;
    switch (sortKey) {
      case "rank":
      case "revenue":
        diff = a.currentMonth.revenue - b.currentMonth.revenue;
        break;
      case "appointments":
        diff = a.currentMonth.appointments - b.currentMonth.appointments;
        break;
      case "rating":
        diff = a.avgRating - b.avgRating;
        break;
      case "commission":
        diff = a.currentMonth.commission - b.currentMonth.commission;
        break;
      case "attendance":
        diff = a.attendanceRate - b.attendanceRate;
        break;
    }
    return sortDir === "desc" ? -diff : diff;
  });

  // Revenue-ranked list (always desc) for rank column
  const revenueRanked = [...staff]
    .sort((a, b) => b.currentMonth.revenue - a.currentMonth.revenue)
    .map((s, i) => [s.id, i + 1] as const);
  const rankMap = Object.fromEntries(revenueRanked);

  return (
    <>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">Leaderboard</h2>
          <span className="text-sm text-muted-foreground">this month</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setGoalsOpen(true)}>
          <Target className="w-3.5 h-3.5" />
          Set Goals
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-x-auto mb-10">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <SortHeader label="Rank" sortKey="rank" currentSort={sortKey} dir={sortDir} onSort={handleSort} align="left" />
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Staff</th>
              <SortHeader label="Appts" sortKey="appointments" currentSort={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Revenue" sortKey="revenue" currentSort={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Avg Rating" sortKey="rating" currentSort={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Commission" sortKey="commission" currentSort={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Attendance" sortKey="attendance" currentSort={sortKey} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-muted-foreground">
                  No staff data found.
                </td>
              </tr>
            ) : (
              sorted.map((row, idx) => {
                const rank = rankMap[row.id] ?? idx + 1;
                const trend = row.currentMonth.revenue - row.lastMonth.revenue;
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          rank === 1
                            ? "text-amber-500"
                            : rank === 2
                            ? "text-slate-400"
                            : rank === 3
                            ? "text-orange-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        #{rank}
                      </span>
                    </td>

                    {/* Staff */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(row.name)}`}>
                          {getInitials(row.name)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.role}</p>
                        </div>
                      </div>
                    </td>

                    {/* Appointments */}
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                      {row.currentMonth.appointments}
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="tabular-nums font-semibold text-primary">
                          {fmt(row.currentMonth.revenue)}
                        </span>
                        <span className={`text-xs flex items-center gap-0.5 tabular-nums ${trend > 0 ? "text-emerald-500" : trend < 0 ? "text-[#F41666]" : "text-muted-foreground"}`}>
                          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {trend !== 0 ? fmt(Math.abs(trend)) : "—"}
                        </span>
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3 text-right">
                      {row.reviewCount > 0 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <StarDisplay rating={row.avgRating} size="xs" />
                          <span className="text-xs text-muted-foreground">
                            {row.avgRating.toFixed(1)} ({row.reviewCount})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No reviews</span>
                      )}
                    </td>

                    {/* Commission */}
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                      {fmt(row.currentMonth.commission)}
                    </td>

                    {/* Attendance */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`tabular-nums font-medium text-sm ${
                            row.attendanceRate >= 90
                              ? "text-emerald-500"
                              : row.attendanceRate >= 70
                              ? "text-[#F48E16]"
                              : "text-[#F41666]"
                          }`}
                        >
                          {row.attendanceRate.toFixed(0)}%
                        </span>
                        <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              row.attendanceRate >= 90
                                ? "bg-emerald-500"
                                : row.attendanceRate >= 70
                                ? "bg-[#F48E16]"
                                : "bg-[#F41666]"
                            }`}
                            style={{ width: `${Math.min(100, row.attendanceRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Individual Performance Cards */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-bold text-foreground">Individual Performance</h2>
        <span className="text-sm text-muted-foreground">this month</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
        {sorted.map((s) => {
          const rank = rankMap[s.id] ?? 0;
          const trend = s.currentMonth.revenue - s.lastMonth.revenue;
          const goal = goals[s.id];
          const goalPct = goal && goal > 0 ? Math.min(100, (s.currentMonth.revenue / goal) * 100) : null;
          return (
            <div
              key={s.id}
              className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 hover:border-border/80 hover:bg-card/80 transition-colors"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(s.name)}`}>
                    {getInitials(s.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  </div>
                </div>
                <span
                  className={`text-sm font-bold ${
                    rank === 1 ? "text-amber-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-orange-600" : "text-muted-foreground/60"
                  }`}
                >
                  #{rank}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/40 rounded-lg py-2 px-1">
                  <p className="text-base font-bold text-foreground tabular-nums">{s.currentMonth.appointments}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Appts</p>
                </div>
                <div className="bg-muted/40 rounded-lg py-2 px-1">
                  <p className="text-base font-bold text-primary tabular-nums truncate">{fmt(s.currentMonth.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Revenue</p>
                </div>
                <div className="bg-muted/40 rounded-lg py-2 px-1">
                  <p className="text-base font-bold text-foreground tabular-nums truncate">
                    {s.currentMonth.appointments > 0 ? fmt(s.currentMonth.avgTicket) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Avg Ticket</p>
                </div>
              </div>

              {/* Rating + Trend */}
              <div className="flex items-center justify-between">
                <div>
                  {s.reviewCount > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <StarDisplay rating={s.avgRating} size="xs" />
                      <span className="text-xs text-muted-foreground">{s.avgRating.toFixed(1)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No reviews yet</span>
                  )}
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? "text-emerald-500" : trend < 0 ? "text-[#F41666]" : "text-muted-foreground"}`}>
                  {trend > 0 ? (
                    <><TrendingUp className="w-3.5 h-3.5" />{fmt(trend)} vs last month</>
                  ) : trend < 0 ? (
                    <><TrendingDown className="w-3.5 h-3.5" />{fmt(Math.abs(trend))} vs last month</>
                  ) : (
                    <><Minus className="w-3 h-3" />Same as last month</>
                  )}
                </div>
              </div>

              {/* Goal Progress */}
              {goalPct !== null && goal != null && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Goal: {fmt(goal)}</span>
                    <span className={`font-semibold ${goalPct >= 100 ? "text-emerald-500" : goalPct >= 75 ? "text-[#F48E16]" : "text-foreground"}`}>
                      {goalPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        goalPct >= 100 ? "bg-emerald-500" : goalPct >= 75 ? "bg-[#F48E16]" : "bg-primary"
                      }`}
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* View Profile link */}
              <Link
                href={`/dashboard/staff/${s.id}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors mt-auto pt-1 inline-flex items-center gap-1"
              >
                View profile &rarr;
              </Link>
            </div>
          );
        })}
      </div>

      {/* Goals Modal */}
      <GoalsModal
        open={goalsOpen}
        onOpenChange={setGoalsOpen}
        staff={staff}
        goals={goals}
        onSaved={setGoals}
        fmt={fmt}
      />
    </>
  );
}
