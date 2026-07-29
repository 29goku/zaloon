import { prisma } from "@/lib/prisma";
import {
  Package,
  AlertTriangle,
  ArrowUpCircle,
  TrendingDown,
  DollarSign,
  BarChart2,
  ShoppingBag,
  TrendingUp,
  ClipboardList,
  ShoppingCart,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InventoryItemForm } from "@/components/inventory/inventory-item-form";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { DeleteItemButton } from "@/components/inventory/delete-item-button";
import { QuickSellDialog } from "@/components/inventory/quick-sell-dialog";
import { BulkRestockDialog } from "@/components/inventory/bulk-restock-dialog";
import { StockHistory } from "@/components/inventory/stock-history";
import { RETAIL_CATEGORY, isRetailItem } from "@/lib/inventory-types";

export const dynamic = "force-dynamic";

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "ALL",
  "HAIR_PRODUCTS",
  "COLOR",
  "TOOLS",
  "RETAIL",
  "CONSUMABLES",
  "OTHER",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  HAIR_PRODUCTS: "Hair Products",
  COLOR: "Color",
  TOOLS: "Tools",
  RETAIL: "Retail",
  CONSUMABLES: "Consumables",
  OTHER: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  HAIR_PRODUCTS: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  COLOR: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  TOOLS: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  RETAIL: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  CONSUMABLES: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  OTHER: "bg-secondary text-muted-foreground",
};

