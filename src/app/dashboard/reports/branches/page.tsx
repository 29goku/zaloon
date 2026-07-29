import Link from "next/link";
import { Building2, Users, DollarSign, CalendarDays, ArrowRight, Crown } from "lucide-react";
import { getBranches } from "@/app/actions/branches";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function BranchesReportPage() {
  const [branches, allAppointments, allInvoices, allStaff] = await Promise.all([
    getBranches(),
    prisma.appointment.findMany({
      select: { id: true, staffId: true, status: true },
    }),
    prisma.invoice.findMany({
      select: {
        id: true,
        total: true,
        tip: true,
        status: true,
        Appointment: { select: { staffId: true } },
      },
    }),
    prisma.staff.findMany({
      select: { id: true, name: true },
    }),
  ]);

  // Build per-branch stats
  const branchStats = branches.map((branch) => {
    const staffIds = new Set(branch.staffIds ?? []);

    // Appointments where the staff member belongs to this branch
    const appointments = allAppointments.filter(
      (a) => staffIds.size === 0 || staffIds.has(a.staffId)
    );
    const completedAppointments = appointments.filter(
      (a) => a.status === "COMPLETED"
    );

    // Revenue from invoices linked via appointments whose staff is in this branch
    const revenue = allInvoices
      .filter(
        (inv) =>
          inv.status === "PAID" &&
          inv.Appointment &&
          (staffIds.size === 0 || staffIds.has(inv.Appointment.staffId))
      )
      .reduce((sum, inv) => sum + inv.total + (inv.tip ?? 0), 0);

    const assignedStaff = allStaff.filter(
      (s) => staffIds.size === 0 || staffIds.has(s.id)
    );

    return {
      branch,
      totalAppointments: appointments.length,
      completedAppointments: completedAppointments.length,
      revenue,
      staffCount: assignedStaff.length,
      staffNames: assignedStaff.map((s) => s.name),
    };
  });

  // Sort: main branch first, then by revenue desc
  branchStats.sort((a, b) => {
    if (a.branch.isMain && !b.branch.isMain) return -1;
    if (!a.branch.isMain && b.branch.isMain) return 1;
    return b.revenue - a.revenue;
  });

  const totalRevenue = branchStats.reduce((s, b) => s + b.revenue, 0);
  const totalAppointments = branchStats.reduce((s, b) => s + b.totalAppointments, 0);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Branch Overview</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Compare performance across all your salon branches.
          </p>
        </div>
        <Link
          href="/dashboard/settings/branches"
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Manage branches
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl border-dashed border-border">
          <Building2 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">No branches configured</p>
          <p className="text-xs text-muted-foreground mb-4">
            Add branches in Settings to see branch-level performance.
          </p>
          <Link
            href="/dashboard/settings/branches"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Go to Branches settings
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Branches</p>
              <p className="text-3xl font-bold text-foreground">{branches.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{fmt(totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarDays className="w-4 h-4 text-blue-400" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Appointments</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{totalAppointments}</p>
            </div>
          </div>

          {/* Branch cards grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branchStats.map(({ branch, totalAppointments: appts, completedAppointments, revenue, staffCount, staffNames }) => (
              <div
                key={branch.id}
                className={`rounded-xl border p-5 space-y-4 ${
                  branch.isMain ? "border-yellow-500/30 bg-yellow-500/5" : "border-border bg-card"
                }`}
              >
                {/* Name + badge */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {branch.isMain && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                      <h3 className="font-semibold text-sm text-foreground truncate">{branch.name}</h3>
                    </div>
                    {branch.city && (
                      <p className="text-xs text-muted-foreground mt-0.5">{branch.city}</p>
                    )}
                  </div>
                  {branch.isMain && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/25 shrink-0">
                      Main
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/60 p-2">
                    <p className="text-lg font-bold text-foreground">{appts}</p>
                    <p className="text-[10px] text-muted-foreground">Appts</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {fmt(revenue)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Revenue</p>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{staffCount}</p>
                    <p className="text-[10px] text-muted-foreground">Staff</p>
                  </div>
                </div>

                {/* Staff names */}
                {staffNames.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {staffNames.slice(0, 3).join(", ")}
                      {staffNames.length > 3 ? ` +${staffNames.length - 3} more` : ""}
                    </span>
                  </div>
                )}

                {/* Link */}
                <Link
                  href="/dashboard/settings/branches"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View branch settings
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Branch Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appointments</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {branchStats.map(({ branch, totalAppointments: appts, completedAppointments, revenue, staffCount }) => (
                    <tr key={branch.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {branch.isMain && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                          <div>
                            <p className="font-medium text-foreground">{branch.name}</p>
                            {branch.city && (
                              <p className="text-xs text-muted-foreground">{branch.city}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-foreground">{appts}</td>
                      <td className="px-5 py-3 text-right text-foreground">{completedAppointments}</td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmt(revenue)}
                      </td>
                      <td className="px-5 py-3 text-right text-foreground">{staffCount}</td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href="/dashboard/settings/branches"
                          className="text-xs text-primary hover:underline flex items-center gap-0.5 justify-end"
                        >
                          Settings
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
