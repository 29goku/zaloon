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
  Target,
  AlertTriangle,
} from "lucide-react";
import { FinanceExportButton } from "./export-button";
import { getBudgets } from "@/app/actions/budget";
import { getRevenueGoals } from "@/app/actions/settings";
import { EXPENSE_CATEGORIES, CATEGORY_LABELS, type ExpenseCategory } from "@/app/actions/expenses-constants";
import { BudgetManager } from "@/components/finance/budget-manager";
import { RevenueGoalWidget } from "@/components/finance/revenue-goal-widget";
import type { CashFlowDay } from "@/components/finance/cash-flow-chart";

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

const MONTH_ABBREVS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── page ─────────────────────────────────────────────────────────────────────

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const activeTab = (typeof sp.tab === "string" ? sp.tab : "overview") as
    | "overview"
    | "revenue"
    | "expenses"
    | "budgets"
    | "projections";

  const now = new Date();
  const todayYear = now.getFullYear();

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
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  // ── primary data fetches ─────────────────────────────────────────────────────
  const [invoicesRaw, expensesRaw, staffAll, budgets, revenueGoals] = await Promise.all([
    prisma.invoice.findMany({
      where: { salonId, createdAt: { gte: fromDt, lte: toDt } },
      select: {
        id: true,
        total: true,
        status: true,
        paymentMethod: true,
        clientId: true,
        createdAt: true,
        tip: true,
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
      where: { salonId, date: { gte: from, lte: to } },
      select: { id: true, amount: true, category: true, date: true, description: true },
    }),

    prisma.staff.findMany({
      where: { salonId },
      select: { id: true, name: true, commissionPct: true },
    }),

    getBudgets(),
    getRevenueGoals(),
  ]);

  // ── P&L calculations ─────────────────────────────────────────────────────────
  const paidInvoices = invoicesRaw.filter((i) => i.status === "PAID");
  const voidInvoices = invoicesRaw.filter((i) => i.status === "VOID");
  const completedInvoices = invoicesRaw.filter(
    (i) => i.status === "PAID" || i.status === "COMPLETED"
  );

  const grossRevenue = paidInvoices.reduce((s, i) => s + i.total, 0);
  const refunds = voidInvoices.reduce((s, i) => s + i.total, 0);
  const tipsTotal = paidInvoices.reduce((s, i) => s + (i.tip ?? 0), 0);
  const netRevenue = grossRevenue - refunds;
  const totalExpenses = expensesRaw.reduce((s, e) => s + e.amount, 0);
  const grossProfit = netRevenue - totalExpenses;

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

  const taxCollected = taxRate > 0 ? (netRevenue * taxRate) / 100 : 0;
  const netOfTax = netRevenue - taxCollected;

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const uniqueClients = new Set(paidInvoices.map((i) => i.clientId).filter(Boolean)).size;
  const revenuePerClient = uniqueClients > 0 ? netRevenue / uniqueClients : 0;
  const activeStaffIds = new Set(completedInvoices.map((i) => i.Appointment?.staffId).filter(Boolean));
  const revenuePerStaff = activeStaffIds.size > 0 ? netRevenue / activeStaffIds.size : 0;
  const avgInvoiceValue = paidInvoices.length > 0 ? grossRevenue / paidInvoices.length : 0;

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

  // ── Budget utilization ───────────────────────────────────────────────────────
  const spentByCategory: Record<string, number> = expCatMap;
  const budgetRows = EXPENSE_CATEGORIES.map((cat) => {
    const budget = budgets[cat] ?? 0;
    const spent = spentByCategory[cat] ?? 0;
    const pct = budget > 0 ? (spent / budget) * 100 : 0;
    const status: "green" | "amber" | "red" = pct >= 100 ? "red" : pct >= 80 ? "amber" : "green";
    return { cat, label: CATEGORY_LABELS[cat], budget, spent, pct, status };
  });
  const overBudgetCategories = budgetRows.filter((r) => r.status === "red" && r.budget > 0);

  // ── Daily revenue for current month (Revenue tab) ────────────────────────────
  const dailyRevenueMap: Record<string, { invoices: number; total: number; tips: number }> = {};
  for (const inv of paidInvoices) {
    const d = inv.createdAt.toISOString().split("T")[0];
    if (!dailyRevenueMap[d]) dailyRevenueMap[d] = { invoices: 0, total: 0, tips: 0 };
    dailyRevenueMap[d].invoices++;
    dailyRevenueMap[d].total += inv.total;
    dailyRevenueMap[d].tips += inv.tip ?? 0;
  }
  const dailyRevenue = Object.entries(dailyRevenueMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({ date, ...data }));

  // ── Cash flow: last 12 months ──────────────────────────────────────────────────
  const cashFlowMonths: {
    label: string;
    year: number;
    month: number;
    revenue: number;
    expenses: number;
    net: number;
  }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = toDateString(d);
    const mEnd = toDateString(endOfMonth(d));
    const mFromDt = new Date(mStart + "T00:00:00.000Z");
    const mToDt = new Date(mEnd + "T23:59:59.999Z");

    const [revAgg, expAgg] = await Promise.all([
      prisma.invoice.aggregate({
        where: { salonId, status: "PAID", createdAt: { gte: mFromDt, lte: mToDt } },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({
        where: { salonId, date: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      }),
    ]);

    cashFlowMonths.push({
      label: MONTH_ABBREVS[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth(),
      revenue: revAgg._sum.total ?? 0,
      expenses: expAgg._sum.amount ?? 0,
      net: (revAgg._sum.total ?? 0) - (expAgg._sum.amount ?? 0),
    });
  }

  // ── Month-over-month expense trend ──────────────────────────────────────────
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

  // ── Daily cash flow data for CashFlowChart (current period) ─────────────────
  const dailyExpenseMap: Record<string, { amount: number; count: number }> = {};
  for (const exp of expensesRaw) {
    if (!dailyExpenseMap[exp.date]) dailyExpenseMap[exp.date] = { amount: 0, count: 0 };
    dailyExpenseMap[exp.date].amount += exp.amount;
    dailyExpenseMap[exp.date].count++;
  }

  const allDates = new Set([
    ...Object.keys(dailyRevenueMap),
    ...Object.keys(dailyExpenseMap),
  ]);

  const cashFlowDays: CashFlowDay[] = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      revenue: dailyRevenueMap[date]?.total ?? 0,
      expenses: dailyExpenseMap[date]?.amount ?? 0,
      invoiceCount: dailyRevenueMap[date]?.invoices ?? 0,
      expenseCount: dailyExpenseMap[date]?.count ?? 0,
    }));

  // ── Projections ──────────────────────────────────────────────────────────────
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  // This month actuals (always current month for projections)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [thisMonthRevAgg, thisMonthExpAgg] = await Promise.all([
    prisma.invoice.aggregate({
      where: { salonId, status: "PAID", createdAt: { gte: thisMonthStart, lte: now } },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      where: { salonId, date: { gte: toDateString(thisMonthStart), lte: toDateString(now) } },
      _sum: { amount: true },
    }),
  ]);
  const mtdRevenue = thisMonthRevAgg._sum.total ?? 0;
  const mtdExpenses = thisMonthExpAgg._sum.amount ?? 0;

  const dailyRevPace = dayOfMonth > 0 ? mtdRevenue / dayOfMonth : 0;
  const dailyExpPace = dayOfMonth > 0 ? mtdExpenses / dayOfMonth : 0;
  const projectedMonthRevenue = dailyRevPace * daysInMonth;
  const projectedMonthExpenses = dailyExpPace * daysInMonth;
  const projectedMonthProfit = projectedMonthRevenue - projectedMonthExpenses;

  // Revenue goals for widgets
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [weekRevAgg, annualRevAgg] = await Promise.all([
    prisma.invoice.aggregate({
      where: { salonId, status: "PAID", createdAt: { gte: weekStart } },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { salonId, status: "PAID", createdAt: { gte: yearStart } },
      _sum: { total: true },
    }),
  ]);
  const weekActual = weekRevAgg._sum.total ?? 0;
  const annualActual = annualRevAgg._sum.total ?? 0;

  // ── chart scaling ─────────────────────────────────────────────────────────
  const maxBar = Math.max(...cashFlowMonths.map((m) => Math.max(m.revenue, m.expenses)), 1);
  const maxNet = Math.max(...cashFlowMonths.map((m) => Math.abs(m.net)), 1);

  // ── P&L export data ───────────────────────────────────────────────────────────
  const plExportData = {
    from, to,
    grossRevenue, refunds, netRevenue, totalExpenses, grossProfit,
    staffCommissions, netProfit, profitMarginPct, taxRate, taxCollected, netOfTax,
    revenuePerClient, revenuePerStaff, avgInvoiceValue, uniqueClients,
    paidInvoicesCount: paidInvoices.length,
    currency,
  };

  // ── colors ─────────────────────────────────────────────────────────────────
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

  // ── tab link helper ───────────────────────────────────────────────────────
  function tabHref(tab: string) {
    return `?tab=${tab}&from=${from}&to=${to}`;
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "revenue", label: "Revenue" },
    { key: "expenses", label: "Expenses" },
    { key: "budgets", label: "Budgets" },
    { key: "projections", label: "Projections" },
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-primary" />
            Financial Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            P&amp;L · Cash Flow · Budgets · Revenue Goals · Projections
          </p>
        </div>
        <FinanceExportButton data={plExportData} />
      </div>

      {/* ── Budget Alert Banner ── */}
      {overBudgetCategories.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          <span className="text-destructive font-semibold">
            {overBudgetCategories.length}{" "}
            {overBudgetCategories.length === 1 ? "category is" : "categories are"} over budget this month:
          </span>
          <span className="text-muted-foreground">
            {overBudgetCategories.map((r) => r.label).join(", ")}
          </span>
          <Link
            href={tabHref("budgets")}
            className="ml-auto text-xs font-semibold text-destructive underline underline-offset-2 flex-shrink-0"
          >
            View Budgets
          </Link>
        </div>
      )}

      {/* ── Date Range Controls ── */}
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => {
          const isActive = from === preset.from && to === preset.to;
          return (
            <Link
              key={preset.label}
              href={`?tab=${activeTab}&from=${preset.from}&to=${preset.to}`}
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
        <form className="flex items-center gap-2 ml-2" method="GET">
          <input type="hidden" name="tab" value={activeTab} />
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

      {/* ── Tab navigation ── */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={tabHref(key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? "text-foreground border-primary bg-primary/5"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            {label}
            {key === "budgets" && overBudgetCategories.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {overBudgetCategories.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Active period banner */}
      <div className="flex items-center gap-3 px-5 py-3 bg-primary/8 border border-primary/20 rounded-xl text-sm">
        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-muted-foreground">
          Period:{" "}
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
          TAB: OVERVIEW
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-10">
          {/* Month summary KPI cards */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Month Summary
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Revenue",
                  value: fmt(netRevenue),
                  sub: `${paidInvoices.length} invoices`,
                  icon: DollarSign,
                  color: "text-primary",
                  bg: "bg-primary/10",
                },
                {
                  label: "Expenses",
                  value: fmt(totalExpenses),
                  sub: `${expensesRaw.length} items`,
                  icon: TrendingDown,
                  color: "text-[#F41666]",
                  bg: "bg-[#F41666]/10",
                },
                {
                  label: "Net Profit",
                  value: fmt(netProfit),
                  sub: netProfit >= 0 ? "Profitable period" : "Loss period",
                  icon: TrendingUp,
                  color: netProfit >= 0 ? "text-emerald-500" : "text-[#F41666]",
                  bg: netProfit >= 0 ? "bg-emerald-500/10" : "bg-[#F41666]/10",
                },
                {
                  label: "Profit Margin",
                  value: `${profitMarginPct.toFixed(1)}%`,
                  sub: `${uniqueClients} unique clients`,
                  icon: PieChart,
                  color: profitMarginPct >= 20 ? "text-emerald-500" : profitMarginPct >= 0 ? "text-amber-500" : "text-[#F41666]",
                  bg: profitMarginPct >= 20 ? "bg-emerald-500/10" : profitMarginPct >= 0 ? "bg-amber-500/10" : "bg-[#F41666]/10",
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
                      <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Revenue vs Expenses bar chart (last 6 months) */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Revenue vs Expenses — Last 6 Months
            </h2>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
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
                <div className="overflow-x-auto">
                  <div className="min-w-[480px]">
                    <div className="flex items-end gap-1 h-48 pb-0">
                      {cashFlowMonths.slice(-6).map((m) => {
                        const revH = maxBar > 0 ? (m.revenue / maxBar) * 100 : 0;
                        const expH = maxBar > 0 ? (m.expenses / maxBar) * 100 : 0;
                        const netH = maxNet > 0 ? (Math.abs(m.net) / maxNet) * 40 : 0;
                        const isNetPositive = m.net >= 0;
                        return (
                          <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full flex items-end justify-center mb-1" style={{ height: "40px" }}>
                              <div
                                className={`w-1.5 rounded-full ${isNetPositive ? "bg-primary" : "bg-[#F41666]"}`}
                                style={{ height: `${netH}%`, minHeight: m.net !== 0 ? "2px" : "0" }}
                                title={`Net: ${fmt(m.net)}`}
                              />
                            </div>
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
                    <div className="flex items-center gap-1 mt-2">
                      {cashFlowMonths.slice(-6).map((m) => (
                        <div key={`lbl-${m.year}-${m.month}`} className="flex-1 text-center text-[10px] text-muted-foreground">
                          {m.label}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {cashFlowMonths.slice(-6).map((m) => (
                        <div
                          key={`val-${m.year}-${m.month}`}
                          className={`flex-1 text-center text-[9px] font-semibold ${m.net >= 0 ? "text-emerald-500" : "text-[#F41666]"}`}
                        >
                          {m.net !== 0 ? `${m.net > 0 ? "+" : ""}${(m.net / 1000).toFixed(1)}k` : "—"}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Quick insights */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Quick Insights
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Revenue vs last month */}
              {(() => {
                const lastM = cashFlowMonths[cashFlowMonths.length - 2];
                const thisM = cashFlowMonths[cashFlowMonths.length - 1];
                const diff = lastM && lastM.revenue > 0 && thisM
                  ? ((thisM.revenue - lastM.revenue) / lastM.revenue) * 100
                  : null;
                return (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {diff !== null && diff >= 0
                        ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                        : <TrendingDown className="w-4 h-4 text-[#F41666]" />
                      }
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue Trend</span>
                    </div>
                    <p className="text-sm text-foreground">
                      {diff !== null
                        ? `Revenue is ${diff >= 0 ? "up" : "down"} ${Math.abs(diff).toFixed(1)}% vs last month`
                        : "No prior month data"
                      }
                    </p>
                  </div>
                );
              })()}

              {/* Top expense category */}
              {expCategories.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-[#F48E16]" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Top Expense</span>
                  </div>
                  <p className="text-sm text-foreground">
                    Top expense category:{" "}
                    <span className="font-semibold">{CATEGORY_LABELS[expCategories[0].category as ExpenseCategory] ?? expCategories[0].category}</span>
                    {" "}({fmt(expCategories[0].amount)})
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">No expenses recorded.</p>
                </div>
              )}

              {/* Best day */}
              {(() => {
                if (dailyRevenue.length === 0) {
                  return (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-sm text-muted-foreground">No revenue data this period.</p>
                    </div>
                  );
                }
                const best = dailyRevenue.reduce((a, b) => (a.total > b.total ? a : b));
                const dayName = new Date(best.date).toLocaleDateString("en", { weekday: "long" });
                return (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Best Day</span>
                    </div>
                    <p className="text-sm text-foreground">
                      Best day this period: <span className="font-semibold">{dayName}</span> ({fmt(best.total)})
                    </p>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Revenue Goal Widget */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Revenue Goals
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueGoalWidget
                goals={revenueGoals}
                monthActual={mtdRevenue}
                weekActual={weekActual}
                annualActual={annualActual}
                currency={currency}
                daysInMonth={daysInMonth}
                dayOfMonth={dayOfMonth}
              />

              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Revenue per Client",
                    value: fmt(revenuePerClient),
                    sub: `${uniqueClients} clients`,
                    icon: Users,
                    color: "text-primary",
                    bg: "bg-primary/10",
                  },
                  {
                    label: "Revenue per Staff",
                    value: fmt(revenuePerStaff),
                    sub: `${activeStaffIds.size} active`,
                    icon: Users,
                    color: "text-[#F48E16]",
                    bg: "bg-[#F48E16]/10",
                  },
                  {
                    label: "Avg Invoice",
                    value: fmt(avgInvoiceValue),
                    sub: `${paidInvoices.length} invoices`,
                    icon: Receipt,
                    color: "text-emerald-500",
                    bg: "bg-emerald-500/10",
                  },
                  {
                    label: "Tips",
                    value: fmt(tipsTotal),
                    sub: "This period",
                    icon: DollarSign,
                    color: "text-amber-500",
                    bg: "bg-amber-500/10",
                  },
                ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                  <Card key={label} className="bg-card border-border">
                    <CardContent className="pt-4 pb-3">
                      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center mb-2`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mt-0.5">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: REVENUE
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "revenue" && (
        <div className="space-y-10">
          {/* Daily revenue table */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Daily Revenue — {from} to {to}
            </h2>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                {dailyRevenue.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No revenue in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Date", "Day", "Invoices", "Total", "Tips"].map((h) => (
                            <th
                              key={h}
                              className={`pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${h === "Date" || h === "Day" ? "text-left pr-4" : "text-right pr-4"}`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {dailyRevenue.map((row) => (
                          <tr key={row.date} className="hover:bg-secondary/30 transition-colors">
                            <td className="py-2.5 pr-4 font-medium text-foreground">{row.date}</td>
                            <td className="py-2.5 pr-4 text-muted-foreground">
                              {new Date(row.date).toLocaleDateString("en", { weekday: "short" })}
                            </td>
                            <td className="py-2.5 pr-4 text-right text-foreground">{row.invoices}</td>
                            <td className="py-2.5 pr-4 text-right font-semibold text-foreground tabular-nums">{fmt(row.total)}</td>
                            <td className="py-2.5 pr-4 text-right text-amber-500 tabular-nums">{row.tips > 0 ? fmt(row.tips) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border">
                          <td colSpan={2} className="pt-3 font-bold text-foreground">Total</td>
                          <td className="pt-3 text-right font-bold text-foreground">{paidInvoices.length}</td>
                          <td className="pt-3 text-right font-bold text-foreground tabular-nums">{fmt(netRevenue)}</td>
                          <td className="pt-3 text-right font-bold text-amber-500 tabular-nums">{tipsTotal > 0 ? fmt(tipsTotal) : "—"}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Revenue breakdowns */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Revenue Breakdowns
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            </div>
          </section>

          {/* P&L Statement */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Profit &amp; Loss Statement
            </h2>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <table className="w-full text-sm max-w-lg">
                  <tbody className="divide-y divide-border/50">
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                      <td colSpan={2} className="pb-2 pt-1 font-semibold">Revenue</td>
                    </tr>
                    <PLRow label="Gross Revenue" value={grossRevenue} fmt={fmt} indent />
                    <PLRow label="Refunds / Voids" value={-refunds} fmt={fmt} indent negative={refunds > 0} />
                    <PLRow label="Net Revenue" value={netRevenue} fmt={fmt} subtotal positive={netRevenue >= 0} negative={netRevenue < 0} />
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                      <td colSpan={2} className="pb-2 pt-4 font-semibold">Expenses</td>
                    </tr>
                    <PLRow label="Total Operating Expenses" value={-totalExpenses} fmt={fmt} indent negative={totalExpenses > 0} />
                    <PLRow label="Gross Profit" value={grossProfit} fmt={fmt} subtotal positive={grossProfit >= 0} negative={grossProfit < 0} />
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                      <td colSpan={2} className="pb-2 pt-4 font-semibold">Staff Commissions</td>
                    </tr>
                    <PLRow label="Staff Commissions" value={-staffCommissions} fmt={fmt} indent negative={staffCommissions > 0} />
                    {Object.values(staffCommMap).filter((s) => s.commission > 0).sort((a, b) => b.commission - a.commission).map((s) => (
                      <PLRow key={s.name} label={`↳ ${s.name}`} value={-s.commission} fmt={fmt} indent sub negative />
                    ))}
                    <tr><td colSpan={2} className="pt-2"><div className="h-px bg-border" /></td></tr>
                    <PLRow label="Net Profit" value={netProfit} fmt={fmt} total positive={netProfit >= 0} negative={netProfit < 0} />
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>

          {/* Staff commission detail */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Staff Commission Detail
            </h2>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                {Object.keys(staffCommMap).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No completed appointments with staff commissions in this period.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Staff Member", "Revenue Generated", "Commission Rate", "Commission Due"].map((h, i) => (
                          <th key={h} className={`pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${i === 0 ? "text-left" : "text-right"}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {staffAll.filter((s) => staffCommMap[s.id]).sort((a, b) => (staffCommMap[b.id]?.commission ?? 0) - (staffCommMap[a.id]?.commission ?? 0)).map((s) => {
                        const data = staffCommMap[s.id];
                        return (
                          <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="py-3 font-medium text-foreground">{s.name}</td>
                            <td className="py-3 text-right tabular-nums text-foreground">{fmt(data.revenue)}</td>
                            <td className="py-3 text-right text-muted-foreground">{s.commissionPct.toFixed(1)}%</td>
                            <td className="py-3 text-right tabular-nums font-semibold text-[#F48E16]">{fmt(data.commission)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border">
                        <td colSpan={3} className="pt-3 font-semibold text-foreground">Total Commissions</td>
                        <td className="pt-3 text-right font-bold text-[#F41666] tabular-nums">{fmt(staffCommissions)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: EXPENSES
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "expenses" && (
        <div className="space-y-10">
          {/* Expense by category */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-[#F41666]" />
              Expense Breakdown
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">By Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {expCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No expenses recorded in this period.</p>
                  ) : (
                    <div className="space-y-4">
                      {expCategories.map((cat, i) => (
                        <div key={cat.category}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-medium text-foreground flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                              {CATEGORY_LABELS[cat.category as ExpenseCategory] ?? cat.category}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              {fmt(cat.amount)}{" "}
                              <span className="text-foreground font-semibold">({cat.pct.toFixed(1)}%)</span>
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} style={{ width: `${cat.pct}%` }} />
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

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">Month-over-Month Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Month</th>
                        <th className="text-right pb-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Expenses</th>
                        <th className="text-right pb-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {expTrend.map((row) => (
                        <tr key={row.label} className="hover:bg-secondary/30 transition-colors">
                          <td className="py-2.5 text-foreground font-medium">{row.label}</td>
                          <td className="py-2.5 text-right tabular-nums text-foreground">{fmt(row.amount)}</td>
                          <td className="py-2.5 text-right">
                            {row.changeAmt === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${row.changeAmt > 0 ? "text-[#F41666]" : row.changeAmt < 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                                {row.changeAmt > 0 ? <ArrowUpRight className="w-3 h-3" /> : row.changeAmt < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                                {row.changeAmt > 0 ? "+" : ""}{fmt(row.changeAmt)}
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

          {/* Expense list */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              Expense Transactions
            </h2>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                {expensesRaw.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No expenses in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Date", "Category", "Description", "Amount"].map((h, i) => (
                            <th key={h} className={`pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${i === 0 || i === 1 || i === 2 ? "text-left pr-4" : "text-right"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {[...expensesRaw].sort((a, b) => b.date.localeCompare(a.date)).map((exp) => (
                          <tr key={exp.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="py-2.5 pr-4 text-foreground">{exp.date}</td>
                            <td className="py-2.5 pr-4 text-muted-foreground">
                              {CATEGORY_LABELS[exp.category as ExpenseCategory] ?? exp.category}
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground truncate max-w-xs">
                              {exp.description ?? "—"}
                            </td>
                            <td className="py-2.5 text-right tabular-nums font-semibold text-[#F41666]">
                              {fmt(exp.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: BUDGETS
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "budgets" && (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Budget Management — {now.toLocaleString("default", { month: "long", year: "numeric" })}
            </h2>
            <BudgetManager
              budgets={budgets}
              spentByCategory={spentByCategory}
              currency={currency}
            />
          </section>

          {/* Budget vs Actual summary table */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Budget vs Actual Summary
            </h2>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Category", "Budget", "Spent", "Remaining", "% Used", "Progress"].map((h, i) => (
                          <th key={h} className={`pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${i === 0 ? "text-left pr-4" : "text-right pr-4"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {budgetRows.map((row) => (
                        <tr key={row.cat} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="py-3 pr-4 font-medium text-foreground">{row.label}</td>
                          <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                            {row.budget > 0 ? fmt(row.budget) : <span className="italic">Not set</span>}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums text-foreground font-medium">{fmt(row.spent)}</td>
                          <td className={`py-3 pr-4 text-right tabular-nums font-semibold ${row.budget > 0 ? (row.budget - row.spent < 0 ? "text-destructive" : "text-emerald-500") : "text-muted-foreground"}`}>
                            {row.budget > 0 ? fmt(row.budget - row.spent) : "—"}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${row.status === "red" ? "bg-destructive/15 text-destructive" : row.status === "amber" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"}`}>
                              {row.budget > 0 ? `${row.pct.toFixed(0)}%` : "—"}
                            </span>
                          </td>
                          <td className="py-3 min-w-[120px]">
                            {row.budget > 0 ? (
                              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${row.status === "red" ? "bg-destructive" : row.status === "amber" ? "bg-amber-500" : "bg-emerald-500"}`}
                                  style={{ width: `${Math.min(row.pct, 100)}%` }}
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No budget</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PROJECTIONS
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "projections" && (
        <div className="space-y-10">
          {/* Projection KPIs */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Month Projections — Based on Current Pace
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Projected Revenue",
                  value: fmt(projectedMonthRevenue),
                  sub: `MTD: ${fmt(mtdRevenue)}`,
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10",
                },
                {
                  label: "Projected Expenses",
                  value: fmt(projectedMonthExpenses),
                  sub: `MTD: ${fmt(mtdExpenses)}`,
                  color: "text-[#F41666]",
                  bg: "bg-[#F41666]/10",
                },
                {
                  label: "Projected Profit",
                  value: fmt(projectedMonthProfit),
                  sub: projectedMonthProfit >= 0 ? "Profitable pace" : "Loss pace",
                  color: projectedMonthProfit >= 0 ? "text-primary" : "text-[#F41666]",
                  bg: projectedMonthProfit >= 0 ? "bg-primary/10" : "bg-[#F41666]/10",
                },
                {
                  label: "Days Remaining",
                  value: String(daysRemaining),
                  sub: `Day ${dayOfMonth} of ${daysInMonth}`,
                  color: "text-amber-500",
                  bg: "bg-amber-500/10",
                },
              ].map(({ label, value, sub, color, bg }) => (
                <Card key={label} className="bg-card border-border">
                  <CardContent className="pt-5 pb-4">
                    <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mt-1">{label}</p>
                    <p className={`text-xs font-medium mt-1 ${color}`}>{sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Revenue goal progress for projections */}
          {revenueGoals.monthly > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Goal Progress
              </h2>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      {
                        label: "Monthly Goal",
                        actual: mtdRevenue,
                        target: revenueGoals.monthly,
                        projected: projectedMonthRevenue,
                      },
                      {
                        label: "Weekly Goal",
                        actual: weekActual,
                        target: revenueGoals.weekly,
                        projected: null,
                      },
                      {
                        label: "Annual Goal",
                        actual: annualActual,
                        target: revenueGoals.annual,
                        projected: null,
                      },
                    ].map(({ label, actual, target, projected }) => {
                      const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
                      const projPct = projected !== null && target > 0 ? Math.min((projected / target) * 100, 100) : null;
                      return (
                        <div key={label} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">{label}</span>
                            {target > 0 ? (
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {fmt(actual)} / {fmt(target)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Not set</span>
                            )}
                          </div>
                          {target > 0 && (
                            <>
                              <div className="h-3 rounded-full bg-secondary overflow-hidden relative">
                                {/* Projected bar (lighter) */}
                                {projPct !== null && (
                                  <div
                                    className="h-full rounded-full bg-primary/30 absolute inset-0 transition-all"
                                    style={{ width: `${projPct}%` }}
                                  />
                                )}
                                {/* Actual bar */}
                                <div
                                  className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{pct.toFixed(0)}% actual</span>
                                {projPct !== null && (
                                  <span className="text-primary">{projPct.toFixed(0)}% projected</span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* 12-month cash flow chart */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Cash Flow — Last 12 Months
            </h2>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
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
                <div className="overflow-x-auto">
                  <div className="min-w-[640px]">
                    <div className="flex items-end gap-1 h-48 pb-0">
                      {cashFlowMonths.map((m) => {
                        const revH = maxBar > 0 ? (m.revenue / maxBar) * 100 : 0;
                        const expH = maxBar > 0 ? (m.expenses / maxBar) * 100 : 0;
                        const netH = maxNet > 0 ? (Math.abs(m.net) / maxNet) * 40 : 0;
                        const isNetPositive = m.net >= 0;
                        return (
                          <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full flex items-end justify-center mb-1" style={{ height: "40px" }}>
                              <div
                                className={`w-1.5 rounded-full ${isNetPositive ? "bg-primary" : "bg-[#F41666]"}`}
                                style={{ height: `${netH}%`, minHeight: m.net !== 0 ? "2px" : "0" }}
                                title={`Net: ${fmt(m.net)}`}
                              />
                            </div>
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
                    <div className="flex items-center gap-1 mt-2">
                      {cashFlowMonths.map((m) => (
                        <div key={`lbl-${m.year}-${m.month}`} className="flex-1 text-center text-[10px] text-muted-foreground">
                          {m.label}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {cashFlowMonths.map((m) => (
                        <div
                          key={`val-${m.year}-${m.month}`}
                          className={`flex-1 text-center text-[9px] font-semibold ${m.net >= 0 ? "text-emerald-500" : "text-[#F41666]"}`}
                        >
                          {m.net !== 0 ? `${m.net > 0 ? "+" : ""}${(m.net / 1000).toFixed(1)}k` : "—"}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Daily cash flow for current period */}
          {cashFlowDays.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Daily Cash Flow — {from} to {to}
              </h2>
              {/* Render CashFlowChart as static SVG in server component */}
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <DailyCashFlowSvg data={cashFlowDays} fmt={fmt} />
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PLRow({
  label, value, fmt,
  indent = false, sub = false, subtotal = false, total = false,
  positive = false, negative = false,
}: {
  label: string; value: number; fmt: (n: number) => string;
  indent?: boolean; sub?: boolean; subtotal?: boolean; total?: boolean;
  positive?: boolean; negative?: boolean;
}) {
  const displayed = Math.abs(value);
  const sign = value < 0 ? "− " : "";
  return (
    <tr className={`${total ? "border-t-2 border-border" : subtotal ? "border-t border-border" : ""}`}>
      <td className={`py-2.5 pr-4 ${total ? "text-base font-bold text-foreground" : subtotal ? "font-semibold text-foreground" : sub ? "pl-8 text-xs text-muted-foreground" : indent ? "pl-4 text-muted-foreground" : "text-muted-foreground"}`}>
        {label}
      </td>
      <td className={`py-2.5 text-right tabular-nums ${total ? `text-base font-bold ${positive ? "text-emerald-500" : negative ? "text-[#F41666]" : "text-foreground"}` : subtotal ? `font-semibold ${positive ? "text-emerald-500" : negative ? "text-[#F41666]" : "text-foreground"}` : sub ? `text-xs ${negative ? "text-[#F41666]" : "text-muted-foreground"}` : negative ? "text-[#F41666]" : positive ? "text-emerald-500" : "text-foreground"}`}>
        {sign}{fmt(displayed)}
      </td>
    </tr>
  );
}

function BreakdownCard({
  title, items, fmt, emptyMsg,
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
            <div className="space-y-2 mt-3">
              {items.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-foreground min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.colorClass}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums flex-shrink-0 ml-2">
                    {fmt(item.amount)}{" "}
                    <span className="text-foreground font-medium">({item.pct.toFixed(1)}%)</span>
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

// Server-safe static SVG cash flow chart (no client interactivity)
function DailyCashFlowSvg({
  data,
  fmt,
}: {
  data: CashFlowDay[];
  fmt: (n: number) => string;
}) {
  if (data.length < 2) return null;

  let running = 0;
  const points = data.map((d) => {
    running += d.revenue - d.expenses;
    return { ...d, balance: running };
  });

  const W = 800;
  const H = 180;
  const PAD_L = 72;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 32;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const maxBal = Math.max(...points.map((p) => p.balance), 1);
  const minBal = Math.min(...points.map((p) => p.balance), 0);
  const range = maxBal - minBal || 1;

  const xOf = (i: number) => PAD_L + (i / Math.max(points.length - 1, 1)) * innerW;
  const yOf = (v: number) => PAD_T + innerH - ((v - minBal) / range) * innerH;

  const polyPoints = points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.balance).toFixed(1)}`).join(" ");
  const zeroY = yOf(Math.max(minBal, 0));
  const areaPoints = `${xOf(0).toFixed(1)},${zeroY.toFixed(1)} ${polyPoints} ${xOf(points.length - 1).toFixed(1)},${zeroY.toFixed(1)}`;

  const GRIDS = 4;
  const step = Math.max(1, Math.floor(points.length / 7));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: "400px" }} aria-label="Daily cash flow chart">
        {Array.from({ length: GRIDS + 1 }, (_, gi) => {
          const v = minBal + (gi / GRIDS) * range;
          const gy = yOf(v);
          return (
            <g key={gi}>
              <line x1={PAD_L} y1={gy} x2={W - PAD_R} y2={gy} stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" className="text-border" />
              <text x={PAD_L - 6} y={gy + 4} textAnchor="end" fontSize="9" className="fill-muted-foreground">
                {new Intl.NumberFormat("en-US", { notation: "compact" }).format(v)}
              </text>
            </g>
          );
        })}
        <polygon points={areaPoints} fill="currentColor" className="text-primary" opacity="0.08" />
        <polyline points={polyPoints} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="text-primary" />
        {points.filter((_, i) => i % step === 0 || i === points.length - 1).map((p) => {
          const i = points.indexOf(p);
          const [, m, d] = p.date.split("-");
          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          return (
            <text key={`xl-${i}`} x={xOf(i)} y={H - 8} textAnchor="middle" fontSize="9" className="fill-muted-foreground">
              {months[parseInt(m, 10) - 1]} {parseInt(d, 10)}
            </text>
          );
        })}
        {points.map((p, i) => (
          <circle key={i} cx={xOf(i)} cy={yOf(p.balance)} r={3} fill={p.balance >= 0 ? "#6366f1" : "#ef4444"} stroke="currentColor" strokeWidth="1.5" className="text-background" />
        ))}
      </svg>
    </div>
  );
}