// Placeholder colors for retail product cards (cycling by index)
const PRODUCT_CARD_COLORS = [
  "bg-violet-500/20",
  "bg-pink-500/20",
  "bg-blue-500/20",
  "bg-emerald-500/20",
  "bg-amber-500/20",
  "bg-rose-500/20",
  "bg-cyan-500/20",
  "bg-orange-500/20",
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  // Tab: "stock" (default) | "retail"
  const activeTab = sp.tab === "retail" ? "retail" : "stock";

  const categoryFilter =
    typeof sp.category === "string" &&
    CATEGORIES.includes(sp.category as (typeof CATEGORIES)[number])
      ? sp.category
      : "ALL";

  const search = typeof sp.search === "string" ? sp.search.trim() : "";
  const lowStockOnly = sp.lowStock === "1";

  const salon = await prisma.salon.findFirst();

  // All items for stats
  const allItems = await prisma.inventoryItem.findMany({
    where: { salonId: salon?.id ?? "" },
    select: {
      id: true,
      quantity: true,
      minQuantity: true,
      costPrice: true,
      salePrice: true,
      category: true,
    },
  });

  // Filtered items for stock tab
  const filteredWhere = {
    salonId: salon?.id ?? "",
    ...(categoryFilter !== "ALL" && { category: categoryFilter }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { sku: { contains: search } },
        { supplier: { contains: search } },
      ],
    }),
  };

  let items = await prisma.inventoryItem.findMany({
    where: filteredWhere,
    orderBy: { name: "asc" },
    include: { _count: { select: { InventoryTransaction: true } } },
  });

  if (lowStockOnly) {
    items = items.filter((item) => item.quantity <= item.minQuantity);
  }

  // Retail items for retail tab
  const retailItems = await prisma.inventoryItem.findMany({
    where: {
      salonId: salon?.id ?? "",
      category: RETAIL_CATEGORY,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
        ],
      }),
    },
    orderBy: { name: "asc" },
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalItems = allItems.length;
  const outOfStockCount = allItems.filter((i) => i.quantity === 0).length;
  const lowStockCount = allItems.filter(
    (i) => i.quantity > 0 && i.quantity <= i.minQuantity
  ).length;
  const costValue = allItems.reduce(
    (sum, i) => sum + i.quantity * (i.costPrice ?? 0),
    0
  );
  const retailValue = allItems.reduce(
    (sum, i) => sum + i.quantity * (i.salePrice ?? 0),
    0
  );
  const potentialMargin =
    retailValue > 0 ? ((retailValue - costValue) / retailValue) * 100 : 0;

  // Low stock banner items
  const lowStockItems = await prisma.inventoryItem.findMany({
    where: { salonId: salon?.id ?? "" },
    select: { id: true, name: true, quantity: true, minQuantity: true, unit: true },
    orderBy: { quantity: "asc" },
  });
  const alertItems = lowStockItems
    .filter((i) => i.quantity <= i.minQuantity)
    .slice(0, 3);
  const totalLowStockForBanner = lowStockItems.filter(
    (i) => i.quantity <= i.minQuantity
  ).length;

  // ── URL helpers ────────────────────────────────────────────────────────────

  function buildUrl(params: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (activeTab !== "stock") base.tab = activeTab;
    if (categoryFilter !== "ALL") base.category = categoryFilter;
    if (search) base.search = search;
    if (lowStockOnly) base.lowStock = "1";
    const merged = { ...base, ...params };
    Object.keys(merged).forEach((k) => { if (!merged[k]) delete merged[k]; });
    const p = new URLSearchParams(merged as Record<string, string>);
    const qs = p.toString();
    return qs ? `?${qs}` : "/dashboard/inventory";
  }

  function tabUrl(tab: string) {
    return tab === "stock" ? "/dashboard/inventory" : `/dashboard/inventory?tab=${tab}`;
  }

  const fmt = (v: number) =>
    v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="p-6 md:p-8">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1">Track supplies and retail products</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Link
            href="/dashboard/inventory/retail"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Retail POS
          </Link>
          <Link
            href="/dashboard/inventory/valuation"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <PieChart className="w-4 h-4" />
            Valuation
          </Link>
          <Link
            href="/dashboard/inventory/orders"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Orders
          </Link>
          <InventoryItemForm defaultIsRetail={activeTab === "retail"} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-secondary/60 rounded-xl p-1 w-fit mb-6">
        <Link
          href={tabUrl("stock")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "stock"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            Stock
          </span>
        </Link>
        <Link
          href={tabUrl("retail")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "retail"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4" />
            Retail
            {retailItems.length > 0 && (
              <span className="text-xs bg-primary/15 text-primary rounded-full px-1.5 py-0.5 font-semibold">
                {retailItems.length}
              </span>
            )}
          </span>
        </Link>
      </div>

      {/* ── Summary stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Items</p>
              <p className="text-2xl font-bold text-foreground">{totalItems}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Low Stock</p>
              <p className="text-2xl font-bold text-foreground">
                {lowStockCount}
                {lowStockCount > 0 && (
                  <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    Alert
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Cost Value</p>
              <p className="text-2xl font-bold text-foreground">{fmt(costValue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Out of Stock</p>
              <p className="text-2xl font-bold text-foreground">{outOfStockCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Inventory value cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Retail Value</p>
              <p className="text-2xl font-bold text-foreground">{fmt(retailValue)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">At retail prices</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Potential Margin</p>
              <p className="text-2xl font-bold text-foreground">
                {potentialMargin > 0 ? `${potentialMargin.toFixed(1)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fmt(retailValue - costValue)} gross profit
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Low stock alert banner ── */}
      {totalLowStockForBanner > 0 && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-4 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                {totalLowStockForBanner} item
                {totalLowStockForBanner !== 1 ? "s need" : " needs"} reordering
              </p>
              <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5 mb-3">
                Review and restock to keep your salon running smoothly.
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                {alertItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className="font-semibold text-amber-900 dark:text-amber-200">
                      {item.name}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400">
                      {item.quantity}/{item.minQuantity} {item.unit}
                    </span>
                    <AdjustStockDialog
                      itemId={item.id}
                      itemName={item.name}
                      currentQuantity={item.quantity}
                      unit={item.unit}
                      trigger={
                        <button className="inline-flex items-center gap-1 ml-1 text-amber-700 dark:text-amber-300 font-semibold hover:underline">
                          <ArrowUpCircle className="w-3 h-3" />
                          Reorder
                        </button>
                      }
                    />
                  </div>
                ))}
                {totalLowStockForBanner > 3 && (
                  <Link
                    href={buildUrl({ lowStock: "1" })}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline px-3 py-1.5"
                  >
                    +{totalLowStockForBanner - 3} more
                  </Link>
                )}
                <BulkRestockDialog lowStockItems={lowStockItems.filter((i) => i.quantity <= i.minQuantity)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ RETAIL TAB ══════════════ */}
      {activeTab === "retail" && (
        <div>
          <div className="mb-5">
            <form method="GET">
              <input type="hidden" name="tab" value="retail" />
              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Search retail products…"
                className="w-full max-w-sm h-9 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </form>
          </div>

          {retailItems.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="w-8 h-8" />}
              title="No retail products"
              description={
                search
                  ? "Try adjusting your search."
                  : "Add products and mark them as Retail to see them here."
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {retailItems.map((item, idx) => {
                const isOutOfStock = item.quantity === 0;
                const isLowStock = !isOutOfStock && item.quantity <= item.minQuantity;
                const colorClass = PRODUCT_CARD_COLORS[idx % PRODUCT_CARD_COLORS.length];
                const margin =
                  item.costPrice && item.salePrice && item.salePrice > 0
                    ? ((item.salePrice - item.costPrice) / item.salePrice) * 100
                    : null;

                return (
                  <Card
                    key={item.id}
                    className={`bg-card border-border overflow-hidden transition-shadow hover:shadow-md ${
                      isOutOfStock ? "opacity-60" : ""
                    }`}
                  >
                    {/* Product photo placeholder */}
                    <div className={`${colorClass} h-32 flex items-center justify-center relative`}>
                      <Package className="w-10 h-10 text-foreground/30" />
                      {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-t-lg">
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/15 px-2 py-1 rounded-full">
                            Out of Stock
                          </span>
                        </div>
                      )}
                      {isLowStock && !isOutOfStock && (
                        <div className="absolute top-2 right-2">
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Low
                          </span>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="font-semibold text-foreground line-clamp-1">{item.name}</p>
                        {item.sku && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.sku}</p>
                        )}
                      </div>

                      {/* Stock */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Stock</span>
                        <span
                          className={`font-semibold tabular-nums ${
                            isOutOfStock
                              ? "text-rose-600 dark:text-rose-400"
                              : isLowStock
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-foreground"
                          }`}
                        >
                          {item.quantity} {item.unit}
                        </span>
                      </div>

                      {/* Cost vs Retail price */}
                      <div className="rounded-lg bg-secondary/60 px-3 py-2 space-y-1 text-xs">
                        {item.costPrice != null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cost</span>
                            <span className="font-medium text-foreground tabular-nums">
                              ${item.costPrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {item.salePrice != null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Retail</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              ${item.salePrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {margin != null && (
                          <div className="flex justify-between border-t border-border pt-1 mt-1">
                            <span className="text-muted-foreground">Margin</span>
                            <span className="font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                              {margin.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <QuickSellDialog
                          itemId={item.id}
                          itemName={item.name}
                          currentStock={item.quantity}
                          unit={item.unit}
                          retailPrice={item.salePrice}
                          trigger={
                            <button
                              disabled={isOutOfStock}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Sell
                            </button>
                          }
                        />
                        <AdjustStockDialog
                          itemId={item.id}
                          itemName={item.name}
                          currentQuantity={item.quantity}
                          unit={item.unit}
                          trigger={
                            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-secondary transition-colors">
                              Stock
                            </button>
                          }
                        />
                        <InventoryItemForm item={item} />
                        <DeleteItemButton itemId={item.id} itemName={item.name} />
                      </div>
                      <StockHistory itemId={item.id} itemName={item.name} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ STOCK TAB ══════════════ */}
      {activeTab === "stock" && (
        <>
          {/* ── Filter bar ── */}
          <div className="mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <form method="GET" className="flex-1 max-w-sm">
              {categoryFilter !== "ALL" && (
                <input type="hidden" name="category" value={categoryFilter} />
              )}
              {lowStockOnly && <input type="hidden" name="lowStock" value="1" />}
              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Search by name, SKU, or supplier…"
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </form>

            <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-1 flex-wrap">
              {CATEGORIES.map((cat) => {
                const isActive = categoryFilter === cat;
                return (
                  <Link
                    key={cat}
                    href={buildUrl({ category: cat !== "ALL" ? cat : undefined })}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat === "ALL" ? "All" : CATEGORY_LABELS[cat]}
                  </Link>
                );
              })}
            </div>

            <Link
              href={buildUrl({ lowStock: lowStockOnly ? undefined : "1" })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                lowStockOnly
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                  : "text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low stock only
            </Link>
          </div>

          {/* ── Inventory table ── */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                {items.length} Item{items.length !== 1 ? "s" : ""}
                {categoryFilter !== "ALL" && (
                  <span className="text-muted-foreground font-normal">
                    · {CATEGORY_LABELS[categoryFilter]}
                  </span>
                )}
                {search && (
                  <span className="text-muted-foreground font-normal">
                    · &ldquo;{search}&rdquo;
                  </span>
                )}
                {lowStockOnly && (
                  <span className="text-amber-600 dark:text-amber-400 font-normal">
                    · Low stock only
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <EmptyState
                  icon={<Package className="w-8 h-8" />}
                  title="No items found"
                  description={
                    search || categoryFilter !== "ALL" || lowStockOnly
                      ? "Try adjusting your search or filter."
                      : "Add your first inventory item to get started."
                  }
                />
              ) : (
                <div className="overflow-x-auto -mx-6 md:-mx-0">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 pr-4 pl-6 md:pl-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Item
                        </th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Category
                        </th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          SKU / Barcode
                        </th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-36">
                          Stock
                        </th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                          Cost
                        </th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                          Retail Price
                        </th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Supplier
                        </th>
                        <th className="pb-3 pr-6 md:pr-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const isOutOfStock = item.quantity === 0;
                        const isLowStock =
                          !isOutOfStock && item.quantity <= item.minQuantity;
                        const isRetail = isRetailItem(item.category);
                        const badgeClass =
                          CATEGORY_COLORS[item.category] ??
                          "bg-secondary text-muted-foreground";

                        const stockPct =
                          item.minQuantity > 0
                            ? Math.min(100, (item.quantity / (item.minQuantity * 2)) * 100)
                            : item.quantity > 0
                            ? 100
                            : 0;

                        const rowBg = isOutOfStock
                          ? "bg-rose-500/5 hover:bg-rose-500/10"
                          : isLowStock
                          ? "bg-amber-500/5 hover:bg-amber-500/10"
                          : "hover:bg-secondary/40";

                        return (
                          <tr
                            key={item.id}
                            className={`border-b border-border/50 transition-colors ${rowBg}`}
                          >
                            <td className="py-3 pr-4 pl-6 md:pl-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{item.name}</p>
                                {isRetail && (
                                  <span className="text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                                    Retail
                                  </span>
                                )}
                              </div>
                              {item._count.InventoryTransaction > 0 && (
                                <StockHistory itemId={item.id} itemName={item.name} />
                              )}
                            </td>

                            <td className="py-3 pr-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}
                              >
                                {CATEGORY_LABELS[item.category] ?? item.category}
                              </span>
                            </td>

                            <td className="py-3 pr-4 text-muted-foreground text-xs font-mono">
                              {item.sku ?? <span className="text-border">—</span>}
                            </td>

                            <td className="py-3 pr-4 w-36">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span
                                  className={`font-semibold tabular-nums ${
                                    isOutOfStock
                                      ? "text-rose-600 dark:text-rose-400"
                                      : isLowStock
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-foreground"
                                  }`}
                                >
                                  {item.quantity}
                                </span>
                                <span className="text-xs text-muted-foreground">{item.unit}</span>
                                {isOutOfStock && (
                                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Out</span>
                                )}
                                {isLowStock && (
                                  <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                )}
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isOutOfStock ? "bg-rose-500" : isLowStock ? "bg-amber-500" : "bg-primary"
                                  }`}
                                  style={{ width: `${stockPct}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">min {item.minQuantity}</p>
                            </td>

                            <td className="py-3 pr-4 text-right">
                              {item.costPrice != null ? (
                                <span className="font-medium text-foreground tabular-nums">
                                  ${item.costPrice.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>

                            <td className="py-3 pr-4 text-right">
                              {item.salePrice != null ? (
                                <span className="font-medium text-foreground tabular-nums">
                                  ${item.salePrice.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>

                            <td className="py-3 pr-4 text-muted-foreground max-w-[120px] truncate text-sm">
                              {item.supplier ?? <span className="text-muted-foreground/40">—</span>}
                            </td>

                            <td className="py-3 pr-6 md:pr-0">
                              <div className="flex items-center justify-end gap-1">
                                {isRetail && (
                                  <QuickSellDialog
                                    itemId={item.id}
                                    itemName={item.name}
                                    currentStock={item.quantity}
                                    unit={item.unit}
                                    retailPrice={item.salePrice}
                                    trigger={
                                      <button
                                        disabled={isOutOfStock}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                                      >
                                        Sell
                                      </button>
                                    }
                                  />
                                )}
                                <AdjustStockDialog
                                  itemId={item.id}
                                  itemName={item.name}
                                  currentQuantity={item.quantity}
                                  unit={item.unit}
                                  trigger={
                                    <button
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                      title="Add stock"
                                    >
                                      <ArrowUpCircle className="w-3.5 h-3.5" />
                                      Add
                                    </button>
                                  }
                                />
                                <AdjustStockDialog
                                  itemId={item.id}
                                  itemName={item.name}
                                  currentQuantity={item.quantity}
                                  unit={item.unit}
                                />
                                <InventoryItemForm item={item} />
                                <DeleteItemButton itemId={item.id} itemName={item.name} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
