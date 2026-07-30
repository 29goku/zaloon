import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Download, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PayrollDateControls } from "./payroll-date-controls";
import { MarkPaidButton } from "./mark-paid-button";

export const dynamic = "force-dynamic";

// ── date helpers ──────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const copy = new Date(d);
  copy.setDate(d.getDate() - day);
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
      const start = startOfWeek(today);
      return { from: toDateString(start), to: toDateString(today) };
    }
    case "this-month": {
      const start = startOfMonth(today);
      return { from: toDateString(start), to: toDateString(today) };
    }
    case "last-month": {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      return { from: toDateString(start), to: toDateString(end) };
    }
    default: {
      const start = startOfMonth(today);
      return { from: toDateString(start), to: toDateString(today) };
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

  // Fetch all staff with completed appointments in date range + paid status
  const staff = await prisma.staff.findMany({
    orderBy: { name: "asc" },
    include: {
      Appointment: {
        where: {
          status: "COMPLETED",
          date: { gte: from, lte: to },
        },
        include: {
          Invoice: {
            select: { total: true, status: true },
          },
        },
      },
      PayrollRecord: {
        where: {
          periodStart: new Date(from),
          periodEnd: new Date(to),
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  // Compute per-staff payroll rows
  const rows = staff.map((member) => {
    const appointmentCount = member.Appointment.length;
    const revenue = member.Appointment.reduce((sum: number, appt) => {
      const inv = appt.Invoice;
      if (inv && inv.status === "PAID") return sum + inv.total;
      return sum + appt.totalAmount;
    }, 0);
    const commissionEarned = revenue * (member.commissionPct / 100);
    return {
      id: member.id,
      name: member.name,
      commissionPct: member.commissionPct,
      appointmentCount,
      revenue,
      commissionEarned,
      alreadyPaid: member.PayrollRecord.length > 0,
    };
  });

  // Summary totals
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalPayout = rows.reduce((s, r) => s + r.commissionEarned, 0);
  const overallCommissionRate =
    totalRevenue > 0 ? (totalPayout / totalRevenue) * 100 : 0;

  const exportUrl = `/api/staff/payroll/export?from=${from}&to=${to}`;

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/staff"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Staff
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payroll</h1>
            <p className="text-muted-foreground mt-1">
              Commission summary · {from} &mdash; {to}
            </p>
          </div>
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
        {/* Preset buttons */}
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

        {/* Custom date inputs — client component */}
        <Suspense fallback={null}>
          <PayrollDateControls from={from} to={to} />
        </Suspense>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
      </div>

      {/* Staff payroll table */}
      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
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
              rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                    idx % 2 !== 0 ? "bg-muted/10" : ""
                  }`}
                >
                  {/* Name + avatar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                        {getInitials(row.name)}
                      </div>
                      <span className="font-medium text-foreground">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">
                    {row.appointmentCount}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">
                    ${row.revenue.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                    {row.commissionPct}%
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
                    ${row.commissionEarned.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MarkPaidButton
                      staffId={row.id}
                      staffName={row.name}
                      from={from}
                      to={to}
                      revenue={row.revenue}
                      commission={row.commissionEarned}
                      initialPaid={row.alreadyPaid}
                    />
                  </td>
                </tr>
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
