import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, DollarSign, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

// ── page ──────────────────────────────────────────────────────────────────────

interface StaffPayrollPageProps {
  params: Promise<{ staffId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function StaffPayrollDetailPage({
  params,
  searchParams,
}: StaffPayrollPageProps) {
  const { staffId } = await params;
  const sp = await searchParams;

  const today = new Date();
  const defaultFrom = toDateString(startOfMonth(today));
  const defaultTo = toDateString(today);
  const from = sp.from ?? defaultFrom;
  const to = sp.to ?? defaultTo;

  // Load staff details with all relevant data
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      StaffService: {
        select: { serviceId: true, commissionOverridePct: true },
      },
      Appointment: {
        where: {
          status: "COMPLETED",
          date: { gte: from, lte: to },
        },
        orderBy: { date: "desc" },
        include: {
          Invoice: {
            select: { id: true, total: true, status: true, tip: true, createdAt: true },
          },
          AppointmentService: {
            include: { Service: { select: { id: true, name: true, price: true } } },
          },
        },
      },
      PayrollRecord: {
        orderBy: { periodStart: "desc" },
        take: 20,
      },
    },
  });

  if (!staff) notFound();

  // Build override map
  const overrideMap = new Map<string, number | null>();
  for (const ss of staff.StaffService) {
    overrideMap.set(ss.serviceId, ss.commissionOverridePct ?? null);
  }

  // Compute per-appointment breakdown
  const appointmentBreakdown = staff.Appointment.map((appt) => {
    const inv = appt.Invoice;
    const invoiceAmount = inv && inv.status === "PAID" ? inv.total : appt.totalAmount;
    const tip = inv?.tip ?? 0;

    const serviceNames = appt.AppointmentService.map((as) => as.Service.name).join(", ") || "General";
    const svcCount = appt.AppointmentService.length || 1;
    const revenuePerSvc = invoiceAmount / svcCount;

    let commission = 0;
    if (appt.AppointmentService.length === 0) {
      commission = (invoiceAmount * staff.commissionPct) / 100;
    } else {
      for (const as of appt.AppointmentService) {
        const override = overrideMap.get(as.serviceId);
        const rate =
          override !== undefined && override !== null ? override : staff.commissionPct;
        commission += (revenuePerSvc * rate) / 100;
      }
    }

    return {
      id: appt.id,
      date: appt.date,
      services: serviceNames,
      invoiceAmount,
      tip,
      commission,
    };
  });

  // Period totals
  const periodRevenue = appointmentBreakdown.reduce((s, a) => s + a.invoiceAmount, 0);
  const periodCommission = appointmentBreakdown.reduce((s, a) => s + a.commission, 0);
  const periodTips = appointmentBreakdown.reduce((s, a) => s + a.tip, 0);
  const periodNetPay = periodCommission + periodTips;

  // YTD totals from PayrollRecord
  const ytdYear = today.getFullYear();
  const ytdRecords = staff.PayrollRecord.filter(
    (r) => r.periodStart.getFullYear() === ytdYear
  );
  const ytdRevenue = ytdRecords.reduce((s, r) => s + r.totalRevenue, 0);
  const ytdCommission = ytdRecords.reduce((s, r) => s + r.commission, 0);
  const ytdPaid = ytdRecords
    .filter((r) => r.paidAt !== null)
    .reduce((s, r) => s + r.commission, 0);

  // Last 6 months data for SVG bar chart
  const monthlyData: { label: string; revenue: number; commission: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const mStart = toDateString(d);
    const mEnd = toDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const monthLabel = d.toLocaleString("default", { month: "short" });

    // Find matching payroll record
    const rec = staff.PayrollRecord.find(
      (r) =>
        r.periodStart.toISOString().startsWith(mStart) ||
        toDateString(r.periodStart) === mStart
    );

    monthlyData.push({
      label: monthLabel,
      revenue: rec?.totalRevenue ?? 0,
      commission: rec?.commission ?? 0,
    });
  }

  const maxMonthlyRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);

  // Current period paid record
  const currentPaidRecord = staff.PayrollRecord.find(
    (r) =>
      toDateString(r.periodStart) === from &&
      toDateString(r.periodEnd) === to
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Back + header */}
      <div className="flex items-start gap-4 mb-8">
        <Link
          href={`/dashboard/payroll?from=${from}&to=${to}`}
          className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to payroll"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{staff.name}</h1>
          <p className="text-muted-foreground mt-1">
            Commission {staff.commissionPct}% &middot; Joined{" "}
            {fmtDate(toDateString(staff.createdAt))}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Viewing period: {fmtDate(from)} &mdash; {fmtDate(to)}
          </p>
        </div>
        {currentPaidRecord ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mt-1">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        )}
      </div>

      {/* Period stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Revenue</p>
            <p className="text-xl font-bold text-foreground tabular-nums">
              ${fmt(periodRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Commission</p>
            <p className="text-xl font-bold text-primary tabular-nums">
              ${fmt(periodCommission)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Tips</p>
            <p className="text-xl font-bold text-foreground tabular-nums">
              ${fmt(periodTips)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Net Pay</p>
            <p className="text-xl font-bold text-emerald-500 tabular-nums">
              ${fmt(periodNetPay)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* YTD stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YTD Revenue</p>
              <p className="text-lg font-bold text-foreground tabular-nums">${fmt(ytdRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-[#F48E16]/10 p-2 rounded-lg flex-shrink-0">
              <DollarSign className="w-4 h-4 text-[#F48E16]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YTD Earned</p>
              <p className="text-lg font-bold text-foreground tabular-nums">${fmt(ytdCommission)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YTD Paid</p>
              <p className="text-lg font-bold text-emerald-500 tabular-nums">${fmt(ytdPaid)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly earnings chart (pure SVG, last 6 months) */}
      <div className="rounded-xl border border-border bg-card p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Monthly Earnings — Last 6 Months</h2>
        </div>
        <div className="flex items-end justify-around gap-2" style={{ height: 120 }}>
          {monthlyData.map((month, i) => {
            const barHeight = maxMonthlyRevenue > 0
              ? Math.max(4, (month.revenue / maxMonthlyRevenue) * 100)
              : 4;
            const commHeight = maxMonthlyRevenue > 0
              ? Math.max(2, (month.commission / maxMonthlyRevenue) * 100)
              : 2;
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className="relative flex items-end justify-center w-full" style={{ height: 100 }}>
                  {/* Revenue bar */}
                  <div
                    className="w-full max-w-[28px] rounded-t-sm bg-primary/20"
                    style={{ height: `${barHeight}%` }}
                    title={`Revenue: $${fmt(month.revenue)}`}
                  />
                  {/* Commission bar overlay */}
                  <div
                    className="absolute bottom-0 w-full max-w-[28px] rounded-t-sm bg-primary/70"
                    style={{ height: `${commHeight}%` }}
                    title={`Commission: $${fmt(month.commission)}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{month.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary/20" />
            <span className="text-xs text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary/70" />
            <span className="text-xs text-muted-foreground">Commission</span>
          </div>
        </div>
      </div>

      {/* Appointment breakdown table */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-3">
          Appointment Breakdown
          <span className="ml-2 text-sm text-muted-foreground font-normal">
            ({from} &mdash; {to})
          </span>
        </h2>
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Services</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Invoice</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Tip</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Commission</th>
              </tr>
            </thead>
            <tbody>
              {appointmentBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground">
                    No completed appointments in this period.
                  </td>
                </tr>
              ) : (
                appointmentBreakdown.map((appt) => (
                  <tr key={appt.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{fmtDate(appt.date)}</td>
                    <td className="px-4 py-3 text-foreground">{appt.services}</td>
                    <td className="px-4 py-3 text-right text-foreground tabular-nums">
                      ${fmt(appt.invoiceAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground tabular-nums">
                      ${fmt(appt.tip)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-primary tabular-nums">
                      ${fmt(appt.commission)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {appointmentBreakdown.length > 0 && (
              <tfoot>
                <tr className="bg-muted/40 border-t border-border">
                  <td className="px-4 py-3 font-bold text-foreground" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                    ${fmt(periodRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                    ${fmt(periodTips)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">
                    ${fmt(periodCommission)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Payment history */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Payment History</h2>
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Period</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Revenue</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Commission</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Paid Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {staff.PayrollRecord.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground">
                    No payment history yet.
                  </td>
                </tr>
              ) : (
                staff.PayrollRecord.map((record) => (
                  <tr key={record.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-foreground tabular-nums text-xs">
                      {fmtDate(toDateString(record.periodStart))} &mdash;{" "}
                      {fmtDate(toDateString(record.periodEnd))}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground tabular-nums">
                      ${fmt(record.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-primary tabular-nums">
                      ${fmt(record.commission)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {record.paidAt ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          {fmtDate(toDateString(record.paidAt))}
                        </span>
                      ) : (
                        <span className="text-amber-500 text-xs">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {record.notes ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
