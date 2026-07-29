import { prisma } from "@/lib/prisma";
import {
  CreditCard,
  Users,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreatePlanDialog } from "@/components/memberships/create-plan-dialog";
import { EnrollClientDialog } from "@/components/memberships/enroll-client-dialog";
import {
  PlanActiveToggle,
  EditPlanDialog,
  CancelMembershipButton,
} from "@/components/memberships/plan-actions";
import { RenewMembershipButton, DeletePlanButton } from "@/components/memberships/membership-actions";
import { getMembershipStats } from "@/app/actions/memberships";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    EXPIRED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default async function MembershipsPage() {
  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const today = new Date().toISOString().slice(0, 10);
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [plans, memberships, clients, stats] = await Promise.all([
    prisma.membershipPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { ClientMembership: { where: { status: "ACTIVE" } } } },
      },
    }),
    prisma.clientMembership.findMany({
      include: {
        Client: { select: { id: true, name: true } },
        Plan: { select: { id: true, name: true, sessionsPerMonth: true, price: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getMembershipStats(),
  ]);

  const activePlans = plans.filter((p) => p.active);
  const activeMemberships = memberships.filter((m) => m.status === "ACTIVE");

  // Upcoming renewals: active memberships expiring in next 30 days
  const upcomingRenewals = activeMemberships.filter(
    (m) => m.endDate && m.endDate >= today && m.endDate <= in30Days
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Memberships
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage subscription plans, client enrollments, and billing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <EnrollClientDialog
            clients={clients}
            plans={activePlans.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              sessionsPerMonth: p.sessionsPerMonth,
            }))}
          />
          <CreatePlanDialog />
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Active members */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {stats.activeCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Active members</p>
          </div>
        </div>

        {/* Monthly revenue */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {fmt(stats.monthlyRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Monthly revenue</p>
          </div>
        </div>

        {/* Expiring this week */}
        <div
          className={`rounded-2xl border p-5 flex items-center gap-4 ${
            stats.expiringThisWeek > 0
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-border bg-card"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              stats.expiringThisWeek > 0 ? "bg-amber-500/15" : "bg-primary/10"
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${
                stats.expiringThisWeek > 0 ? "text-amber-500" : "text-primary"
              }`}
            />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {stats.expiringThisWeek}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Expiring this week</p>
          </div>
        </div>

        {/* Sessions used this month */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {stats.sessionsUsedThisMonth}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Sessions used (month)</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans ({plans.length})</TabsTrigger>
          <TabsTrigger value="members">Members ({activeMemberships.length})</TabsTrigger>
          <TabsTrigger value="billing">
            Billing
            {upcomingRenewals.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {upcomingRenewals.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Plans tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="plans" className="mt-4">
          {plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No plans yet. Click &ldquo;Add Plan&rdquo; to create your first membership plan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-2xl border bg-card p-5 flex flex-col gap-3 ${
                    plan.active ? "border-border" : "border-border/50 opacity-60"
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <EditPlanDialog plan={plan} />
                      <DeletePlanButton id={plan.id} name={plan.name} />
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-2xl font-bold text-foreground">
                    {fmt(plan.price)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>

                  {/* Details */}
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                      {plan.sessionsPerMonth} sessions per month
                    </li>
                    {plan.discountPct > 0 && (
                      <li className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                        {plan.discountPct}% off extra services
                      </li>
                    )}
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block" />
                      {plan._count.ClientMembership} active member
                      {plan._count.ClientMembership !== 1 ? "s" : ""}
                    </li>
                  </ul>

                  {/* Footer: active toggle */}
                  <div className="flex items-center justify-between pt-1 mt-auto border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {plan.active ? "Active" : "Inactive"}
                    </span>
                    <PlanActiveToggle plan={plan} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Members tab ────────────────────────────────────────────────────── */}
        <TabsContent value="members" className="mt-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">
                    Start
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">
                    End
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                    Sessions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {memberships.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground text-sm"
                    >
                      No memberships yet. Click &ldquo;Enroll Client&rdquo; to get started.
                    </td>
                  </tr>
                ) : (
                  memberships.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {m.Client.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {m.Plan.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {m.startDate}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {m.endDate ? (
                          <span
                            className={
                              m.endDate <= today
                                ? "text-destructive font-medium"
                                : m.endDate <= in30Days
                                ? "text-amber-500 font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {m.endDate}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className="font-semibold text-foreground tabular-nums">
                          {m.sessionsUsed}
                        </span>
                        <span className="text-muted-foreground">
                          /{m.Plan.sessionsPerMonth}
                        </span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(m.status)}</td>
                      <td className="px-4 py-3">
                        {m.status === "ACTIVE" && (
                          <CancelMembershipButton id={m.id} />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Billing tab ────────────────────────────────────────────────────── */}
        <TabsContent value="billing" className="mt-4 space-y-6">
          {/* Upcoming renewals */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Upcoming Renewals
              </h2>
              <span className="text-xs text-muted-foreground">(next 30 days)</span>
            </div>

            {upcomingRenewals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <RefreshCw className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No renewals due in the next 30 days.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                        Expires
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingRenewals.map((m) => {
                      const daysUntil = m.endDate
                        ? Math.ceil(
                            (new Date(m.endDate).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24)
                          )
                        : null;

                      return (
                        <tr
                          key={m.id}
                          className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {m.Client.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {m.Plan.name}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span
                                className={
                                  daysUntil !== null && daysUntil <= 3
                                    ? "text-destructive font-semibold"
                                    : daysUntil !== null && daysUntil <= 7
                                    ? "text-amber-500 font-semibold"
                                    : "text-foreground"
                                }
                              >
                                {m.endDate}
                              </span>
                              {daysUntil !== null && (
                                <span className="text-xs text-muted-foreground">
                                  {daysUntil <= 0
                                    ? "Expired"
                                    : daysUntil === 1
                                    ? "1 day left"
                                    : `${daysUntil} days left`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground hidden sm:table-cell">
                            {fmt(m.Plan.price)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <RenewMembershipButton id={m.id} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* All active memberships summary */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                All Active Subscriptions
              </h2>
              <span className="text-xs text-muted-foreground">
                ({activeMemberships.length} total · {fmt(stats.monthlyRevenue)}/mo)
              </span>
            </div>

            {activeMemberships.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <Users className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active memberships.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">
                        End Date
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                        Sessions
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                        Monthly
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMemberships.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {m.Client.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {m.Plan.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {m.endDate ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span className="font-semibold text-foreground tabular-nums">
                            {m.sessionsUsed}
                          </span>
                          <span className="text-muted-foreground">
                            /{m.Plan.sessionsPerMonth}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          {fmt(m.Plan.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
