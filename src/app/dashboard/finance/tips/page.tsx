import { getTipSummary, getTipStats, getRecentTips } from "@/app/actions/tips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, Percent } from "lucide-react";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// ── Trend badge ───────────────────────────────────────────────────────────────

function TrendBadge({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        positive ? "text-emerald-500" : "text-red-500"
      }`}
    >
      {positive ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TipsDashboardPage() {
  // Current month range
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Last month range (for trend)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [stats, lastMonthStats, summary, recentTips] = await Promise.all([
    getTipStats(monthStart, monthEnd),
    getTipStats(lastMonthStart, lastMonthEnd),
    getTipSummary(monthStart, monthEnd),
    getRecentTips(20),
  ]);

  // Sort summary by total tips desc
  const sortedSummary = [...summary].sort((a, b) => b.totalTips - a.totalTips);

  // Find top tipper
  const topTipper = sortedSummary[0]?.staffName ?? "—";

  // Trend vs last month
  const totalTrendPct =
    lastMonthStats.totalTips > 0
      ? ((stats.totalTips - lastMonthStats.totalTips) / lastMonthStats.totalTips) * 100
      : 0;

  // Last month per-staff map for trend
  const [lastMonthSummary] = await Promise.all([getTipSummary(lastMonthStart, lastMonthEnd)]);
  const lastMonthByStaff = new Map(lastMonthSummary.map((s) => [s.staffId, s]));

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tips</h1>
        <p className="text-muted-foreground mt-1">
          {now.toLocaleDateString("en", { month: "long", year: "numeric" })} — tip analytics across all staff
        </p>
      </div>

      {/* ── Header stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Tips This Month</p>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{fmt(stats.totalTips)}</p>
            <div className="mt-1">
              <TrendBadge value={totalTrendPct} />
              <span className="text-xs text-muted-foreground ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Tip Per Visit</p>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{fmt(stats.avgTip)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              from {stats.tipCount} tipped visit{stats.tipCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Top Tipper</p>
              <Users className="w-4 h-4 text-violet-500" />
            </div>
            <p className="text-2xl font-bold text-foreground truncate">{topTipper}</p>
            {sortedSummary[0] && (
              <p className="text-xs text-muted-foreground mt-1">
                {fmt(sortedSummary[0].totalTips)} this month
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Tip Rate</p>
              <Percent className="w-4 h-4 text-[#F48E16]" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.tipRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">of paid visits include a tip</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Staff tip table ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Staff Tip Breakdown — This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedSummary.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No tips recorded this month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Total Tips</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Avg Tip</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right"># of Tips</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">% of Revenue</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSummary.map((row) => {
                    const last = lastMonthByStaff.get(row.staffId);
                    const trend =
                      last && last.totalTips > 0
                        ? ((row.totalTips - last.totalTips) / last.totalTips) * 100
                        : 0;

                    return (
                      <tr
                        key={row.staffId}
                        className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                      >
                        <td className="py-3 pr-4 font-semibold text-foreground">
                          {row.staffName}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums font-semibold text-emerald-500">
                          {fmt(row.totalTips)}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums text-foreground">
                          {fmt(row.avgTip)}
                        </td>
                        <td className="py-3 pr-4 text-right text-foreground">
                          {row.tipCount}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, row.tipsAsPercentOfRevenue).toFixed(1)}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground text-xs w-10 text-right tabular-nums">
                              {row.tipsAsPercentOfRevenue.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <TrendBadge value={trend} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent tips list ─────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Recent Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No tips recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Tip</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Invoice Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTips.map((tip) => (
                    <tr
                      key={tip.invoiceId}
                      className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                    >
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                        {new Date(tip.date).toLocaleDateString("en", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-2.5 pr-4 text-foreground font-medium">
                        {tip.clientName}
                      </td>
                      <td className="py-2.5 pr-4 text-foreground">{tip.staffName}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground truncate max-w-[140px]">
                        {tip.serviceName}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-emerald-500 tabular-nums">
                        {fmt(tip.tipAmount)}
                      </td>
                      <td className="py-2.5 text-right text-foreground tabular-nums">
                        {fmt(tip.invoiceTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
