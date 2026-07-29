import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  FileText,
  Users,
  Receipt,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { FinanceExportButton } from "./export-button";

export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────────────

function toDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function quarterRange(q: 1 | 2 | 3 | 4, year: number): { from: string; to: string } {
  const starts = [0, 3, 6, 9];
  const start = new Date(year, starts[q - 1], 1);
  const end = endOfMonth(new Date(year, starts[q - 1] + 2, 1));
  return { from: toDateString(start), to: toDateString(end) };
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const now = new Date();
  const todayYear = now.getFullYear();

  // Default: current month
  const defaultFrom = toDateString(startOfMonth(now));
  const defaultTo = toDateString(now);

  let from =
    typeof sp.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)
      ? sp.from
      : defaultFrom;
  let to =
    typeof sp.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)
      ? sp.to
      : defaultTo;

  if (from > to) [from, to] = [to, from];

  const fromDt = new Date(from + "T00:00:00.000Z");
  const toDt = new Date(to + "T23:59:59.999Z");

  // ── presets ─────────────────────────────────────────────────────────────────

  const lastMonthStart = toDateString(startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  const lastMonthEnd = toDateString(endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)));

  const presets = [
    { label: "This Month", from: defaultFrom, to: defaultTo },
    { label: "Last Month", from: lastMonthStart, to: lastMonthEnd },
    { label: "Q1", ...quarterRange(1, todayYear) },
    { label: "Q2", ...quarterRange(2, todayYear) },
    { label: "Q3", ...quarterRange(3, todayYear) },
    { label: "Q4", ...quarterRange(4, todayYear) },
    { label: "This Year", from: `${todayYear}-01-01`, to: defaultTo },
  ];

  // ── salon ────────────────────────────────────────────────────────────────────

  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";
  const taxRate = salon?.taxRate ?? 0;
  const salonId = salon?.id ?? "";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  // ── primary data fetches ─────────────────────────────────────────────────────

  const [invoicesRaw, expensesRaw, staffAll] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        salonId,
        createdAt: { gte: fromDt, lte: toDt },
      },
      select: {
        id: true,
        total: true,
        status: true,
        paymentMethod: true,
        clientId: true,
        createdAt: true,
        Appointment: {
          select: {
            staffId: true,
            Staff: { select: { id: true, name: true, commissionPct: true } },
            AppointmentService: {
              select: {
                Service: {
                  select: {
                    name: true,
                    ServiceCategory: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.expense.findMany({
      where: {
        salonId,
        date: { gte: from, lte: to },
      },
      select: {
        id: true,
        amount: true,
        category: true,
        date: true,
      },
    }),

    prisma.staff.findMany({
      where: { salonId },
      select: { id: true, name: true, commissionPct: true },
    }),
  ]);

  // ── P&L calculations ─────────────────────────────────────────────────────────

  const paidInvoices = invoicesRaw.filter((i) => i.status === "PAID");
  const voidInvoices = invoicesRaw.filter((i) => i.status === "VOID");
  const completedInvoices = invoicesRaw.filter(
    (i) => i.status === "PAID" || i.status === "COMPLETED"
  );

  const grossRevenue = paidInvoices.reduce((s, i) => s + i.total, 0);
  const refunds = voidInvoices.reduce((s, i) => s + i.total, 0);
  const netRevenue = grossRevenue - refunds;
  const totalExpenses = expensesRaw.reduce((s, e) => s + e.amount, 0);
  const grossProfit = netRevenue - totalExpenses;

  // Staff commissions: sum of (invoice total × staff commissionPct)
  let staffCommissions = 0;
  const staffCommMap: Record<string, { name: string; commission: number; revenue: number }> = {};

  for (const inv of completedInvoices) {
    if (!inv.Appointment) continue;
    const staff = inv.Appointment.Staff;
    const commPct = staff.commissionPct ?? 0;
    const comm = inv.total * (commPct / 100);
    staffCommissions += comm;
    if (!staffCommMap[staff.id]) {
      staffCommMap[staff.id] = { name: staff.name, commission: 0, revenue: 0 };
    }
    staffCommMap[staff.id].commission += comm;
    staffCommMap[staff.id].revenue += inv.total;
  }

  const netProfit = grossProfit - staffCommissions;
  const profitMarginPct = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

  // ── Tax calculations ──────────────────────────────────────────────────────────

  const taxCollected = taxRate > 0 ? (netRevenue * taxRate) / 100 : 0;
  const netOfTax = netRevenue - taxCollected;

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  const uniqueClients = new Set(paidInvoices.map((i) => i.clientId).filter(Boolean)).size;
  const revenuePerClient = uniqueClients > 0 ? netRevenue / uniqueClients : 0;

  const activeStaffIds = new Set(
    completedInvoices.map((i) => i.Appointment?.staffId).filter(Boolean)
  );
  const revenuePerStaff = activeStaffIds.size > 0 ? netRevenue / activeStaffIds.size : 0;

  const avgInvoiceValue =
    paidInvoices.length > 0 ? grossRevenue / paidInvoices.length : 0;

  // ── Payment method breakdown ──────────────────────────────────────────────────

  const paymentMethodMap: Record<string, number> = {};
  for (const inv of paidInvoices) {
    const m = inv.paymentMethod || "OTHER";
    paymentMethodMap[m] = (paymentMethodMap[m] ?? 0) + inv.total;
  }
  const pmTotal = Object.values(paymentMethodMap).reduce((s, v) => s + v, 0);
  const paymentMethods = Object.entries(paymentMethodMap)
    .sort((a, b) => b[1] - a[1])
    .map(([method, amount]) => ({
      method,
      amount,
      pct: pmTotal > 0 ? (amount / pmTotal) * 100 : 0,
    }));

  // ── Service category breakdown ────────────────────────────────────────────────

  const categoryMap: Record<string, number> = {};
  for (const inv of paidInvoices) {
    if (!inv.Appointment) continue;
    const services = inv.Appointment.AppointmentService;
    if (services.length === 0) continue;
    const perService = inv.total / services.length;
    for (const svc of services) {
      const cat = svc.Service.ServiceCategory?.name ?? "Uncategorized";
      categoryMap[cat] = (categoryMap[cat] ?? 0) + perService;
    }
  }
  const catTotal = Object.values(categoryMap).reduce((s, v) => s + v, 0);
  const serviceCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name,
      amount,
      pct: catTotal > 0 ? (amount / catTotal) * 100 : 0,
    }));

  // ── Staff revenue breakdown ───────────────────────────────────────────────────

  const staffRevMap: Record<string, { name: string; amount: number }> = {};
  for (const inv of completedInvoices) {
    if (!inv.Appointment) continue;
    const { staffId } = inv.Appointment;
    const name = inv.Appointment.Staff.name;
    if (!staffRevMap[staffId]) staffRevMap[staffId] = { name, amount: 0 };
    staffRevMap[staffId].amount += inv.total;
  }
  const staffRevTotal = Object.values(staffRevMap).reduce((s, v) => s + v.amount, 0);
  const staffRevBreakdown = Object.entries(staffRevMap)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([id, { name, amount }]) => ({
      id,
      name,
      amount,
      pct: staffRevTotal > 0 ? (amount / staffRevTotal) * 100 : 0,
    }));

  // ── Expense breakdown by category ─────────────────────────────────────────────

  const expCatMap: Record<string, number> = {};
  for (const exp of expensesRaw) {
    expCatMap[exp.category] = (expCatMap[exp.category] ?? 0) + exp.amount;
  }
  const expCategories = Object.entries(expCatMap)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      pct: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }));

  // ── Cash flow: last 12 months ──────────────────────────────────────────────────

  const cashFlowMonths: {
    label: string;
    year: number;
    month: number;
    revenue: number;
    expenses: number;
    net: number;
  }[] = [];

  const MONTH_ABBREVS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = toDateString(d);
    const mEnd = toDateString(endOfMonth(d));
    const mFromDt = new Date(mStart + "T00:00:00.000Z");
    const mToDt = new Date(mEnd + "T23:59:59.999Z");

    const [revAgg, expAgg] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          salonId,
          status: "PAID",
          createdAt: { gte: mFromDt, lte: mToDt },
        },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({
        where: {
          salonId,
          date: { gte: mStart, lte: mEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    const rev = revAgg._sum.total ?? 0;
    const exp = expAgg._sum.amount ?? 0;
    cashFlowMonths.push({
      label: MONTH_ABBREVS[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth(),
      revenue: rev,
      expenses: exp,
      net: rev - exp,
    });
  }

  // ── Month-over-month expense trend (last 6 months) ───────────────────────────

  const expTrend: { label: string; amount: number; changeAmt: number | null }[] = [];
  let prevMonthExp: number | null = null;
  for (const m of cashFlowMonths.slice(-6)) {
    expTrend.push({
      label: `${m.label} ${m.year}`,
      amount: m.expenses,
      changeAmt: prevMonthExp !== null ? m.expenses - prevMonthExp : null,
    });
    prevMonthExp = m.expenses;
  }

  // ── max values for chart scaling ─────────────────────────────────────────────

  const maxBar = Math.max(...cashFlowMonths.map((m) => Math.max(m.revenue, m.expenses)), 1);
  const maxNet = Math.max(...cashFlowMonths.map((m) => Math.abs(m.net)), 1);

  // ── P&L data for export ───────────────────────────────────────────────────────

  const plExportData = {
    from,
    to,
    grossRevenue,
    refunds,
    netRevenue,
    totalExpenses,
    grossProfit,
    staffCommissions,
    netProfit,
    profitMarginPct,
    taxRate,
    taxCollected,
    netOfTax,
    revenuePerClient,
    revenuePerStaff,
    avgInvoiceValue,
    uniqueClients,
    paidInvoicesCount: paidInvoices.length,
    currency,
  };

  // ── color palettes for breakdown charts ──────────────────────────────────────

  const BAR_COLORS = [
    "bg-primary",
    "bg-[#F48E16]",
    "bg-[#F41666]",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-sky-500",
    "bg-amber-500",
    "bg-rose-400",
  ];

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-primary" />
            Financial Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            P&amp;L · Cash Flow · Revenue Breakdown · Tax Summary
          </p>
        </div>
        <FinanceExportButton data={plExportData} />
      </div>

      {/* ── Date Range Controls ── */}
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => {
          const isActive = from === preset.from && to === preset.to;
          return (
            <Link
              key={preset.label}
              href={`?from=${preset.from}&to=${preset.to}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {preset.label}
            </Link>
          );
        })}
        {/* Custom date inputs */}
        <form className="flex items-center gap-2 ml-2" method="GET">
          <input
            name="from"
            type="date"
            defaultValue={from}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <input
            name="to"
            type="date"
            defaultValue={to}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <button
            type="submit"
            className="h-8 px-3 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors border border-border"
          >
            Apply
          </button>
        </form>
      </div>

      {/* Active period banner */}
      <div className="flex items-center gap-3 px-5 py-3 bg-primary/8 border border-primary/20 rounded-xl text-sm">
        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-muted-foreground">
          Showing period:{" "}
          <span className="text-foreground font-semibold">{from}</span>
          {" "}→{" "}
          <span className="text-foreground font-semibold">{to}</span>
        </span>
        <span
          className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
            netProfit >= 0
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-[#F41666]/15 text-[#F41666]"
          }`}
        >
          {netProfit >= 0 ? "Profitable" : "Loss"} · {profitMarginPct.toFixed(1)}% margin
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 · KPI Cards
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Key Performance Indicators
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Revenue per Client",
              value: fmt(revenuePerClient),
              sub: `${uniqueClients} unique clients`,
              icon: Users,
              color: "text-primary",
              bg: "bg-primary/10",
              positive: true,
            },
            {
              label: "Revenue per Staff",
              value: fmt(revenuePerStaff),
              sub: `${activeStaffIds.size} active staff`,
              icon: Users,
              color: "text-[#F48E16]",
              bg: "bg-[#F48E16]/10",
              positive: true,
            },
            {
              label: "Avg Invoice Value",
              value: fmt(avgInvoiceValue),
              sub: `${paidInvoices.length} invoices`,
              icon: Receipt,
              color: "text-emerald-500",
              bg: "bg-emerald-500/10",
              positive: true,
            },
            {
              label: "Profit Margin",
              value: `${profitMarginPct.toFixed(1)}%`,
              sub: netProfit >= 0 ? "Profitable period" : "Loss period",
              icon: TrendingUp,
              color: profitMarginPct >= 0 ? "text-emerald-500" : "text-[#F41666]",
              bg: profitMarginPct >= 0 ? "bg-emerald-500/10" : "bg-[#F41666]/10",
              positive: profitMarginPct >= 0,
            },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
                      {label}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                      {value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 · P&L Summary
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Profit &amp; Loss Statement
        </h2>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border/50">
                {/* Revenue section */}
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <td colSpan={2} className="pb-2 pt-1 font-semibold">
                    Revenue
                  </td>
                </tr>
                <PLRow label="Gross Revenue" value={grossRevenue} fmt={fmt} indent />
                <PLRow label="Refunds / Voids" value={-refunds} fmt={fmt} indent negative={refunds > 0} />
                <PLRow
                  label="Net Revenue"
                  value={netRevenue}
                  fmt={fmt}
                  subtotal
                  positive={netRevenue >= 0}
                  negative={netRevenue < 0}
                />

                {/* Expenses section */}
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <td colSpan={2} className="pb-2 pt-4 font-semibold">
                    Expenses
                  </td>
                </tr>
                <PLRow label="Total Operating Expenses" value={-totalExpenses} fmt={fmt} indent negative={totalExpenses > 0} />
                <PLRow
                  label="Gross Profit"
                  value={grossProfit}
                  fmt={fmt}
                  subtotal
                  positive={grossProfit >= 0}
                  negative={grossProfit < 0}
                />

                {/* Commissions section */}
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <td colSpan={2} className="pb-2 pt-4 font-semibold">
                    Staff Commissions
                  </td>
                </tr>
                <PLRow
                  label="Staff Commissions"
                  value={-staffCommissions}
                  fmt={fmt}
                  indent
                  negative={staffCommissions > 0}
                />
                {/* Sub-rows per staff */}
                {Object.values(staffCommMap)
                  .filter((s) => s.commission > 0)
                  .sort((a, b) => b.commission - a.commission)
                  .map((s) => (
                    <PLRow
                      key={s.name}
                      label={`↳ ${s.name}`}
                      value={-s.commission}
                      fmt={fmt}
                      indent
                      sub
                      negative
                    />
                  ))}

                {/* Net Profit */}
                <tr>
                  <td colSpan={2} className="pt-2">
                    <div className="h-px bg-border" />
                  </td>
                </tr>
                <PLRow
                  label="Net Profit"
                  value={netProfit}
                  fmt={fmt}
                  total
                  positive={netProfit >= 0}
                  negative={netProfit < 0}
                />
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 · Cash Flow Chart (last 12 months)
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Cash Flow — Last 12 Months
        </h2>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            {/* Legend */}
            <div className="flex items-center gap-6 mb-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500/70 inline-block" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#F41666]/70 inline-block" />
                Expenses
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary inline-block" />
                Net Profit
              </span>
            </div>

            {/* Chart */}
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Bars area */}
                <div className="flex items-end gap-1 h-48 pb-0">
                  {cashFlowMonths.map((m) => {
                    const revH = maxBar > 0 ? (m.revenue / maxBar) * 100 : 0;
                    const expH = maxBar > 0 ? (m.expenses / maxBar) * 100 : 0;
                    const netH = maxNet > 0 ? (Math.abs(m.net) / maxNet) * 40 : 0;
                    const isNetPositive = m.net >= 0;
                    return (
                      <div
                        key={`${m.year}-${m.month}`}
                        className="flex-1 flex flex-col items-center gap-0.5"
                      >
                        {/* Net profit line dot */}
                        <div className="w-full flex items-end justify-center mb-1" style={{ height: "40px" }}>
                          <div
                            className={`w-1.5 rounded-full ${isNetPositive ? "bg-primary" : "bg-[#F41666]"}`}
                            style={{ height: `${netH}%`, minHeight: m.net !== 0 ? "2px" : "0" }}
                            title={`Net: ${fmt(m.net)}`}
                          />
                        </div>
                        {/* Revenue + expense bars side by side */}
                        <div className="w-full flex items-end gap-0.5" style={{ height: "192px" }}>
                          <div
                            className="flex-1 bg-emerald-500/70 rounded-t-sm transition-all"
                            style={{ height: `${revH}%`, minHeight: m.revenue > 0 ? "2px" : "0" }}
                            title={`Revenue: ${fmt(m.revenue)}`}
                          />
                          <div
                            className="flex-1 bg-[#F41666]/70 rounded-t-sm transition-all"
                            style={{ height: `${expH}%`, minHeight: m.expenses > 0 ? "2px" : "0" }}
                            title={`Expenses: ${fmt(m.expenses)}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Month labels */}
                <div className="flex items-center gap-1 mt-2">
                  {cashFlowMonths.map((m) => (
                    <div
                      key={`lbl-${m.year}-${m.month}`}
                      className="flex-1 text-center text-[10px] text-muted-foreground"
                    >
                      {m.label}
                    </div>
                  ))}
                </div>

                {/* Values row */}
                <div className="flex items-center gap-1 mt-1">
                  {cashFlowMonths.map((m) => (
                    <div
                      key={`val-${m.year}-${m.month}`}
                      className={`flex-1 text-center text-[9px] font-semibold ${
                        m.net >= 0 ? "text-emerald-500" : "text-[#F41666]"
                      }`}
                    >
                      {m.net !== 0
                        ? `${m.net > 0 ? "+" : ""}${(m.net / 1000).toFixed(1)}k`
                        : "—"}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 · Revenue Breakdown
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-primary" />
          Revenue Breakdown
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* By payment method */}
          <BreakdownCard
            title="By Payment Method"
            items={paymentMethods.map((p, i) => ({
              label: p.method,
              amount: p.amount,
              pct: p.pct,
              colorClass: BAR_COLORS[i % BAR_COLORS.length],
            }))}
            fmt={fmt}
            emptyMsg="No paid invoices in this period"
          />

          {/* By service category */}
          <BreakdownCard
            title="By Service Category"
            items={serviceCategories.map((c, i) => ({
              label: c.name,
              amount: c.amount,
              pct: c.pct,
              colorClass: BAR_COLORS[i % BAR_COLORS.length],
            }))}
            fmt={fmt}
            emptyMsg="No categorized services in this period"
          />

          {/* By staff member */}
          <BreakdownCard
            title="By Staff Member"
            items={staffRevBreakdown.map((s, i) => ({
              label: s.name,
              amount: s.amount,
              pct: s.pct,
              colorClass: BAR_COLORS[i % BAR_COLORS.length],
            }))}
            fmt={fmt}
            emptyMsg="No staff revenue data in this period"
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 · Expense Breakdown
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-[#F41666]" />
          Expense Breakdown
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By category with progress bars */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">
                By Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No expenses recorded in this period.
                </p>
              ) : (
                <div className="space-y-4">
                  {expCategories.map((cat, i) => (
                    <div key={cat.category}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                          />
                          {cat.category}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {fmt(cat.amount)}{" "}
                          <span className="text-foreground font-semibold">
                            ({cat.pct.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                          style={{ width: `${cat.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border flex justify-between text-sm font-semibold text-foreground">
                    <span>Total</span>
                    <span className="tabular-nums">{fmt(totalExpenses)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Month-over-month trend */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">
                Month-over-Month Trend (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                      Month
                    </th>
                    <th className="text-right pb-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                      Expenses
                    </th>
                    <th className="text-right pb-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {expTrend.map((row) => (
                    <tr key={row.label} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 text-foreground font-medium">{row.label}</td>
                      <td className="py-2.5 text-right tabular-nums text-foreground">
                        {fmt(row.amount)}
                      </td>
                      <td className="py-2.5 text-right">
                        {row.changeAmt === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                              row.changeAmt > 0
                                ? "text-[#F41666]"
                                : row.changeAmt < 0
                                ? "text-emerald-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            {row.changeAmt > 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : row.changeAmt < 0 ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : null}
                            {row.changeAmt > 0 ? "+" : ""}
                            {fmt(row.changeAmt)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 · Staff Commissions Detail
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Staff Commission Detail
        </h2>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            {Object.keys(staffCommMap).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No completed appointments with staff commissions in this period.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                      Staff Member
                    </th>
                    <th className="text-right pb-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                      Revenue Generated
                    </th>
                    <th className="text-right pb-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                      Commission Rate
                    </th>
                    <th className="text-right pb-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                      Commission Due
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {staffAll
                    .filter((s) => staffCommMap[s.id])
                    .sort(
                      (a, b) =>
                        (staffCommMap[b.id]?.commission ?? 0) -
                        (staffCommMap[a.id]?.commission ?? 0)
                    )
                    .map((s) => {
                      const data = staffCommMap[s.id];
                      return (
                        <tr
                          key={s.id}
                          className="hover:bg-secondary/30 transition-colors"
                        >
                          <td className="py-3 font-medium text-foreground">{s.name}</td>
                          <td className="py-3 text-right tabular-nums text-foreground">
                            {fmt(data.revenue)}
                          </td>
                          <td className="py-3 text-right text-muted-foreground">
                            {s.commissionPct.toFixed(1)}%
                          </td>
                          <td className="py-3 text-right tabular-nums font-semibold text-[#F48E16]">
                            {fmt(data.commission)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={3} className="pt-3 font-semibold text-foreground">
                      Total Commissions
                    </td>
                    <td className="pt-3 text-right font-bold text-[#F41666] tabular-nums">
                      {fmt(staffCommissions)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 7 · Tax Summary
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Tax Summary
        </h2>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <table className="w-full text-sm max-w-lg">
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="py-3 text-muted-foreground">Tax Rate</td>
                  <td className="py-3 text-right font-medium text-foreground">
                    {taxRate > 0 ? `${taxRate}%` : "Not configured"}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground">Total Revenue (Taxable Base)</td>
                  <td className="py-3 text-right font-semibold text-foreground tabular-nums">
                    {fmt(netRevenue)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground">
                    Tax Collected
                    {taxRate > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground/70">
                        ({taxRate}% of net revenue)
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right font-semibold text-foreground tabular-nums">
                    {taxRate > 0 ? fmt(taxCollected) : "—"}
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="pt-3 pb-1 font-semibold text-foreground">
                    Revenue Net of Tax
                  </td>
                  <td className="pt-3 pb-1 text-right font-bold text-foreground tabular-nums">
                    {taxRate > 0 ? fmt(netOfTax) : fmt(netRevenue)}
                  </td>
                </tr>
              </tbody>
            </table>
            {taxRate === 0 && (
              <p className="mt-4 text-xs text-muted-foreground bg-secondary/60 rounded-lg px-4 py-2.5">
                Tax rate is set to 0% in your salon settings. Configure it under Settings → Salon to enable tax collection tracking.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PLRow({
  label,
  value,
  fmt,
  indent = false,
  sub = false,
  subtotal = false,
  total = false,
  positive = false,
  negative = false,
}: {
  label: string;
  value: number;
  fmt: (n: number) => string;
  indent?: boolean;
  sub?: boolean;
  subtotal?: boolean;
  total?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  const displayed = Math.abs(value);
  const sign = value < 0 ? "− " : "";

  return (
    <tr
      className={`${
        total
          ? "border-t-2 border-border"
          : subtotal
          ? "border-t border-border"
          : ""
      }`}
    >
      <td
        className={`py-2.5 pr-4 ${
          total
            ? "text-base font-bold text-foreground"
            : subtotal
            ? "font-semibold text-foreground"
            : sub
            ? "pl-8 text-xs text-muted-foreground"
            : indent
            ? "pl-4 text-muted-foreground"
            : "text-muted-foreground"
        }`}
      >
        {label}
      </td>
      <td
        className={`py-2.5 text-right tabular-nums ${
          total
            ? `text-base font-bold ${positive ? "text-emerald-500" : negative ? "text-[#F41666]" : "text-foreground"}`
            : subtotal
            ? `font-semibold ${positive ? "text-emerald-500" : negative ? "text-[#F41666]" : "text-foreground"}`
            : sub
            ? `text-xs ${negative ? "text-[#F41666]" : "text-muted-foreground"}`
            : negative
            ? "text-[#F41666]"
            : positive
            ? "text-emerald-500"
            : "text-foreground"
        }`}
      >
        {sign}
        {fmt(displayed)}
      </td>
    </tr>
  );
}

function BreakdownCard({
  title,
  items,
  fmt,
  emptyMsg,
}: {
  title: string;
  items: { label: string; amount: number; pct: number; colorClass: string }[];
  fmt: (n: number) => string;
  emptyMsg: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyMsg}</p>
        ) : (
          <div className="space-y-3">
            {/* Flex-bar "donut" */}
            <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
              {items.map((item) => (
                <div
                  key={item.label}
                  className={`${item.colorClass} transition-all`}
                  style={{ width: `${item.pct}%` }}
                  title={`${item.label}: ${fmt(item.amount)} (${item.pct.toFixed(1)}%)`}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="space-y-2 mt-3">
              {items.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-foreground min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.colorClass}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums flex-shrink-0 ml-2">
                    {fmt(item.amount)}{" "}
                    <span className="text-foreground font-medium">
                      ({item.pct.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
