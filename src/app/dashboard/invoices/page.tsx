import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Receipt,
  Banknote,
  CreditCard,
  Wifi,
  MoreHorizontal,
  TrendingUp,
  FileText,
  Calendar,
  DollarSign,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Suspense } from "react";
import { InvoiceFilters } from "./invoice-filters";
import { InvoicesClient, type InvoiceSummary } from "./invoices-client";

export const dynamic = "force-dynamic";

// ─── helpers ─────────────────────────────────────────────────────────────────

const METHOD_ICON: Record<string, React.ReactNode> = {
  CASH: <Banknote className="w-3.5 h-3.5" />,
  CARD: <CreditCard className="w-3.5 h-3.5" />,
  ONLINE: <Wifi className="w-3.5 h-3.5" />,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function methodIcon(method: string) {
  return METHOD_ICON[method.toUpperCase()] ?? <MoreHorizontal className="w-3.5 h-3.5" />;
}

/** Returns the [start, end] Date pair for the given range slug. */
function rangeToDateBounds(range: string): [Date, Date] | null {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return [start, end];
  }
  if (range === "week") {
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return [start, end];
  }
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return [start, end];
  }
  if (range === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return [start, end];
  }
  return null;
}

// ─── page ────────────────────────────────────────────────────────────────────

interface SearchParams {
  q?: string;
  method?: string;
  range?: string;
  status?: string;
  from?: string;
  to?: string;
  minAmount?: string;
  sort?: string;
  dir?: string;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const methodFilter = sp.method?.trim().toUpperCase() ?? "";
  const rangeFilter = sp.range?.trim() ?? "";
  const statusFilter = sp.status?.trim().toUpperCase() ?? "";
  const fromFilter = sp.from?.trim() ?? "";
  const toFilter = sp.to?.trim() ?? "";
  const minAmountFilter = parseFloat(sp.minAmount ?? "") || 0;

