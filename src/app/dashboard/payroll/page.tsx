import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Download, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PayrollDateControls } from "./payroll-date-controls";
import { PayrollStaffRow } from "./payroll-staff-row";
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

const PRESETS = [
  { id: "this-week", label: "This Week" },
  { id: "this-month", label: "This Month" },
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
          Invoice: { select: { total: true, status: true } },
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

    for (const appt of member.Appointment) {
      const inv = appt.Invoice;
      const apptRevenue =
        inv && inv.status === "PAID" ? inv.total : appt.totalAmount;

      const serviceCount = appt.AppointmentService.length;
      if (serviceCount === 0) {
        const key = "__other__";
        const rate = member.commissionPct;
        const existing = serviceMap.get(key);
        if (existing) {
          existing.count++;
          existing.revenue += apptRevenue;
        } else {
          serviceMap.set(key, { name: "Other", count: 1, revenue: apptRevenue, commissionPct: rate });
        }
        totalRevenue += apptRevenue;
        continue;
      }

      const revenuePerService = apptRevenue / serviceCount;
      for (const as of appt.AppointmentService) {
        const sid = as.serviceId;
        const override = overrideMap.get(sid);
        const effectiveRate =
          override !== undefined && override !== null ? override : member.commissionPct;
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
    const paidRecord = member.PayrollRecord[0] ?? null;

    return {
      id: member.id,
      name: member.name,
      commissionPct: member.commissionPct,
      appointmentCount: member.Appointment.length,
      revenue: totalRevenue,
      commissionEarned,
      services,
      alreadyPaid: paidRecord !== null,
    };
  });

  // Summary totals
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalPayout = rows.reduce((s, r) => s + r.commissionEarned, 0);
  const overallCommissionRate =
    totalRevenue > 0 ? (totalPayout / totalRevenue) * 100 : 0;
  const paidCount = rows.filter((r) => r.alreadyPaid).length;

  const exportUrl = `/api/staff/payroll/export?from=${from}&to=${to}`;

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payroll</h1>
          <p className="text-muted-foreground mt-1">
            Commission summary · {from} &mdash; {to}
          </p>
        </div>

        <a
          href={exportUrl}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors self-start"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </a>
      </div>

      {/* Date range controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
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

        <Suspense fallback={null}>
          <PayrollDateControls from={from} to={to} />
        </Suspense>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Total Payroll Owed</p>
              <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary tabular-nums">
              ${totalPayout.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total commissions due this period
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <div className="bg-emerald-500/10 p-2 rounded-lg flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              ${totalRevenue.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              From completed appointments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Overall Commission Rate</p>
              <div className="bg-[#F48E16]/10 p-2 rounded-lg flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-[#F48E16]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {overallCommissionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Weighted across all staff
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Periods Paid</p>
              <div className="bg-emerald-500/10 p-2 rounded-lg flex-shrink-0">
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {paidCount} / {rows.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Staff paid this period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staff payroll table */}
      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                Staff Member
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Appts
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Revenue
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Commission %
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Commission Earned
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-muted-foreground">
                  No staff found.
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
              <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">
                ${totalPayout.toFixed(2)}
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
