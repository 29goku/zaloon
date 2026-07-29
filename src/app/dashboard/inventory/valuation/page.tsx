import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, BarChart2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ValuationExport } from "@/components/inventory/valuation-export";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  HAIR_PRODUCTS: "Hair Products",
  COLOR: "Color",
  TOOLS: "Tools",
  RETAIL: "Retail",
  CONSUMABLES: "Consumables",
  OTHER: "Other",
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

export default async function ValuationPage() {
  const salon = await prisma.salon.findFirst();
  const items = await prisma.inventoryItem.findMany({
    where: { salonId: salon?.id ?? "" },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Build per-item rows
  type ValuationRow = {
    id: string;
    name: string;
    category: string;
    qty: number;
    costPrice: number;
    salePrice: number;
    costValue: number;
    retailValue: number;
    margin: number | null;
  };

  const rows: ValuationRow[] = items.map((item) => {
    const cost = item.costPrice ?? 0;
    const sale = item.salePrice ?? 0;
    const costValue = item.quantity * cost;
    const retailValue = item.quantity * sale;
    const margin =
      sale > 0 && cost > 0 ? ((sale - cost) / sale) * 100 : null;
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      qty: item.quantity,
      costPrice: cost,
      salePrice: sale,
      costValue,
      retailValue,
      margin,
    };
  });

  // Group by category
  const grouped = new Map<string, ValuationRow[]>();
  for (const row of rows) {
    if (!grouped.has(row.category)) grouped.set(row.category, []);
    grouped.get(row.category)!.push(row);
  }

  // Totals
  const grandCostValue = rows.reduce((s, r) => s + r.costValue, 0);
  const grandRetailValue = rows.reduce((s, r) => s + r.retailValue, 0);
  const grandQty = rows.reduce((s, r) => s + r.qty, 0);
  const grandMargin =
    grandRetailValue > 0
      ? ((grandRetailValue - grandCostValue) / grandRetailValue) * 100
      : null;

  const fmt = (v: number) =>
    v.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const fmtPct = (v: number | null) =>
    v != null ? `${v.toFixed(1)}%` : "—";

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </Link>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Inventory Valuation</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Cost vs. retail value by category with profit margins
          </p>
        </div>
        <ValuationExport rows={rows} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total Items</p>
            <p className="text-2xl font-bold text-foreground">{rows.length}</p>
            <p className="text-xs text-muted-foreground">{grandQty} units</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total Cost Value</p>
            <p className="text-2xl font-bold text-foreground">{fmt(grandCostValue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total Retail Value</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(grandRetailValue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Gross Profit Margin</p>
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{fmtPct(grandMargin)}</p>
            <p className="text-xs text-muted-foreground">{fmt(grandRetailValue - grandCostValue)} profit</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-category tables */}
      <div className="flex flex-col gap-6">
        {[...grouped.entries()].map(([cat, catRows]) => {
          const catCost = catRows.reduce((s, r) => s + r.costValue, 0);
          const catRetail = catRows.reduce((s, r) => s + r.retailValue, 0);
          const catMargin =
            catRetail > 0 ? ((catRetail - catCost) / catRetail) * 100 : null;

          return (
            <Card key={cat} className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    {categoryLabel(cat)}
                    <span className="text-muted-foreground font-normal">
                      ({catRows.length} item{catRows.length !== 1 ? "s" : ""})
                    </span>
                  </span>
                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-3">
                    <span>Cost: <strong className="text-foreground">{fmt(catCost)}</strong></span>
                    <span>Retail: <strong className="text-emerald-600 dark:text-emerald-400">{fmt(catRetail)}</strong></span>
                    <span>Margin: <strong className="text-violet-600 dark:text-violet-400">{fmtPct(catMargin)}</strong></span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item</th>
                        <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Qty</th>
                        <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Cost Price</th>
                        <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Retail Price</th>
                        <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Cost Value</th>
                        <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Retail Value</th>
                        <th className="pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catRows.map((row) => (
                        <tr key={row.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                          <td className="py-2.5 pr-4 font-medium text-foreground">{row.name}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">{row.qty}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                            {row.costPrice > 0 ? fmt(row.costPrice) : <span className="text-border">—</span>}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                            {row.salePrice > 0 ? fmt(row.salePrice) : <span className="text-border">—</span>}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-foreground font-medium">
                            {row.costValue > 0 ? fmt(row.costValue) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-foreground font-medium">
                            {row.retailValue > 0 ? fmt(row.retailValue) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {row.margin != null ? (
                              <span className={`font-semibold ${row.margin >= 40 ? "text-emerald-600 dark:text-emerald-400" : row.margin >= 20 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {row.margin.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* Category subtotal */}
                      <tr className="bg-secondary/30 font-semibold">
                        <td className="py-2 pr-4 text-sm text-foreground" colSpan={4}>
                          {categoryLabel(cat)} subtotal
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-foreground">{fmt(catCost)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(catRetail)}</td>
                        <td className="py-2 text-right tabular-nums text-violet-600 dark:text-violet-400">{fmtPct(catMargin)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Grand total row */}
        {rows.length > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <span className="font-bold text-foreground text-sm">Grand Total ({rows.length} items, {grandQty} units)</span>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground mr-1.5">Cost Value:</span>
                    <span className="font-bold text-foreground">{fmt(grandCostValue)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-1.5">Retail Value:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(grandRetailValue)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-1.5">Margin:</span>
                    <span className="font-bold text-violet-600 dark:text-violet-400">{fmtPct(grandMargin)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-1.5">Profit:</span>
                    <span className="font-bold text-foreground">{fmt(grandRetailValue - grandCostValue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
