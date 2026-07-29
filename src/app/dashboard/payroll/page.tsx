import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DollarSign, TrendingUp, BarChart3, Clock, Users } from "lucide-react";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PayrollDateControls } from "./payroll-date-controls";
import { PayrollStaffRow } from "./payroll-staff-row";
import { PayrollExportButton } from "./payroll-export-button";
import { BulkMarkPaidButton } from "./bulk-mark-paid-button";
import type { ServiceBreakdown } from "@/app/actions/payroll";

export const dynamic = "force-dynamic";

// ── date helpers ──────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(d.getDate() - d.getDay());
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function presetRange(preset: string): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case "weekly": {
      const start = startOfWeek(today);
      return { from: toDateString(start), to: toDateString(today) };
    }
    case "bi-weekly": {
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(today.getDate() - 13);
      return { from: toDateString(twoWeeksAgo), to: toDateString(today) };
    }
    case "this-week": {
      return { from: toDateString(startOfWeek(today)), to: toDateString(today) };
    }
    case "this-month": {
      return { from: toDateString(startOfMonth(today)), to: toDateString(today) };
    }
    case "last-month": {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        from: toDateString(startOfMonth(lastMonth)),
        to: toDateString(endOfMonth(lastMonth)),
      };
    }
    default: {
      return { from: toDateString(startOfMonth(today)), to: toDateString(today) };
    }
  }
}

// Period navigation helpers
function shiftPeriod(
  from: string,
  to: string,
  direction: "prev" | "next"
): { from: string; to: string } {
  const start = new Date(from);
  const end = new Date(to);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  const sign = direction === "prev" ? -1 : 1;

  const newStart = new Date(start);
  newStart.setDate(start.getDate() + sign * diffDays);
  const newEnd = new Date(end);
  newEnd.setDate(end.getDate() + sign * diffDays);

  return { from: toDateString(newStart), to: toDateString(newEnd) };
}

const PRESETS = [
  { id: "this-week", label: "Weekly" },
  { id: "bi-weekly", label: "Bi-Weekly" },
  { id: "this-month", label: "Monthly" },
  { id: "last-month", label: "Last Month" },
] as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── page ──────────────────────────────────────────────────────────────────────

interface PayrollPageProps {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}

