import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, History, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PayrollHistoryFilters } from "./payroll-history-filters";

export const dynamic = "force-dynamic";

interface HistoryPageProps {
  searchParams: Promise<{
    staffId?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function PayrollHistoryPage({
  searchParams,
}: HistoryPageProps) {
  const sp = await searchParams;

  const staffIdFilter =
    typeof sp.staffId === "string" && sp.staffId ? sp.staffId : undefined;
  const fromFilter =
    typeof sp.from === "string" && sp.from ? sp.from : undefined;
  const toFilter = typeof sp.to === "string" && sp.to ? sp.to : undefined;

  // Build query
  const whereClause: Record<string, unknown> = {};
  if (staffIdFilter) whereClause.staffId = staffIdFilter;
  if (fromFilter || toFilter) {
    whereClause.periodStart = {};
    if (fromFilter)
      (whereClause.periodStart as Record<string, unknown>).gte = new Date(
        fromFilter
      );
    if (toFilter)
      (whereClause.periodStart as Record<string, unknown>).lte = new Date(
        toFilter
      );
  }

  const [records, allStaff, salon] = await Promise.all([
    prisma.payrollRecord.findMany({
      where: whereClause,
      orderBy: { periodStart: "desc" },
      include: { Staff: { select: { id: true, name: true } } },
    }),
    prisma.staff.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.salon.findFirst(),
  ]);

  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const totalPaid = records.reduce((s, r) => s + r.commission, 0);
  const totalRevenue = records.reduce((s, r) => s + r.totalRevenue, 0);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <Link
            href="/dashboard/finance/payroll"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Payroll
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Payroll History
            </h1>
          </div>
          <p className="text-muted-foreground mt-1 pl-1">
            All commission payment records
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Total Records</p>
              <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                <History className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {records.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Payroll entries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <div className="bg-emerald-500/10 p-2 rounded-lg flex-shrink-0">
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-500 tabular-nums">
              {fmt(totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue generated
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Total Paid Out</p>
              <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary tabular-nums">
              {fmt(totalPaid)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Commissions paid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <PayrollHistoryFilters
        allStaff={allStaff}
        currentStaffId={staffIdFilter}
        currentFrom={fromFilter}
        currentTo={toFilter}
      />

      {/* Table */}
      <div className="rounded-xl border border-border overflow-x-auto mt-6">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                Date Paid
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                Staff
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                Period
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Revenue
              </th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                Commission
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                Paid By
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-16 text-muted-foreground"
                >
                  No payroll records found.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-foreground tabular-nums whitespace-nowrap">
                    {record.paidAt
                      ? new Date(record.paidAt).toLocaleDateString("en", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/staff/${record.Staff.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {record.Staff.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {record.periodStart.toISOString().split("T")[0]} —{" "}
                    {record.periodEnd.toISOString().split("T")[0]}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">
                    {fmt(record.totalRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
                    {fmt(record.commission)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {record.paidBy ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                    {record.notes ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {records.length > 0 && (
            <tfoot>
              <tr className="bg-muted/40 border-t border-border">
                <td
                  colSpan={3}
                  className="px-4 py-3 font-bold text-foreground"
                >
                  Total ({records.length} records)
                </td>
                <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                  {fmt(totalRevenue)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">
                  {fmt(totalPaid)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
