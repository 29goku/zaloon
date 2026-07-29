import { prisma } from "@/lib/prisma";
import { getClientTier, LOYALTY_TIERS } from "@/lib/loyalty-tiers";

export const dynamic = "force-dynamic";

// ─── Tier colour map for the SVG chart and badges ────────────────────────────

const TIER_SVG_COLORS: Record<string, string> = {
  Bronze: "#d97706",
  Silver: "#94a3b8",
  Gold: "#eab308",
  Platinum: "#a855f7",
};

// ─── Data helpers ─────────────────────────────────────────────────────────────

async function getLoyaltyDashboardData() {
  const [clients, recentLoyaltyEntries] = await Promise.all([
    prisma.client.findMany({
      select: {
        id: true,
        name: true,
        loyaltyPoints: true,
        Appointment: {
          where: { status: "COMPLETED" },
          select: { date: true, totalAmount: true },
        },
        Invoice: { select: { total: true } },
      },
      orderBy: { loyaltyPoints: "desc" },
    }),
    prisma.ledgerEntry.findMany({
      where: { type: "LOYALTY", amount: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        note: true,
        createdAt: true,
        Client: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Tier distribution
  const tierCounts: Record<string, number> = {
    Bronze: 0,
    Silver: 0,
    Gold: 0,
    Platinum: 0,
  };
  let totalOutstanding = 0;
  for (const c of clients) {
    const tier = getClientTier(c.loyaltyPoints);
    tierCounts[tier.name] = (tierCounts[tier.name] ?? 0) + 1;
    totalOutstanding += c.loyaltyPoints;
  }

  const avgPoints =
    clients.length > 0 ? Math.round(totalOutstanding / clients.length) : 0;

  // Points redeemed this month (negative LOYALTY entries)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const redeemedThisMonth = await prisma.ledgerEntry.aggregate({
    where: {
      type: "LOYALTY",
      amount: { lt: 0 },
      createdAt: { gte: monthStart },
    },
    _sum: { amount: true },
  });
  const redeemedPts = Math.abs(redeemedThisMonth._sum.amount ?? 0);

  // Top earners (already sorted desc by loyaltyPoints)
  const topEarners = clients.slice(0, 10).map((c) => {
    const visits = c.Appointment.length;
    const spend = c.Invoice.reduce((s, inv) => s + inv.total, 0);
    const lastVisit =
      c.Appointment.length > 0
        ? [...c.Appointment].sort((a, b) =>
            b.date.localeCompare(a.date)
          )[0].date
        : null;
    return {
      id: c.id,
      name: c.name,
      loyaltyPoints: c.loyaltyPoints,
      tier: getClientTier(c.loyaltyPoints).name,
      visits,
      spend,
      lastVisit,
    };
  });

  return {
    tierCounts,
    totalOutstanding,
    avgPoints,
    redeemedPts,
    topEarners,
    recentActivity: recentLoyaltyEntries,
    totalClients: clients.length,
  };
}

// ─── SVG horizontal bar chart ─────────────────────────────────────────────────

function TierBarChart({
  tierCounts,
  totalClients,
}: {
  tierCounts: Record<string, number>;
  totalClients: number;
}) {
  const tiers = LOYALTY_TIERS.slice().reverse(); // Platinum first
  const maxCount = Math.max(...Object.values(tierCounts), 1);
  const barH = 28;
  const gap = 12;
  const labelW = 80;
  const countW = 40;
  const chartW = 340;
  const svgH = tiers.length * (barH + gap) - gap + 4;

  return (
    <svg
      viewBox={`0 0 ${labelW + chartW + countW + 16} ${svgH}`}
      className="w-full max-w-lg"
      aria-label="Client tier distribution"
    >
      {tiers.map((tier, i) => {
        const count = tierCounts[tier.name] ?? 0;
        const barWidth = totalClients === 0 ? 0 : (count / maxCount) * chartW;
        const y = i * (barH + gap);
        const color = TIER_SVG_COLORS[tier.name] ?? "#6b7280";
        return (
          <g key={tier.name}>
            {/* label */}
            <text
              x={labelW - 8}
              y={y + barH / 2 + 5}
              textAnchor="end"
              fontSize={12}
              fill="currentColor"
              className="fill-muted-foreground"
            >
              {tier.name}
            </text>
            {/* background track */}
            <rect
              x={labelW}
              y={y}
              width={chartW}
              height={barH}
              rx={6}
              fill="currentColor"
              className="fill-muted/20"
            />
            {/* filled bar */}
            {barWidth > 0 && (
              <rect
                x={labelW}
                y={y}
                width={barWidth}
                height={barH}
                rx={6}
                fill={color}
                opacity={0.85}
              />
            )}
            {/* count */}
            <text
              x={labelW + chartW + 8}
              y={y + barH / 2 + 5}
              fontSize={12}
              fontWeight={600}
              fill={color}
            >
              {count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LoyaltyDashboardPage() {
  const {
    tierCounts,
    totalOutstanding,
    avgPoints,
    redeemedPts,
    topEarners,
    recentActivity,
    totalClients,
  } = await getLoyaltyDashboardData();

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Loyalty Overview</h1>
        <p className="text-muted-foreground mt-1">
          Points, tiers, and redemption activity across all clients
        </p>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total points outstanding",
            value: totalOutstanding.toLocaleString(),
          },
          { label: "Avg points / client", value: avgPoints.toLocaleString() },
          {
            label: "Points redeemed this month",
            value: redeemedPts.toLocaleString(),
          },
          { label: "Total clients", value: totalClients.toLocaleString() },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-4 space-y-1"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tier distribution chart ── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Tier Distribution
        </h2>
        <TierBarChart tierCounts={tierCounts} totalClients={totalClients} />
        <div className="flex flex-wrap gap-4 mt-6">
          {LOYALTY_TIERS.map((t) => (
            <div key={t.name} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: TIER_SVG_COLORS[t.name] ?? "#6b7280" }}
              />
              <span className="text-muted-foreground">
                {t.name} — {tierCounts[t.name] ?? 0} clients
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Top earners table ── */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Top Loyalty Earners
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">
                    Points
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    Tier
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">
                    Visits
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-right hidden md:table-cell">
                    Spend
                  </th>
                </tr>
              </thead>
              <tbody>
                {topEarners.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 font-medium text-foreground">
                      {c.name}
                    </td>
                    <td className="py-2.5 text-right font-bold text-foreground">
                      {c.loyaltyPoints.toLocaleString()}
                    </td>
                    <td className="py-2.5">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          background:
                            (TIER_SVG_COLORS[c.tier] ?? "#6b7280") + "22",
                          color: TIER_SVG_COLORS[c.tier] ?? "#6b7280",
                        }}
                      >
                        {c.tier}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {c.visits}
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground hidden md:table-cell">
                      ${c.spend.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {topEarners.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-muted-foreground text-sm"
                    >
                      No clients yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Recent points activity ── */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Recent Points Activity
          </h2>
          <div className="space-y-3">
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No loyalty activity recorded yet.
              </p>
            )}
            {recentActivity.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.Client.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {entry.note ?? "Loyalty points earned"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-emerald-500">
                    +{entry.amount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