export default async function PayrollPage({ searchParams }: PayrollPageProps) {
  const sp = await searchParams;

  const activePreset =
    typeof sp.preset === "string" && PRESETS.some((p) => p.id === sp.preset)
      ? sp.preset
      : null;

  let from: string;
  let to: string;

  if (activePreset) {
    const range = presetRange(activePreset);
    from = range.from;
    to = range.to;
  } else if (typeof sp.from === "string" && typeof sp.to === "string") {
    from = sp.from <= sp.to ? sp.from : sp.to;
    to = sp.from <= sp.to ? sp.to : sp.from;
  } else {
    const defaults = presetRange("this-month");
    from = defaults.from;
    to = defaults.to;
  }

  const prevPeriod = shiftPeriod(from, to, "prev");
  const nextPeriod = shiftPeriod(from, to, "next");

  // Fetch all staff with completed appointments + service breakdowns + paid records
  const staff = await prisma.staff.findMany({
    orderBy: { name: "asc" },
    include: {
      StaffService: {
        select: { serviceId: true, commissionOverridePct: true },
      },
      Appointment: {
        where: {
          status: "COMPLETED",
          date: { gte: from, lte: to },
        },
        include: {
          Invoice: { select: { total: true, status: true, tip: true } },
          AppointmentService: {
            include: { Service: { select: { id: true, name: true } } },
          },
        },
      },
      PayrollRecord: {
        where: {
          periodStart: new Date(from),
          periodEnd: new Date(to),
        },
        select: { id: true, paidAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Compute per-staff payroll rows with service breakdowns
  const rows = staff.map((member) => {
    const overrideMap = new Map<string, number | null>();
    for (const ss of member.StaffService) {
      overrideMap.set(ss.serviceId, ss.commissionOverridePct ?? null);
    }

    const serviceMap = new Map<
      string,
      { name: string; count: number; revenue: number; commissionPct: number }
    >();

    let totalRevenue = 0;
    let totalTips = 0;

    for (const appt of member.Appointment) {
      const inv = appt.Invoice;
      const apptRevenue =
        inv && inv.status === "PAID" ? inv.total : appt.totalAmount;
      totalTips += inv?.tip ?? 0;

      const serviceCount = appt.AppointmentService.length;
      if (serviceCount === 0) {
        const key = "__other__";
        const rate = member.commissionPct;
        const existing = serviceMap.get(key);
        if (existing) {
          existing.count++;
          existing.revenue += apptRevenue;
        } else {
          serviceMap.set(key, {
            name: "Other",
            count: 1,
            revenue: apptRevenue,
            commissionPct: rate,
          });
        }
        totalRevenue += apptRevenue;
        continue;
      }

      const revenuePerService = apptRevenue / serviceCount;
      for (const as of appt.AppointmentService) {
        const sid = as.serviceId;
        const override = overrideMap.get(sid);
        const effectiveRate =
          override !== undefined && override !== null
            ? override
            : member.commissionPct;
        const existing = serviceMap.get(sid);
        if (existing) {
          existing.count++;
          existing.revenue += revenuePerService;
        } else {
          serviceMap.set(sid, {
            name: as.Service.name,
            count: 1,
            revenue: revenuePerService,
            commissionPct: effectiveRate,
          });
        }
      }
      totalRevenue += apptRevenue;
    }

    const services: ServiceBreakdown[] = Array.from(serviceMap.entries())
      .map(([serviceId, data]) => ({
        serviceId,
        serviceName: data.name,
        count: data.count,
        revenue: data.revenue,
        commissionPct: data.commissionPct,
        commission: (data.revenue * data.commissionPct) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const commissionEarned = services.reduce((s, x) => s + x.commission, 0);
    const netPay = commissionEarned + totalTips;
    const paidRecord = member.PayrollRecord[0] ?? null;

    return {
      id: member.id,
      name: member.name,
      commissionPct: member.commissionPct,
      appointmentCount: member.Appointment.length,
      revenue: totalRevenue,
      commissionEarned,
      tips: totalTips,
      netPay,
      services,
      alreadyPaid: paidRecord !== null,
    };
  });

  // Summary totals
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commissionEarned, 0);
  const totalTips = rows.reduce((s, r) => s + r.tips, 0);
  const totalPayout = rows.reduce((s, r) => s + r.netPay, 0);
  const pendingAmount = rows
    .filter((r) => !r.alreadyPaid)
    .reduce((s, r) => s + r.netPay, 0);
  const paidCount = rows.filter((r) => r.alreadyPaid).length;
  const avgCommission =
    rows.length > 0 ? totalCommission / rows.length : 0;

  const highestEarner = rows.length > 0
    ? rows.reduce((best, r) => (r.netPay > best.netPay ? r : best), rows[0])
    : null;

  const unpaidStaffIds = rows
    .filter((r) => !r.alreadyPaid)
    .map((r) => r.id);

  // Export data for CSV
  const exportData = rows.map((r) => ({
    staffId: r.id,
    staffName: r.name,
    commissionPct: r.commissionPct,
    servicesCount: r.appointmentCount,
    totalRevenue: r.revenue,
    commissionEarned: r.commissionEarned,
    tips: r.tips,
    netPay: r.netPay,
    status: r.alreadyPaid ? "PAID" : "PENDING",
  }));

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payroll</h1>
          <p className="text-muted-foreground mt-1">
            Commission &amp; pay summary &middot; {from} &mdash; {to}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unpaidStaffIds.length > 0 && (
            <BulkMarkPaidButton
              staffIds={unpaidStaffIds}
              from={from}
              to={to}
            />
          )}
          <PayrollExportButton rows={exportData} from={from} to={to} />
        </div>
      </div>

      {/* Period selector + navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8 flex-wrap">
        {/* Preset tabs */}
        <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-1">
          {PRESETS.map((preset) => {
            const isActive =
              activePreset === preset.id ||
              (!activePreset && !sp.from && preset.id === "this-month");
            return (
              <Link
                key={preset.id}
                href={`?preset=${preset.id}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {preset.label}
              </Link>
            );
          })}
          <Link
            href={`?from=${from}&to=${to}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !activePreset && sp.from
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Custom
          </Link>
        </div>

        {/* Period navigation */}
        <div className="flex items-center gap-1">
          <Link
            href={`?from=${prevPeriod.from}&to=${prevPeriod.to}`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border border-border"
            title="Previous period"
          >
            &lsaquo; Prev
          </Link>
          <Link
            href={`?from=${nextPeriod.from}&to=${nextPeriod.to}`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border border-border"
            title="Next period"
          >
            Next &rsaquo;
          </Link>
        </div>

        <Suspense fallback={null}>
          <PayrollDateControls from={from} to={to} />
        </Suspense>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total payroll */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Total Payroll</p>
              <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary tabular-nums">
              ${totalPayout.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Commission ${totalCommission.toFixed(2)} + tips ${totalTips.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Highest earner */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Highest Earner</p>
              <div className="bg-emerald-500/10 p-2 rounded-lg flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            {highestEarner ? (
              <>
                <p className="text-lg font-bold text-foreground truncate">
                  {highestEarner.name}
                </p>
                <p className="text-xs text-emerald-500 font-semibold tabular-nums mt-1">
                  ${highestEarner.netPay.toFixed(2)}
                </p>
              </>
            ) : (
              <p className="text-lg text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        {/* Pending (unpaid) */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Pending (Unpaid)</p>
              <div className="bg-amber-500/10 p-2 rounded-lg flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-500 tabular-nums">
              ${pendingAmount.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {rows.length - paidCount} of {rows.length} staff unpaid
            </p>
          </CardContent>
        </Card>

        {/* Avg commission */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Avg Commission</p>
              <div className="bg-[#F48E16]/10 p-2 rounded-lg flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-[#F48E16]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              ${avgCommission.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Per staff member this period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staff payroll table */}
      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                Staff Member
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Services
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Revenue
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Comm %
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Commission
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Tips
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Net Pay
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  No staff found for this period.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <PayrollStaffRow
                  key={row.id}
                  staffId={row.id}
                  staffName={row.name}
                  initials={getInitials(row.name)}
                  from={from}
                  to={to}
                  appointmentCount={row.appointmentCount}
                  revenue={row.revenue}
                  commissionPct={row.commissionPct}
                  commissionEarned={row.commissionEarned}
                  tips={row.tips}
                  netPay={row.netPay}
                  alreadyPaid={row.alreadyPaid}
                  services={row.services}
                />
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40 border-t border-border">
              <td className="px-4 py-3 font-bold text-foreground">Total</td>
              <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                {rows.reduce((s, r) => s + r.appointmentCount, 0)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                ${totalRevenue.toFixed(2)}
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                ${totalCommission.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                ${totalTips.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">
                ${totalPayout.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                {paidCount}/{rows.length} paid
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
