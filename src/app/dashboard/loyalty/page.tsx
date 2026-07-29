import { prisma } from "@/lib/prisma";
import { TierCard } from "@/components/loyalty/tier-card";
import { PointsAdjustmentForm } from "@/components/loyalty/points-adjustment-form";
import { getLoyaltyTier, LoyaltyBadge } from "@/components/clients/loyalty-badge";
import { Star, Users, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function LoyaltyPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    allClients,
    totalPointsIssuedThisMonth,
    recentActivity,
  ] = await Promise.all([
    prisma.client.findMany({
      select: {
        id: true,
        name: true,
        loyaltyPoints: true,
        Appointment: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
      orderBy: { loyaltyPoints: "desc" },
    }),

    prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: {
        type: "CREDIT",
        note: { startsWith: "Points earned" },
        createdAt: { gte: monthStart },
      },
    }),

    prisma.ledgerEntry.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { Client: { select: { name: true } } },
    }),
  ]);

  // Active members = clients who have earned any points
  const activeMembers = allClients.filter((c) => c.loyaltyPoints > 0);
  const totalPointsThisMonth = totalPointsIssuedThisMonth._sum.amount ?? 0;

  // Tier breakdown
  const tiers = [
    { tier: "Bronze" as const, min: 0, max: 99, range: "0–99" },
    { tier: "Silver" as const, min: 100, max: 499, range: "100–499" },
    { tier: "Gold" as const, min: 500, max: 999, range: "500–999" },
    { tier: "Platinum" as const, min: 1000, max: Infinity, range: "1000+" },
  ];

  const tierStats = tiers.map(({ tier, min, max, range }) => {
    const members = allClients.filter(
      (c) => c.loyaltyPoints >= min && c.loyaltyPoints <= max
    );
    const totalPts = members.reduce((sum, c) => sum + c.loyaltyPoints, 0);
    return { tier, range, count: members.length, totalPoints: totalPts };
  });

  // Top 10 by points
  const leaderboard = allClients.slice(0, 10);

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-6 h-6 text-primary fill-primary" />
          Loyalty Program
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage tiers, points, and member activity
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {activeMembers.length.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Active members</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {Math.round(totalPointsThisMonth).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Points issued this month</p>
          </div>
        </div>
      </div>

      {/* Tier breakdown */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Tier Breakdown</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {tierStats.map((t) => (
            <TierCard
              key={t.tier}
              tier={t.tier}
              pointRange={t.range}
              memberCount={t.count}
              totalPoints={t.totalPoints}
            />
          ))}
        </div>
      </section>

      {/* Two-column: leaderboard + adjustment form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Leaderboard */}
        <section className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Top 10 Members
          </h2>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-8">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    Points
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden md:table-cell">
                    Last Visit
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground text-sm"
                    >
                      No loyalty members yet.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((client, idx) => {
                    const lastVisit = client.Appointment[0]?.date;
                    return (
                      <tr
                        key={client.id}
                        className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {client.name}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <LoyaltyBadge
                            points={client.loyaltyPoints}
                            variant="compact"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                          {client.loyaltyPoints.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                          {lastVisit ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Points adjustment form */}
        <section className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Manual Points Adjustment
          </h2>
          <div className="rounded-2xl border border-border bg-card p-5">
            <PointsAdjustmentForm />
          </div>
        </section>
      </div>

      {/* Recent activity */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Recent Points Activity
        </h2>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                  Note
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                  >
                    No points activity yet.
                  </td>
                </tr>
              ) : (
                recentActivity.map((entry) => {
                  const isEarned =
                    entry.type === "CREDIT" &&
                    (entry.note?.startsWith("Points earned") ?? false);
                  const isRedeemed =
                    entry.type === "DEBIT" &&
                    (entry.note?.startsWith("Points redeemed") ?? false);
                  const typeLabel = isEarned
                    ? "Earned"
                    : isRedeemed
                    ? "Redeemed"
                    : entry.type === "CREDIT"
                    ? "Credit"
                    : "Debit";
                  const typeClass = entry.type === "CREDIT"
                    ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                    : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20";

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {entry.Client.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${typeClass}`}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        <span
                          className={
                            entry.type === "CREDIT"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {entry.type === "CREDIT" ? "+" : "-"}
                          {Math.abs(entry.amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px] hidden sm:table-cell">
                        {entry.note ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                        {formatDate(entry.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