  const [salon, invoicesAsc] = await Promise.all([
    prisma.salon.findFirst(),
    prisma.invoice.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        Client: true,
        Appointment: {
          include: {
            AppointmentService: {
              include: { Service: true },
            },
          },
        },
        InvoiceItem: true,
        PartialPayment: { orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  const currency = salon?.currency ?? "USD";
  const invoicePrefix = salon?.invoicePrefix ?? "INV";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // Build stable invoice number map: prefer note field (#INV-XXXX) then fallback to index
  const invoiceNumberMap = new Map<string, string>(
    invoicesAsc.map((inv, idx) => {
      if (inv.note) {
        const match = inv.note.match(new RegExp(`#(${invoicePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d+)`));
        if (match) return [inv.id, match[1]];
      }
      return [inv.id, `${invoicePrefix}-${String(idx + 1).padStart(4, "0")}`];
    })
  );

  // ── Today bounds ──────────────────────────────────────────────────────────
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // ── This-month bounds ─────────────────────────────────────────────────────
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // ── Header KPIs (always computed on ALL paid invoices, not filtered) ──────
  const paidAll = invoicesAsc.filter((i) => i.status === "PAID");

  const revenueToday = paidAll
    .filter((i) => {
      const d = new Date(i.createdAt);
      return d >= todayStart && d <= todayEnd;
    })
    .reduce((s, i) => s + i.total, 0);

  const thisMonthInvoices = invoicesAsc.filter((i) => {
    const d = new Date(i.createdAt);
    return d >= monthStart && d <= monthEnd;
  });
  const revenueThisMonth = thisMonthInvoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + i.total, 0);
  const totalThisMonth = thisMonthInvoices.length;
  const avgThisMonth =
    thisMonthInvoices.filter((i) => i.status === "PAID").length > 0
      ? revenueThisMonth / thisMonthInvoices.filter((i) => i.status === "PAID").length
      : 0;

  // Apply filters in-memory
  const dateBounds = rangeFilter ? rangeToDateBounds(rangeFilter) : null;
  const customFrom = fromFilter ? new Date(fromFilter + "T00:00:00") : null;
  const customTo = toFilter ? new Date(toFilter + "T23:59:59.999") : null;

  const filtered = invoicesAsc.filter((inv) => {
    if (q) {
      const clientName = inv.Client?.name ?? "";
      if (!clientName.toLowerCase().includes(q.toLowerCase())) return false;
    }
    if (methodFilter && inv.paymentMethod.toUpperCase() !== methodFilter) return false;
    if (statusFilter && inv.status.toUpperCase() !== statusFilter) return false;
    if (minAmountFilter > 0 && inv.total < minAmountFilter) return false;

    if (dateBounds) {
      const created = new Date(inv.createdAt);
      if (created < dateBounds[0] || created > dateBounds[1]) return false;
    } else if (customFrom || customTo) {
      const created = new Date(inv.createdAt);
      if (customFrom && created < customFrom) return false;
      if (customTo && created > customTo) return false;
    }
    return true;
  });

  // Newest first for display
  const invoices = [...filtered].reverse();

  // ── filtered summary stats ─────────────────────────────────────────────────
  const paidInvoices = invoices.filter((i) => i.status === "PAID");
  const totalRevenue = paidInvoices.reduce((s, i) => s + i.total, 0);
  const avgValue = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;

  const methodCounts: Record<string, number> = {};
  for (const inv of paidInvoices) {
    const m = inv.paymentMethod.toUpperCase();
    methodCounts[m] = (methodCounts[m] ?? 0) + 1;
  }
  const cashCount = methodCounts["CASH"] ?? 0;
  const cardCount = methodCounts["CARD"] ?? 0;
  const cashPct = paidInvoices.length > 0 ? Math.round((cashCount / paidInvoices.length) * 100) : 0;
  const cardPct = paidInvoices.length > 0 ? Math.round((cardCount / paidInvoices.length) * 100) : 0;

  // Build client-safe summaries
  const invoiceSummaries: InvoiceSummary[] = invoices.map((inv) => {
    const services = inv.Appointment?.AppointmentService ?? [];
    const invoiceItems = inv.InvoiceItem ?? [];
    const servicesSummary =
      services.length > 0
        ? services
            .slice(0, 3)
            .map((s) => s.Service.name)
            .join(", ") + (services.length > 3 ? ` +${services.length - 3}` : "")
        : invoiceItems.length > 0
        ? invoiceItems
            .slice(0, 3)
            .map((i) => i.name)
            .join(", ") + (invoiceItems.length > 3 ? ` +${invoiceItems.length - 3}` : "")
        : "";

    const partialPayments = inv.PartialPayment?.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      note: p.note ?? null,
      createdAt: p.createdAt.toISOString(),
    })) ?? [];

    return {
      id: inv.id,
      status: inv.status,
      total: inv.total,
      tip: (inv as { tip?: number }).tip ?? 0,
      discount: (inv as { discount?: number }).discount ?? 0,
      paymentMethod: inv.paymentMethod,
      createdAt: inv.createdAt.toISOString(),
      isRecurring: inv.isRecurring,
      clientName: inv.Client?.name ?? null,
      invoiceNum: invoiceNumberMap.get(inv.id) ?? `${invoicePrefix}-????`,
      servicesSummary,
      partialPayments,
      appointmentId: inv.appointmentId ?? null,
      paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
    };
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground mt-1">All payment records</p>
      </div>

      {/* Header KPI stats — always reflects all invoices, not filtered */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Today</p>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{fmt(revenueToday)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">revenue today</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">This Month</p>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{fmt(revenueThisMonth)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalThisMonth} invoice{totalThisMonth !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Avg</p>
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{fmt(avgThisMonth)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">avg invoice (this month)</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Method Split</p>
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Banknote className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${cashPct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{cashPct}%</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${cardPct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{cardPct}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Suspense>
        <InvoiceFilters />
      </Suspense>

      {/* Invoice table + tabs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            {invoices.length} Invoice{invoices.length !== 1 ? "s" : ""}
            {(q || methodFilter || rangeFilter || statusFilter || fromFilter || toFilter || minAmountFilter > 0) && (
              <span className="ml-2 text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                filtered
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8" />}
              title="No invoices found"
              description={
                q || methodFilter || rangeFilter || statusFilter || fromFilter || toFilter || minAmountFilter > 0
                  ? "Try adjusting your filters."
                  : "Invoices are created automatically when you complete and check out an appointment."
              }
            />
          ) : (
            <InvoicesClient
              invoices={invoiceSummaries}
              fmt={fmt}
              currency={currency}
              allInvoices={invoiceSummaries}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
