import { prisma } from "@/lib/prisma";
import { getTaxSettings } from "@/app/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Receipt, DollarSign, Percent, FileText, BarChart3, ArrowLeft, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────────────

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

function thisQuarterRange(now: Date): { from: string; to: string; q: 1 | 2 | 3 | 4 } {
  const q = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  return { ...quarterRange(q, now.getFullYear()), q };
}

function lastQuarterRange(now: Date): { from: string; to: string; q: 1 | 2 | 3 | 4 } {
  const thisQ = Math.floor(now.getMonth() / 3) + 1;
  const lastQ = thisQ === 1 ? 4 : (thisQ - 1) as 1 | 2 | 3 | 4;
  const year = thisQ === 1 ? now.getFullYear() - 1 : now.getFullYear();
  return { ...quarterRange(lastQ, year), q: lastQ };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_ABBREVS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── page ─────────────────────────────────────────────────────────────────────

export default async function TaxReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = now.getFullYear();

  // Period presets
  const thisQR = thisQuarterRange(now);
  const lastQR = lastQuarterRange(now);

  const periodPresets = [
    { label: "This Quarter", from: thisQR.from, to: toDateString(now), key: "this_quarter" },
    { label: "Last Quarter", from: lastQR.from, to: lastQR.to, key: "last_quarter" },
    { label: "This Year", from: `${year}-01-01`, to: toDateString(now), key: "this_year" },
    { label: "Last Year", from: `${year - 1}-01-01`, to: `${year - 1}-12-31`, key: "last_year" },
  ];

  // Determine active period
  const activeKey = typeof sp.period === "string" ? sp.period : "this_quarter";
  const isCustom = activeKey === "custom";

  let from: string;
  let to: string;

  if (isCustom) {
    from =
      typeof sp.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)
        ? sp.from
        : toDateString(new Date(year, 0, 1));
    to =
      typeof sp.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)
        ? sp.to
        : toDateString(now);
  } else {
    const preset = periodPresets.find((p) => p.key === activeKey) ?? periodPresets[0];
    from = preset.from;
    to = preset.to;
  }

  if (from > to) [from, to] = [to, from];

  const fromDt = new Date(from + "T00:00:00.000Z");
  const toDt = new Date(to + "T23:59:59.999Z");

  // Load salon and tax settings in parallel
  const [salon, taxSettings] = await Promise.all([
    prisma.salon.findFirst(),
    getTaxSettings(),
  ]);

  const currency = salon?.currency ?? "USD";
  const salonId = salon?.id ?? "";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const fmtPct = (n: number) => `${n.toFixed(2)}%`;

  // Effective tax rate for computation
  const taxRate = taxSettings.enabled ? taxSettings.taxRate : (salon?.taxRate ?? 0);

  // ── Fetch paid invoices in the period ──────────────────────────────────────

  const invoices = await prisma.invoice.findMany({
    where: {
      salonId,
      status: "PAID",
      createdAt: { gte: fromDt, lte: toDt },
    },
    select: {
      id: true,
      total: true,
      createdAt: true,
    },
  });

  // ── Tax computation helper ─────────────────────────────────────────────────
  // Invoice model has no tax field — compute dynamically
  function computeTax(total: number): { exTax: number; tax: number } {
    if (taxRate === 0) return { exTax: total, tax: 0 };
    if (taxSettings.includeTaxInPrice) {
      // tax-inclusive: back-calculate
      const tax = total - total / (1 + taxRate / 100);
      return { exTax: total - tax, tax };
    } else {
      // tax-exclusive: total already includes tax added on top
      // treat total as pre-tax and derive tax from it
      const tax = total * (taxRate / 100);
      return { exTax: total, tax };
    }
  }

  // ── Summary metrics ────────────────────────────────────────────────────────

  let totalRevExTax = 0;
  let totalTax = 0;

  for (const inv of invoices) {
    const { exTax, tax } = computeTax(inv.total);
    totalRevExTax += exTax;
    totalTax += tax;
  }

  const totalRevIncTax = totalRevExTax + totalTax;
  const effectiveTaxRate =
    totalRevExTax > 0 ? (totalTax / totalRevExTax) * 100 : 0;
  const taxedTransactions = taxRate > 0 ? invoices.length : 0;

  // ── Monthly breakdown ──────────────────────────────────────────────────────

  // Determine month range
  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T00:00:00");

  const monthlyRows: {
    label: string;
    year: number;
    month: number;
    exTax: number;
    tax: number;
    total: number;
  }[] = [];

  // Build month list
  const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const endCursor = new Date(toDate.getFullYear(), toDate.getMonth(), 1);

  while (cursor <= endCursor) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const mStart = new Date(y, m, 1);
    const mEnd = endOfMonth(mStart);
    const mFromDt = new Date(toDateString(mStart) + "T00:00:00.000Z");
    const mToDt = new Date(toDateString(mEnd) + "T23:59:59.999Z");

    const monthInvoices = invoices.filter(
      (inv) => inv.createdAt >= mFromDt && inv.createdAt <= mToDt
    );

    let mExTax = 0;
    let mTax = 0;
    for (const inv of monthInvoices) {
      const { exTax, tax } = computeTax(inv.total);
      mExTax += exTax;
      mTax += tax;
    }

    monthlyRows.push({
      label: `${MONTH_NAMES[m]} ${y}`,
      year: y,
      month: m,
      exTax: mExTax,
      tax: mTax,
      total: mExTax + mTax,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  // ── Quarterly summary ──────────────────────────────────────────────────────

  const quarters: { label: string; from: string; to: string; q: 1 | 2 | 3 | 4; yearLabel: number }[] = [];

  // Collect quarters that overlap with the date range
  const fromYear = fromDate.getFullYear();
  const toYear = toDate.getFullYear();

  for (let y = fromYear; y <= toYear; y++) {
    for (let q = 1; q <= 4; q++) {
      const qr = quarterRange(q as 1 | 2 | 3 | 4, y);
      // Only include if quarter overlaps the period
      if (qr.to >= from && qr.from <= to) {
        quarters.push({ label: `Q${q} ${y}`, from: qr.from, to: qr.to, q: q as 1 | 2 | 3 | 4, yearLabel: y });
      }
    }
  }

  const quarterSummaries = quarters.map(({ label, from: qFrom, to: qTo }) => {
    const qFromDt = new Date(qFrom + "T00:00:00.000Z");
    const qToDt = new Date(qTo + "T23:59:59.999Z");
    const qInvoices = invoices.filter(
      (inv) => inv.createdAt >= qFromDt && inv.createdAt <= qToDt
    );
    let qExTax = 0;
    let qTax = 0;
    for (const inv of qInvoices) {
      const { exTax, tax } = computeTax(inv.total);
      qExTax += exTax;
      qTax += tax;
    }
    return { label, exTax: qExTax, tax: qTax, total: qExTax + qTax, count: qInvoices.length };
  });

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-7 h-7 text-primary" />
            Tax Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Tax collected · Monthly breakdown · Quarterly summary
          </p>
        </div>
        <Link
          href="/dashboard/settings/tax"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Settings className="w-4 h-4" />
          Tax Settings
        </Link>
      </div>

      {/* Tax not configured warning */}
      {!taxSettings.enabled && taxRate === 0 && (
        <div className="flex items-start gap-3 px-5 py-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm">
          <FileText className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Tax not configured</p>
            <p className="text-muted-foreground mt-0.5">
              Enable and configure tax rates in{" "}
              <Link
                href="/dashboard/settings/tax"
                className="text-primary underline underline-offset-2"
              >
                Tax Settings
              </Link>{" "}
              to see accurate tax data.
            </p>
          </div>
        </div>
      )}

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {periodPresets.map((preset) => {
          const isActive = !isCustom && activeKey === preset.key;
          return (
            <Link
              key={preset.key}
              href={`?period=${preset.key}`}
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
        {/* Custom range */}
        <form className="flex items-center gap-2 ml-2" method="GET">
          <input type="hidden" name="period" value="custom" />
          <input
            name="from"
            type="date"
            defaultValue={isCustom ? from : ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <input
            name="to"
            type="date"
            defaultValue={isCustom ? to : ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <button
            type="submit"
            className="h-8 px-3 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors border border-border"
          >
            Custom
          </button>
        </form>
      </div>

      {/* Active period banner */}
      <div className="flex items-center gap-3 px-5 py-3 bg-primary/8 border border-primary/20 rounded-xl text-sm">
        <Receipt className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-muted-foreground">
          Period:{" "}
          <span className="text-foreground font-semibold">{from}</span>
          {" "}→{" "}
          <span className="text-foreground font-semibold">{to}</span>
        </span>
        {taxSettings.enabled && (
          <span className="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary whitespace-nowrap">
            {taxSettings.taxName} · {taxRate}%
            {taxSettings.taxNumber ? ` · ${taxSettings.taxNumber}` : ""}
          </span>
        )}
      </div>

      {/* Summary cards */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Summary
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Revenue (ex-tax)",
              value: fmt(totalRevExTax),
              sub: `${invoices.length} invoices`,
              icon: DollarSign,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Tax Collected",
              value: fmt(totalTax),
              sub: `${taxSettings.taxName || "Tax"} @ ${taxRate}%`,
              icon: Percent,
              color: "text-[#F48E16]",
              bg: "bg-[#F48E16]/10",
            },
            {
              label: "Effective Tax Rate",
              value: fmtPct(effectiveTaxRate),
              sub: "Tax ÷ Revenue (ex-tax)",
              icon: BarChart3,
              color: "text-emerald-500",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Taxed Transactions",
              value: taxedTransactions.toString(),
              sub: taxRate > 0 ? "Paid invoices" : "Tax not enabled",
              icon: Receipt,
              color: "text-violet-500",
              bg: "bg-violet-500/10",
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

      {/* Monthly breakdown */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Monthly Breakdown
        </h2>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            {monthlyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No invoices in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                        Month
                      </th>
                      <th className="text-right pb-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                        Revenue (ex-tax)
                      </th>
                      <th className="text-right pb-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                        Tax Collected
                      </th>
                      <th className="text-right pb-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                        Total (inc-tax)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {monthlyRows.map((row) => (
                      <tr
                        key={`${row.year}-${row.month}`}
                        className="hover:bg-secondary/30 transition-colors"
                      >
                        <td className="py-3 font-medium text-foreground">{row.label}</td>
                        <td className="py-3 text-right tabular-nums text-foreground">
                          {fmt(row.exTax)}
                        </td>
                        <td className="py-3 text-right tabular-nums text-[#F48E16] font-medium">
                          {fmt(row.tax)}
                        </td>
                        <td className="py-3 text-right tabular-nums font-semibold text-foreground">
                          {fmt(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td className="pt-3 pb-1 font-bold text-foreground">Total</td>
                      <td className="pt-3 pb-1 text-right font-bold tabular-nums text-foreground">
                        {fmt(totalRevExTax)}
                      </td>
                      <td className="pt-3 pb-1 text-right font-bold tabular-nums text-[#F48E16]">
                        {fmt(totalTax)}
                      </td>
                      <td className="pt-3 pb-1 text-right font-bold tabular-nums text-foreground">
                        {fmt(totalRevIncTax)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Quarterly summary */}
      {quarterSummaries.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Quarterly Summary
            <span className="text-xs text-muted-foreground font-normal ml-1">
              (for tax filing)
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quarterSummaries.map((q) => (
              <Card key={q.label} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                    {q.label}
                    <span className="text-xs font-normal text-muted-foreground">
                      {q.count} invoices
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenue (ex-tax)</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {fmt(q.exTax)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {taxSettings.taxName || "Tax"} collected
                    </span>
                    <span className="font-semibold text-[#F48E16] tabular-nums">
                      {fmt(q.tax)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between text-sm">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-foreground tabular-nums">{fmt(q.total)}</span>
                  </div>
                  {q.exTax > 0 && (
                    <div className="pt-1">
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F48E16] rounded-full"
                          style={{
                            width: `${Math.min(100, (q.tax / q.total) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {((q.tax / q.total) * 100).toFixed(1)}% tax of total
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Tax rate info */}
      <section>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Tax Configuration Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">Tax Name</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {taxSettings.taxName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">Tax Rate</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {taxRate > 0 ? `${taxRate}%` : "Not configured"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">Tax Number</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {taxSettings.taxNumber || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">Pricing</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {taxSettings.includeTaxInPrice ? "Tax-inclusive" : "Tax-exclusive"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">Applies To</dt>
                <dd className="mt-1 font-medium text-foreground capitalize">
                  {taxSettings.taxableItems.replace("_", " ")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      taxSettings.enabled
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {taxSettings.enabled ? "Enabled" : "Disabled"}
                  </span>
                </dd>
              </div>
            </dl>
            {taxSettings.additionalTaxes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Additional Taxes
                </p>
                <div className="flex flex-wrap gap-2">
                  {taxSettings.additionalTaxes.map((at) => (
                    <span
                      key={at.name}
                      className="text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground font-medium"
                    >
                      {at.name}: {at.rate}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
