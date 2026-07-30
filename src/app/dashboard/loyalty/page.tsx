import { prisma } from "@/lib/prisma";
import { getLoyaltyLeaderboard } from "@/app/actions/clients";
import { getLoyaltySettings } from "@/app/actions/settings";
import { TierCard } from "@/components/loyalty/tier-card";
import { PointsAdjustmentForm } from "@/components/loyalty/points-adjustment-form";
import { LoyaltyBadge } from "@/components/clients/loyalty-badge";
import { MembershipPlanCard } from "@/components/loyalty/membership-plan-card";
import { Award, Users, Zap, TrendingDown, Settings, CreditCard, DollarSign } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export default async function LoyaltyPage() {
  const [loyaltySettings, leaderboard] = await Promise.all([
    getLoyaltySettings(),
    getLoyaltyLeaderboard(10),
  ]);

  // Build tier thresholds from settings
  const sortedTiers = [...loyaltySettings.tiers].sort((a, b) => a.minPoints - b.minPoints);

  const [allClients, totalPointsIssued, totalPointsRedeemed, recentActivity, membershipPlans] = await Promise.all([
    prisma.client.findMany({
      select: { id: true, loyaltyPoints: true },
    }),

    // All CREDIT ledger entries tagged as points earned
    prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { type: "CREDIT" },
    }),

    // All DEBIT ledger entries (points redeemed)
    prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { type: "DEBIT" },
    }),

    prisma.ledgerEntry.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { Client: { select: { name: true } } },
    }),

    // Membership plans with active member counts
    prisma.membershipPlan.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
      include: {
        _count: {
          select: { ClientMembership: { where: { status: "ACTIVE" } } },
        },
      },
    }),
  ]);

  // Revenue from memberships (active memberships × plan price)
  const membershipRevenue = membershipPlans.reduce(
    (sum, plan) => sum + plan.price * plan._count.ClientMembership,
    0
  );
  const totalActiveMemberships = membershipPlans.reduce(
    (sum, plan) => sum + plan._count.ClientMembership,
    0
  );

  const activeMembers = allClients.filter((c) => c.loyaltyPoints > 0);
  const totalIssued = totalPointsIssued._sum.amount ?? 0;
  const totalRedeemed = totalPointsRedeemed._sum.amount ?? 0;
  const avgPoints =
    activeMembers.length > 0
      ? Math.round(activeMembers.reduce((s, c) => s + c.loyaltyPoints, 0) / activeMembers.length)
      : 0;

  // Tier distribution using configured thresholds
  const tierStats = sortedTiers.map((tier, idx) => {
    const nextTier = sortedTiers[idx + 1];
    const min = tier.minPoints;
    const max = nextTier ? nextTier.minPoints - 1 : Infinity;
    const range = nextTier ? `${min.toLocaleString()}–${(nextTier.minPoints - 1).toLocaleString()}` : `${min.toLocaleString()}+`;
    const members = allClients.filter((c) => c.loyaltyPoints >= min && c.loyaltyPoints <= max);
    const totalPts = members.reduce((sum, c) => sum + c.loyaltyPoints, 0);

    // Map to known tier names for TierCard styling
    type KnownTier = "Bronze" | "Silver" | "Gold" | "Platinum";
    const knownTiers: KnownTier[] = ["Bronze", "Silver", "Gold", "Platinum"];
    const tierName = (knownTiers[idx] ?? tier.name) as KnownTier;

    return { tier: tierName, range, count: members.length, totalPoints: totalPts };
  });

  const maxTierCount = Math.max(...tierStats.map((t) => t.count), 1);

  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Loyalty Program
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage tiers, points, and member activity
          </p>
        </div>
        <Link
          href="/dashboard/settings/loyalty"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium border border-border bg-card hover:bg-muted transition-colors text-foreground"
        >
          <Settings className="w-4 h-4" />
          Program Settings
        </Link>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">
              {activeMembers.length.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total enrolled</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">
              {totalActiveMemberships.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Active memberships</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">
              {membershipRevenue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Revenue / month</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Award className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">
              {avgPoints.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Avg pts / member</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">
              {Math.round(totalIssued).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Pts issued</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">
              {Math.round(totalRedeemed).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Pts redeemed</p>
          </div>
        </div>
      </div>

      {/* Tier distribution chart */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Tier Distribution</h2>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="grid grid-cols-4 gap-6">
            {tierStats.map((t) => {
              const pct = maxTierCount > 0 ? Math.round((t.count / maxTierCount) * 100) : 0;
              const barColors: Record<string, string> = {
                Bronze: "bg-amber-500",
                Silver: "bg-slate-400",
                Gold: "bg-yellow-400",
                Platinum: "bg-cyan-400",
              };
              const barColor = barColors[t.tier] ?? "bg-primary";
              return (
                <div key={t.tier} className="flex flex-col items-center gap-2">
                  {/* Bar */}
                  <div className="w-full flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-foreground">{t.count}</span>
                    <div className="w-full h-32 bg-muted rounded-xl flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-xl transition-all ${barColor}`}
                        style={{ height: `${Math.max(pct, t.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-foreground">{t.tier}</span>
                  <span className="text-xs text-muted-foreground">{t.range} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tier cards */}
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

      {/* Membership Plans section */}
      {membershipPlans.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Membership Plans</h2>
            <Link
              href="/dashboard/memberships"
              className="text-sm text-primary hover:underline"
            >
              Manage plans
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {membershipPlans.map((plan) => (
              <MembershipPlanCard
                key={plan.id}
                id={plan.id}
                name={plan.name}
                price={plan.price}
                sessionsPerMonth={plan.sessionsPerMonth}
                discountPct={plan.discountPct}
                description={plan.description}
                activeMemberCount={plan._count.ClientMembership}
              />
            ))}
          </div>
        </section>
      )}

      {/* Two-column: leaderboard + adjustment form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Top 10 leaderboard */}
        <section className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-foreground mb-4">Top 10 Members</h2>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Tier</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Points</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden md:table-cell">Visits</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden lg:table-cell">Lifetime $</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No loyalty members yet.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((client, idx) => (
                    <tr
                      key={client.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{client.name}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <LoyaltyBadge points={client.loyaltyPoints} variant="compact" />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                        {client.loyaltyPoints.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                        {client.visitCount}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden lg:table-cell">
                        {formatCurrency(client.lifetimeSpend)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Manual points adjustment */}
        <section className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-4">Manual Points Adjustment</h2>
          <div className="rounded-2xl border border-border bg-card p-5">
            <PointsAdjustmentForm />
          </div>
        </section>
      </div>

      {/* Recent activity */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Points Activity</h2>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Note</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No points activity yet.
                  </td>
                </tr>
              ) : (
                recentActivity.map((entry) => {
                  const isCredit = entry.type === "CREDIT";
                  const typeLabel = isCredit ? "Earned" : "Redeemed";
                  const typeClass = isCredit
                    ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                    : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20";

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{entry.Client.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${typeClass}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        <span className={isCredit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                          {isCredit ? "+" : "-"}{Math.abs(entry.amount).toLocaleString()}
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
