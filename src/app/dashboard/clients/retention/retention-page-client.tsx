"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, AlertTriangle, UserX, BarChart3, ChevronDown, ChevronRight, Send, Users } from "lucide-react";
import { sendWinBackMessage, sendBulkWinBack } from "@/app/actions/clients";
import type {
  CohortRow,
  VisitFreqBucket,
  ValueTierCount,
  ClientRetentionSummary,
  AtRiskClientRow,
} from "./page";

// ─── Props ────────────────────────────────────────────────────────────────────

interface RetentionPageClientProps {
  summary: ClientRetentionSummary;
  cohorts: CohortRow[];
  visitFreqBuckets: VisitFreqBucket[];
  valueTiers: ValueTierCount;
  atRiskClients: AtRiskClientRow[];
  lostClients: AtRiskClientRow[];
  salonName: string;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
      <div className={`rounded-xl p-2.5 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Cohort Table ─────────────────────────────────────────────────────────────

function CohortTable({ cohorts }: { cohorts: CohortRow[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Retention Cohorts</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Clients grouped by how long ago they first visited</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cohort</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clients</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Visits</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Spend</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Returned %</th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Visit</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((row) => (
              <tr key={row.label} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3 font-medium text-foreground">{row.label}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{row.count}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{row.avgVisits}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {row.avgSpend > 0 ? `$${row.avgSpend}` : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-semibold tabular-nums ${
                      row.retentionRate >= 70
                        ? "text-emerald-400"
                        : row.retentionRate >= 40
                        ? "text-yellow-400"
                        : "text-rose-400"
                    }`}
                  >
                    {row.count > 0 ? `${row.retentionRate}%` : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 items-center text-xs">
                    {row.count > 0 ? (
                      <>
                        <span className="bg-emerald-900/60 text-emerald-300 rounded px-1.5 py-0.5" title="< 30 days">
                          {row.lastVisitBuckets.recent}
                        </span>
                        <span className="bg-yellow-900/60 text-yellow-300 rounded px-1.5 py-0.5" title="30-90 days">
                          {row.lastVisitBuckets.moderate}
                        </span>
                        <span className="bg-rose-900/60 text-rose-300 rounded px-1.5 py-0.5" title="90+ days">
                          {row.lastVisitBuckets.distant}
                        </span>
                        {row.lastVisitBuckets.none > 0 && (
                          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5" title="No visit">
                            {row.lastVisitBuckets.none}
                          </span>
                        )}
                        <span className="text-muted-foreground ml-1">recent/mid/old</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Visit Frequency Bar Chart (SVG) ─────────────────────────────────────────

function VisitFreqChart({ buckets }: { buckets: VisitFreqBucket[] }) {
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const chartH = 120;
  const barW = 52;
  const gap = 16;
  const totalW = buckets.length * (barW + gap) - gap;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-foreground">Visit Frequency Distribution</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Average days between consecutive visits per client</p>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${totalW + 8} ${chartH + 48}`}
          className="w-full"
          style={{ minWidth: `${totalW + 8}px` }}
          aria-label="Visit frequency distribution bar chart"
        >
          {/* Y axis guide lines */}
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <line
              key={pct}
              x1={0}
              y1={chartH - chartH * pct}
              x2={totalW + 4}
              y2={chartH - chartH * pct}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
              className="text-foreground"
            />
          ))}

          {buckets.map((b, i) => {
            const x = i * (barW + gap);
            const barH = maxCount > 0 ? (b.count / maxCount) * chartH : 0;
            const y = chartH - barH;
            return (
              <g key={b.label}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={6}
                  className="fill-primary opacity-80"
                />
                {/* Count label above bar */}
                {b.count > 0 && (
                  <text
                    x={x + barW / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    className="fill-foreground"
                  >
                    {b.count}
                  </text>
                )}
                {b.count === 0 && (
                  <text
                    x={x + barW / 2}
                    y={chartH - 4}
                    textAnchor="middle"
                    fontSize={11}
                    className="fill-muted-foreground"
                  >
                    0
                  </text>
                )}
                {/* X axis label */}
                <text
                  x={x + barW / 2}
                  y={chartH + 18}
                  textAnchor="middle"
                  fontSize={10}
                  className="fill-muted-foreground"
                >
                  {b.label.split(" ")[0]}
                </text>
                <text
                  x={x + barW / 2}
                  y={chartH + 30}
                  textAnchor="middle"
                  fontSize={10}
                  className="fill-muted-foreground"
                >
                  {b.label.split(" ").slice(1).join(" ")}
                </text>
              </g>
            );
          })}
          {/* Baseline */}
          <line
            x1={0}
            y1={chartH}
            x2={totalW + 4}
            y2={chartH}
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeWidth={1}
            className="text-foreground"
          />
        </svg>
      </div>
    </div>
  );
}

// ─── Value Tiers ──────────────────────────────────────────────────────────────

const TIER_CONFIG = [
  { key: "champion", label: "Champion", desc: "10+ visits, active < 60d", color: "bg-yellow-400/20 border-yellow-400/40 text-yellow-300" },
  { key: "loyal", label: "Loyal", desc: "5-9 visits, active < 90d", color: "bg-emerald-400/20 border-emerald-400/40 text-emerald-300" },
  { key: "potential", label: "Potential", desc: "2-4 visits", color: "bg-blue-400/20 border-blue-400/40 text-blue-300" },
  { key: "newClients", label: "New", desc: "1 visit", color: "bg-purple-400/20 border-purple-400/40 text-purple-300" },
  { key: "atRisk", label: "At Risk", desc: "Last visit 45-90 days ago", color: "bg-orange-400/20 border-orange-400/40 text-orange-300" },
  { key: "lost", label: "Lost", desc: "Last visit 90+ days ago", color: "bg-rose-400/20 border-rose-400/40 text-rose-300" },
] as const;

function ValueTiers({ tiers, total }: { tiers: ValueTierCount; total: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-foreground">Client Value Tiers</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{total} total clients</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TIER_CONFIG.map(({ key, label, desc, color }) => {
          const count = tiers[key as keyof ValueTierCount];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={key} className={`rounded-xl border p-4 ${color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</span>
                <span className="text-xs opacity-60">{pct}%</span>
              </div>
              <p className="text-3xl font-bold leading-none">{count}</p>
              <p className="text-xs mt-1 opacity-60">{desc}</p>
              {/* Mini bar */}
              <div className="mt-3 h-1 rounded-full bg-current opacity-20">
                <div
                  className="h-full rounded-full bg-current opacity-60"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Client Action Row ────────────────────────────────────────────────────────

function ClientActionRow({
  client,
  actionLabel,
  onAction,
  pending,
}: {
  client: AtRiskClientRow;
  actionLabel: string;
  onAction: (id: string) => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-sm">
        {client.name[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{client.name}</p>
        <p className="text-xs text-muted-foreground">
          {client.phone ?? client.email ?? "No contact"} · {client.totalVisits} visit{client.totalVisits !== 1 ? "s" : ""} · avg ${Math.round(client.avgSpend)}
        </p>
      </div>
      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-sm font-semibold text-foreground">{client.daysSince}d ago</p>
        <p className="text-xs text-muted-foreground">{client.lastVisitDate}</p>
      </div>
      <button
        onClick={() => onAction(client.id)}
        disabled={pending}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        <Send className="w-3 h-3" />
        {actionLabel}
      </button>
    </div>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  subtitle,
  count,
  children,
  defaultOpen = false,
  accentClass,
  bulkAction,
}: {
  title: string;
  subtitle: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentClass: string;
  bulkAction?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/20 transition-colors text-left"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${accentClass}`} />
        <span className="flex-1 min-w-0">
          <span className="font-semibold text-foreground">{title}</span>
          <span className="text-muted-foreground text-sm ml-2">{subtitle}</span>
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${accentClass} bg-opacity-20`}>
          {count}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border">
          {bulkAction && (
            <div className="px-5 py-3 border-b border-border/50 flex justify-end">
              {bulkAction}
            </div>
          )}
          <div className="px-5 py-2">
            {count === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No clients in this category.</p>
            ) : (
              children
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function RetentionPageClient({
  summary,
  cohorts,
  visitFreqBuckets,
  valueTiers,
  atRiskClients,
  lostClients,
}: RetentionPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bulkPending, setBulkPending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSend(clientId: string) {
    startTransition(async () => {
      const res = await sendWinBackMessage(clientId);
      if (res.success) {
        showToast("Win-back message scheduled!", true);
        router.refresh();
      } else {
        showToast(res.error ?? "Failed to send message", false);
      }
    });
  }

  async function handleBulkSend(clientIds: string[]) {
    setBulkPending(true);
    try {
      const res = await sendBulkWinBack(clientIds);
      showToast(`Sent ${res.sent}, failed ${res.failed}`, res.failed === 0);
      router.refresh();
    } finally {
      setBulkPending(false);
    }
  }

  const totalClients =
    valueTiers.champion +
    valueTiers.loyal +
    valueTiers.potential +
    valueTiers.newClients +
    valueTiers.atRisk +
    valueTiers.lost;

  return (
    <div className="p-4 md:p-8 space-y-6 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
            toast.ok
              ? "bg-emerald-950 border-emerald-800 text-emerald-300"
              : "bg-rose-950 border-rose-800 text-rose-300"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Client Retention</h1>
        <p className="text-muted-foreground mt-1">Track retention, identify at-risk clients, and win them back</p>
      </div>

      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Retention Rate"
          value={`${summary.retentionRate}%`}
          sub="Clients with 2+ visits"
          color="bg-emerald-500/10 text-emerald-400"
          icon={TrendingUp}
        />
        <StatCard
          label="Avg Visit Frequency"
          value={summary.avgVisitFrequencyDays > 0 ? `${summary.avgVisitFrequencyDays}d` : "—"}
          sub="Days between visits"
          color="bg-blue-500/10 text-blue-400"
          icon={BarChart3}
        />
        <StatCard
          label="At-Risk Clients"
          value={summary.atRiskCount}
          sub="Last visit 45-90 days ago"
          color="bg-orange-500/10 text-orange-400"
          icon={AlertTriangle}
        />
        <StatCard
          label="Lost Clients"
          value={summary.lostCount}
          sub="Last visit 90+ days ago"
          color="bg-rose-500/10 text-rose-400"
          icon={UserX}
        />
      </div>

      {/* Cohort table */}
      <CohortTable cohorts={cohorts} />

      {/* Visit frequency chart */}
      <VisitFreqChart buckets={visitFreqBuckets} />

      {/* Value tiers */}
      <ValueTiers tiers={valueTiers} total={totalClients} />

      {/* At-risk section */}
      <CollapsibleSection
        title="At-Risk Clients"
        subtitle="Last visit 45-90 days ago, no upcoming appointment"
        count={atRiskClients.length}
        accentClass="bg-orange-400"
        defaultOpen={atRiskClients.length > 0}
        bulkAction={
          atRiskClients.length > 0 ? (
            <button
              onClick={() => handleBulkSend(atRiskClients.map((c) => c.id))}
              disabled={bulkPending || isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/15 text-orange-300 border border-orange-500/30 text-sm font-medium hover:bg-orange-500/25 transition-colors disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              Send to all at-risk ({atRiskClients.length})
            </button>
          ) : undefined
        }
      >
        {atRiskClients.map((c) => (
          <ClientActionRow
            key={c.id}
            client={c}
            actionLabel="Win-back"
            onAction={handleSend}
            pending={isPending}
          />
        ))}
      </CollapsibleSection>

      {/* Lost clients section */}
      <CollapsibleSection
        title="Lost Clients"
        subtitle="Last visit 90+ days ago, no upcoming appointment"
        count={lostClients.length}
        accentClass="bg-rose-400"
        defaultOpen={false}
        bulkAction={
          lostClients.length > 0 ? (
            <button
              onClick={() => handleBulkSend(lostClients.map((c) => c.id))}
              disabled={bulkPending || isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-sm font-medium hover:bg-rose-500/25 transition-colors disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              Reactivate all ({lostClients.length})
            </button>
          ) : undefined
        }
      >
        {lostClients.map((c) => (
          <ClientActionRow
            key={c.id}
            client={c}
            actionLabel="Reactivate"
            onAction={handleSend}
            pending={isPending}
          />
        ))}
      </CollapsibleSection>
    </div>
  );
}
