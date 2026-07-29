import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

export const dynamic = "force-dynamic";

function getDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

interface PayrollPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function PayrollPage({ searchParams }: PayrollPageProps) {
  const sp = await searchParams;
  const defaults = getDefaultRange();
  const from = sp.from ?? defaults.from;
  const to = sp.to ?? defaults.to;

  // Fetch all staff with their appointments in the date range
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
    },
  });

  // Compute payroll rows
  const rows = staff.map((member) => {
    const appointmentCount = member.Appointment.length;
    const revenue = member.Appointment.reduce((sum: number, appt) => {
      const inv = appt.Invoice;
      if (inv && inv.status === "PAID") return sum + inv.total;
      // fall back to totalAmount if no invoice
      return sum + appt.totalAmount;
    }, 0);
    const commissionEarned = revenue * (member.commissionPct / 100);
    return {
      id: member.id,
      name: member.name,
      phone: member.phone ?? "",
      commissionPct: member.commissionPct,
      appointmentCount,
      revenue,
      commissionEarned,
    };
  });

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalPayout = rows.reduce((s, r) => s + r.commissionEarned, 0);
  const totalAppts = rows.reduce((s, r) => s + r.appointmentCount, 0);

  const exportUrl = `/api/staff/payroll/export?from=${from}&to=${to}`;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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
              Commission summary for {from} &mdash; {to}
            </p>
          </div>
        </div>
        <a
          href={exportUrl}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Payroll
        </a>
      </div>

      {/* Date range filter */}
      <form method="GET" className="flex items-end gap-3 mb-8 flex-wrap">
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-xs font-medium text-muted-foreground">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-xs font-medium text-muted-foreground">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors"
        >
          Apply
        </button>
      </form>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Staff Name</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Appointments</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Revenue</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Commission %</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Commission Earned</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-muted-foreground">
                  No staff found.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                    idx % 2 === 0 ? "" : "bg-muted/10"
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
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
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40 border-t border-border">
              <td className="px-4 py-3 font-bold text-foreground">Total</td>
              <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                {totalAppts}
              </td>
              <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                ${totalRevenue.toFixed(2)}
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">
                ${totalPayout.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary card */}
      <div className="mt-6 p-5 rounded-xl border border-border bg-card flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total Payout</p>
          <p className="text-3xl font-bold text-primary mt-1">${totalPayout.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Period</p>
          <p className="text-sm font-semibold text-foreground mt-1">
            {from} &mdash; {to}
          </p>
        </div>
      </div>
    </div>
  );
}
