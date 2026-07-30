import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserPlus,
  RefreshCw,
  TrendingUp,
  Heart,
  Calendar,
  Star,
} from "lucide-react";

/** Force dynamic rendering — data must be fresh on every request. */
export const dynamic = "force-dynamic";

// ── helpers ───────────────────────────────────────────────────────────────────

/** Returns the date portion of a Date as a "YYYY-MM-DD" string. */
function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Returns a currency formatter for `currency` (e.g. "USD").
 * Whole-dollar formatting — no cents displayed.
 */
function makeFmt(currency: string) {
  return (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
}

/** Returns `num / den` as a whole-number percentage, or 0 when `den` is 0. */
function pct(num: number, den: number): number {
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

// ── Acquisition SVG bar chart ─────────────────────────────────────────────────

/**
 * SVG bar chart showing new-client counts for each of the last 6 calendar months.
 * Renders inline so it inherits theme colors via `currentColor` / CSS variables.
 */
function AcquisitionChart({ data }: { data: { label: string; count: number }[] }) {
  const W = 600;
  const H = 200;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 48;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const barGap = 8;
  const barW = (chartW - barGap * (data.length - 1)) / data.length;
  const yTicks = 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="New Client Acquisition Last 6 Months">
      {/* Y grid lines & labels */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = Math.round((maxVal / yTicks) * i);
        const y = padT + chartH - (i / yTicks) * chartH;
        return (
          <g key={i}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={10}
              fill="currentColor"
              fillOpacity={0.5}
            >
              {val}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x = padL + i * (barW + barGap);
        const barH = maxVal === 0 ? 0 : (d.count / maxVal) * chartH;
        const y = padT + chartH - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(barH, 2)}
              rx={3}
              fill="hsl(var(--primary))"
              fillOpacity={0.85}
            >
              <title>{`${d.label}: ${d.count} new clients`}</title>
            </rect>
            {/* Count label on top of bar */}
            {d.count > 0 && (
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={11}
                fill="currentColor"
                fillOpacity={0.7}
              >
                {d.count}
              </text>
            )}
            {/* Month label */}
            <text
              x={x + barW / 2}
              y={H - padB + 16}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
              fillOpacity={0.6}
            >
              {d.label.split(" ")[0]}
            </text>
            <text
              x={x + barW / 2}
              y={H - padB + 28}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
              fillOpacity={0.4}
            >
              {d.label.split(" ")[1]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Birthday mini chart ───────────────────────────────────────────────────────

/**
 * Compact SVG bar chart showing how many clients have a birthday in each calendar month.
 * `monthCounts` is a 12-element array indexed 0 (Jan) → 11 (Dec).
 */
function BirthdayChart({ monthCounts }: { monthCounts: number[] }) {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const W = 340;
  const H = 120;
  const padL = 28;
  const padR = 8;
  const padT = 8;
  const padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...monthCounts, 1);
  const barW = (chartW - 11 * 4) / 12;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Birthday distribution by month">
      {monthCounts.map((cnt, i) => {
        const x = padL + i * (barW + 4);
        const barH = (cnt / maxVal) * chartH;
        const y = padT + chartH - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(barH, 1)}
              rx={2}
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
            >
              <title>{`${MONTHS[i]}: ${cnt} clients`}</title>
            </rect>
            <text
              x={x + barW / 2}
              y={H - 4}
              textAnchor="middle"
              fontSize={8}
              fill="currentColor"
              fillOpacity={0.5}
            >
              {MONTHS[i].charAt(0)}
            </text>
          </g>
        );
      })}
      {/* Y axis labels */}
      {[0, maxVal].map((v, i) => {
        const y = i === 0 ? padT + chartH : padT;
        return (
          <text key={i} x={padL - 4} y={y + (i === 0 ? 0 : 8)} textAnchor="end" fontSize={8} fill="currentColor" fillOpacity={0.4}>
            {v}
          </text>
        );
      })}
    </svg>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

/**
 * Client Analytics dashboard page.
 *
 * Sections rendered:
 *  1. KPI row — Active Clients, New This Month, Avg Visits/Client, Top Spender
 *  2. Acquisition chart — new clients per month for the trailing 6 months
 *  3. Retention metrics — 30 / 60 / 90-day return rates with colour-coded bars
 *  4. Lifetime Value table — top-20 clients ranked by all-time paid spend
 *  5. Birthday distribution — month histogram + age-group breakdown
 *  6. Visit Frequency distribution — buckets based on all-time paid invoice count
 *
 * All data is fetched server-side via Prisma in a single `Promise.all` call.
 * Currency formatting uses the salon's configured currency (defaults to "USD").
 */
export default async function ClientReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams; // satisfy the async contract (no filters used on this page)

  // ── Salon ─────────────────────────────────────────────────────────────────

  const salon = await prisma.salon.findFirst();
  const salonId = salon?.id ?? "";
  const currency = salon?.currency ?? "USD";
  const fmt = makeFmt(currency);

  const now = new Date();

  // ── Build last-6-months buckets ──────────────────────────────────────────
  // Each bucket covers a full calendar month: [YYYY-MM-01, YYYY-MM-last].

  const ABBREVS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const months: { label: string; start: string; end: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const end = toDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    months.push({ label: `${ABBREVS[d.getMonth()]} ${d.getFullYear()}`, start, end });
  }

  const sixMonthsAgoStart = months[0].start;
  const todayStr = toDateString(now);

  // ── Data fetching ────────────────────────────────────────────────────────
  // Three parallel queries:
  //   allClients   — every client record (id, name, createdAt, birthday)
  //   recentAppts  — appointments within the 6-month window (for retention + KPIs)
  //   allInvoices  — all PAID invoices ever (for lifetime value + visit frequency)

  const [allClients, recentAppts, allInvoices] = await Promise.all([
    prisma.client.findMany({
      where: { salonId },
      select: { id: true, name: true, createdAt: true, birthday: true },
    }),
    prisma.appointment.findMany({
      where: { salonId, date: { gte: sixMonthsAgoStart, lte: todayStr } },
      select: { clientId: true, date: true, status: true },
    }),
    prisma.invoice.findMany({
      where: { salonId, status: "PAID" },
      select: { clientId: true, total: true, createdAt: true },
    }),
  ]);

  // ── New clients by month ─────────────────────────────────────────────────

  const acquisitionData = months.map(({ label, start, end }) => {
    const count = allClients.filter((c) => {
      const ds = toDateString(c.createdAt);
      return ds >= start && ds <= end;
    }).length;
    return { label, count };
  });

  // ── Retention metrics ────────────────────────────────────────────────────
  // Definition: clients who visited *before* the W-day cutoff AND *after* it,
  // divided by all clients who visited before the cutoff.
  // Uses recentAppts (last 6 months), so windows up to ~180 days are meaningful.

  function retentionRate(windowDays: number): number {
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    const cutoffStr = toDateString(cutoffDate);

    // Clients with appts before the window
    const beforeWindowClientIds = new Set(
      recentAppts
        .filter((a) => a.clientId && a.date < cutoffStr)
        .map((a) => a.clientId as string)
    );

    // Of those, how many also have appts within the window (>= cutoffStr)
    const returnedClientIds = new Set(
      recentAppts
        .filter((a) => a.clientId && a.date >= cutoffStr && beforeWindowClientIds.has(a.clientId))
        .map((a) => a.clientId as string)
    );

    return pct(returnedClientIds.size, beforeWindowClientIds.size);
  }

  // Extend to all appointments for better retention signals (not just 6m)
  // We use recentAppts which is last 6 months, so 30/60/90 day windows are within range.
  const retention30 = retentionRate(30);
  const retention60 = retentionRate(60);
  const retention90 = retentionRate(90);

  // ── Client lifetime value ────────────────────────────────────────────────
  // Aggregates all-time paid invoice totals per client into clientSpendMap,
  // then sorts descending by total spend and keeps the top 20.

  const clientSpendMap = new Map<string, { total: number; visits: number }>();
  for (const inv of allInvoices) {
    if (!inv.clientId) continue;
    const cur = clientSpendMap.get(inv.clientId) ?? { total: 0, visits: 0 };
    clientSpendMap.set(inv.clientId, { total: cur.total + inv.total, visits: cur.visits + 1 });
  }

  const clientIdToName = new Map(allClients.map((c) => [c.id, c.name]));

  const lifetimeValues = Array.from(clientSpendMap.entries())
    .map(([clientId, { total, visits }]) => ({
      clientId,
      name: clientIdToName.get(clientId) ?? "Unknown",
      total,
      visits,
      avgTicket: visits > 0 ? total / visits : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  // ── KPI metrics ──────────────────────────────────────────────────────────

  // Active clients = those with at least one visit in last 6 months
  const activeClientIds = new Set(recentAppts.filter((a) => a.clientId).map((a) => a.clientId as string));
  const totalActiveClients = activeClientIds.size;

  // New clients this month
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const newClientsThisMonth = allClients.filter((c) => toDateString(c.createdAt) >= thisMonthStart).length;

  // Avg visits per active client last 6 months
  const visitCountPerClient = new Map<string, number>();
  for (const a of recentAppts) {
    if (!a.clientId) continue;
    visitCountPerClient.set(a.clientId, (visitCountPerClient.get(a.clientId) ?? 0) + 1);
  }
  const totalVisits = Array.from(visitCountPerClient.values()).reduce((s, v) => s + v, 0);
  const avgVisitsPerClient = totalActiveClients > 0 ? (totalVisits / totalActiveClients).toFixed(1) : "0.0";

  // Top spender
  const topSpender = lifetimeValues[0] ?? null;

  // ── Demographics ─────────────────────────────────────────────────────────
  // Birthday distribution (month histogram) and age-group breakdown.
  // Only clients with a birthday on file contribute to these counts.

  // Birthday month distribution (months 1-12)
  const birthdayMonthCounts = Array(12).fill(0) as number[];
  for (const c of allClients) {
    if (c.birthday) {
      const month = c.birthday.getMonth(); // 0-indexed
      birthdayMonthCounts[month]++;
    }
  }
  const totalBirthdayClients = birthdayMonthCounts.reduce((s, v) => s + v, 0);

  // Age groups
  const ageGroups = { "<20": 0, "20-29": 0, "30-39": 0, "40-49": 0, "50+": 0 };
  for (const c of allClients) {
    if (!c.birthday) continue;
    const age = now.getFullYear() - c.birthday.getFullYear();
    if (age < 20) ageGroups["<20"]++;
    else if (age < 30) ageGroups["20-29"]++;
    else if (age < 40) ageGroups["30-39"]++;
    else if (age < 50) ageGroups["40-49"]++;
    else ageGroups["50+"]++;
  }

  // ── Visit frequency distribution ─────────────────────────────────────────
  // Buckets clients by total paid-invoice count (proxy for all-time visits).
  // Clients with no paid invoices are excluded — they won't appear in clientSpendMap.

  const visitFreqBuckets: { label: string; min: number; max: number; count: number }[] = [
    { label: "1 visit", min: 1, max: 1, count: 0 },
    { label: "2–3 visits", min: 2, max: 3, count: 0 },
    { label: "4–6 visits", min: 4, max: 6, count: 0 },
    { label: "7–10 visits", min: 7, max: 10, count: 0 },
    { label: "10+ visits", min: 11, max: Infinity, count: 0 },
  ];

  // Use invoice count per client as proxy for visits (all-time paid)
  for (const { visits } of clientSpendMap.values()) {
    for (const bucket of visitFreqBuckets) {
      if (visits >= bucket.min && visits <= bucket.max) {
        bucket.count++;
        break;
      }
    }
  }
  // Also count clients with invoices = 0 in the "1 visit" bucket? No — only those with data.
  const maxFreqCount = Math.max(...visitFreqBuckets.map((b) => b.count), 1);

  // ── Retention bar color helper ────────────────────────────────────────────
  // ≥50% → green (healthy), 20–49% → amber (moderate), <20% → red (needs attention)

  function retentionColor(p: number): string {
    if (p >= 50) return "bg-emerald-500";
    if (p >= 20) return "bg-amber-500";
    return "bg-[#F41666]";
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 text-foreground">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/reports" className="hover:text-foreground transition-colors">Reports</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Client Analytics</span>
      </nav>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F41666]/15">
          <Users className="h-5 w-5 text-[#F41666]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Client Analytics</h1>
          <p className="text-sm text-muted-foreground">Acquisition, retention, lifetime value &amp; demographics</p>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* Total Active Clients */}
        <Card>
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Clients</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F41666]/10">
                <Users className="h-4 w-4 text-[#F41666]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{totalActiveClients.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">at least 1 visit in last 6 months</p>
          </CardContent>
        </Card>

        {/* New Clients This Month */}
        <Card>
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">New This Month</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F48E16]/10">
                <UserPlus className="h-4 w-4 text-[#F48E16]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{newClientsThisMonth.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">joined since {ABBREVS[now.getMonth()]} 1</p>
          </CardContent>
        </Card>

        {/* Avg Visits per Client */}
        <Card>
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Visits / Client</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <RefreshCw className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{avgVisitsPerClient}</p>
            <p className="mt-1 text-xs text-muted-foreground">last 6 months, active clients</p>
          </CardContent>
        </Card>

        {/* Top Spender */}
        <Card>
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Spender</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                <Star className="h-4 w-4 text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topSpender ? (
              <>
                <p className="text-lg font-bold truncate">{topSpender.name}</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-emerald-500">{fmt(topSpender.total)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Acquisition Funnel ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#F41666]" />
            <CardTitle>New Client Acquisition (Last 6 Months)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <AcquisitionChart data={acquisitionData} />
        </CardContent>
      </Card>

      {/* ── Retention Metrics ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-500" />
            <CardTitle>Retention Metrics</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {([
            { label: "30-Day Retention", value: retention30 },
            { label: "60-Day Retention", value: retention60 },
            { label: "90-Day Retention", value: retention90 },
          ] as const).map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="tabular-nums font-semibold">{value}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${retentionColor(value)}`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {value >= 50 ? "Healthy retention" : value >= 20 ? "Moderate — room to improve" : "Needs attention"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Client Lifetime Value Table ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-[#F48E16]" />
            <CardTitle>Client Lifetime Value — Top 20</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {lifetimeValues.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No paid invoices recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-6 py-3 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 text-right font-medium">Total Spend</th>
                    <th className="px-4 py-3 text-right font-medium">Visits</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {lifetimeValues.map((row, i) => {
                    const rank = i + 1;
                    // Medal indicator for top 3
                    const medalColors: Record<number, string> = {
                      1: "bg-yellow-400 text-yellow-900",
                      2: "bg-zinc-300 text-zinc-700",
                      3: "bg-amber-600 text-amber-100",
                    };
                    const medalColor = medalColors[rank];
                    return (
                      <tr
                        key={row.clientId}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-3">
                          {medalColor ? (
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${medalColor}`}
                            >
                              {rank}
                            </span>
                          ) : (
                            <span className="text-muted-foreground tabular-nums">{rank}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-500 font-semibold">
                          {fmt(row.total)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {row.visits}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {fmt(row.avgTicket)}
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

      {/* ── Two-column: Birthday + Visit Frequency ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Birthday Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-[#F41666]" />
              <CardTitle>Birthday Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {totalBirthdayClients === 0 ? (
              <p className="text-sm text-muted-foreground">No birthday data recorded.</p>
            ) : (
              <>
                <BirthdayChart monthCounts={birthdayMonthCounts} />
                <p className="text-xs text-muted-foreground text-center">
                  {totalBirthdayClients} client{totalBirthdayClients !== 1 ? "s" : ""} with birthday on file
                </p>
              </>
            )}

            {/* Age groups */}
            {Object.values(ageGroups).some((v) => v > 0) && (
              <div className="mt-2 border-t border-border/40 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age Groups</p>
                <div className="flex flex-col gap-2">
                  {(Object.entries(ageGroups) as [string, number][]).map(([label, count]) => {
                    const total = Object.values(ageGroups).reduce((s, v) => s + v, 0);
                    const share = pct(count, total);
                    return (
                      <div key={label} className="flex items-center gap-3 text-sm">
                        <span className="w-12 text-right text-xs text-muted-foreground">{label}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#F41666]/70"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="w-8 text-right tabular-nums text-xs text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visit Frequency Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#F48E16]" />
              <CardTitle>Visit Frequency Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">Based on all-time paid invoices per client</p>
            {visitFreqBuckets.every((b) => b.count === 0) ? (
              <p className="text-sm text-muted-foreground">No visit data available.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {visitFreqBuckets.map((bucket) => {
                  const share = pct(bucket.count, maxFreqCount);
                  return (
                    <div key={bucket.label} className="flex items-center gap-3 text-sm">
                      <span className="w-20 text-xs text-muted-foreground shrink-0">{bucket.label}</span>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F48E16]/80"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <span className="w-10 text-right tabular-nums text-xs font-semibold">{bucket.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {clientSpendMap.size > 0 && (
              <p className="mt-2 text-xs text-muted-foreground border-t border-border/40 pt-3">
                {clientSpendMap.size} client{clientSpendMap.size !== 1 ? "s" : ""} with at least one paid invoice
              </p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
