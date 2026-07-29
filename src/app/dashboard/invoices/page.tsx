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

  // Build stable invoice number map (ascending order = 1-based index)
  const invoiceNumberMap = new Map<string, string>(
    invoicesAsc.map((inv, idx) => [
      inv.id,
      `${invoicePrefix}-${String(idx + 1).padStart(4, "0")}`,
    ])
  );

  // Apply filters in-memory
  const dateBounds = rangeToDateBounds(rangeFilter);

  const filtered = invoicesAsc.filter((inv) => {
    if (q) {
      const clientName = inv.Client?.name ?? "";
      if (!clientName.toLowerCase().includes(q.toLowerCase())) return false;
    }
    if (methodFilter && inv.paymentMethod.toUpperCase() !== methodFilter) return false;
    if (statusFilter && inv.status.toUpperCase() !== statusFilter) return false;
    if (dateBounds) {
      const created = new Date(inv.createdAt);
      if (created < dateBounds[0] || created > dateBounds[1]) return false;
    }
    return true;
  });

  // Newest first for display
  const invoices = [...filtered].reverse();

  // ── summary stats ──────────────────────────────────────────────────────────
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

  // Build client-safe summaries (ISO strings for createdAt so serialization works)
  const invoiceSummaries: InvoiceSummary[] = invoices.map((inv) => ({
    id: inv.id,
    status: inv.status,
    total: inv.total,
    tip: (inv as { tip?: number }).tip ?? 0,
    paymentMethod: inv.paymentMethod,
    createdAt: inv.createdAt.toISOString(),
    isRecurring: inv.isRecurring,
    clientName: inv.Client?.name ?? null,
    invoiceNum: invoiceNumberMap.get(inv.id) ?? `${invoicePrefix}-????`,
  }));

  // Serialize fmt function — pass currency so client can re-create it
  // (can't pass functions, so we pass currency and recreate on client)

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground mt-1">All payment records</p>
      </div>

      {/* Summary stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{fmt(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {paidInvoices.length} paid invoice{paidInvoices.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Count</p>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">total shown</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Value</p>
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{fmt(avgValue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">per paid invoice</p>
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8" />}
              title="No invoices found"
              description={
                q || methodFilter || rangeFilter || statusFilter
                  ? "Try adjusting your filters."
                  : "Invoices are created automatically when you complete and check out an appointment."
              }
            />
          ) : (
            <InvoicesClient invoices={invoiceSummaries} fmt={fmt} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
