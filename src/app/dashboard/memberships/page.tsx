import { prisma } from "@/lib/prisma";
import { CreditCard, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreatePlanDialog } from "@/components/memberships/create-plan-dialog";
import { EnrollClientDialog } from "@/components/memberships/enroll-client-dialog";
import { PlanActiveToggle, EditPlanDialog, CancelMembershipButton } from "@/components/memberships/plan-actions";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default async function MembershipsPage() {
  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const [plans, memberships, clients] = await Promise.all([
    prisma.membershipPlan.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.clientMembership.findMany({
      include: {
        Client: { select: { id: true, name: true } },
        Plan: { select: { id: true, name: true, sessionsPerMonth: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const activePlans = plans.filter((p) => p.active);
  const activeMemberships = memberships.filter((m) => m.status === "ACTIVE");

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Memberships
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage subscription plans and client enrollments
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

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {activePlans.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Active plans</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {activeMemberships.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Active members</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        {/* Plans tab */}
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
                  className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3"
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

        {/* Members tab */}
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
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                    Sessions Used
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
                      colSpan={6}
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
      </Tabs>
    </div>
  );
}
