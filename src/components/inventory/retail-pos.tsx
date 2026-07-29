"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Package,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import { createRetailSale } from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RetailItem {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  quantity: number;
  unit: string;
  salePrice: number | null;
  costPrice: number | null;
}

interface CartItem {
  item: RetailItem;
  qty: number;
}

// ── Payment methods ───────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "GIFT_CARD", label: "Gift Card" },
] as const;

// ── Product placeholder colors ────────────────────────────────────────────────

const CARD_COLORS = [
  "bg-violet-500/20",
  "bg-pink-500/20",
  "bg-blue-500/20",
  "bg-emerald-500/20",
  "bg-amber-500/20",
  "bg-rose-500/20",
  "bg-cyan-500/20",
  "bg-orange-500/20",
];

// ── Component ─────────────────────────────────────────────────────────────────

export function RetailPOS({
  items,
  taxRate,
}: {
  items: RetailItem[];
  taxRate: number;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState<string>("CASH");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successId, setSuccessId] = React.useState<string | null>(null);

  // Filter products
  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku && i.sku.toLowerCase().includes(q))
    );
  }, [items, search]);

  // Cart calculations
  const subtotal = cart.reduce(
    (sum, c) => sum + (c.item.salePrice ?? 0) * c.qty,
    0
  );
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  function addToCart(item: RetailItem) {
    if (item.quantity === 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        const cartQty = existing.qty;
        if (cartQty >= item.quantity) return prev; // cap at stock
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { item, qty: 1 }];
    });
    setError(null);
  }

  function changeQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id !== itemId) return c;
          const newQty = Math.max(0, Math.min(c.item.quantity, c.qty + delta));
          return { ...c, qty: newQty };
        })
        .filter((c) => c.qty > 0)
    );
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  }

  function clearCart() {
    setCart([]);
    setError(null);
    setSuccessId(null);
  }

  async function completeSale() {
    if (cart.length === 0) return;
    setLoading(true);
    setError(null);
    setSuccessId(null);

    const result = await createRetailSale(
      cart.map((c) => ({
        itemId: c.item.id,
        qty: c.qty,
        price: c.item.salePrice ?? 0,
      })),
      paymentMethod
    );

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to complete sale");
      return;
    }

    setSuccessId(result.invoiceId ?? "");
    setCart([]);
    router.refresh();
  }

  const fmt = (v: number) =>
    v.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
      {/* ── Product Grid ── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products or scan barcode…"
            className="pl-9"
          />
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">
              {search ? "No products match your search." : "No retail products found."}
            </p>
            {!search && (
              <p className="text-sm mt-1">
                Add products with category &ldquo;Retail&rdquo; from the inventory page.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pb-2">
            {filtered.map((item, idx) => {
              const isOut = item.quantity === 0;
              const isLow = !isOut && item.quantity <= 3;
              const inCart = cart.find((c) => c.item.id === item.id);
              const colorClass = CARD_COLORS[idx % CARD_COLORS.length];

              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={isOut}
                  className={`relative rounded-xl border text-left transition-all ${
                    isOut
                      ? "border-border opacity-50 cursor-not-allowed"
                      : inCart
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                  }`}
                >
                  {/* Placeholder image */}
                  <div className={`${colorClass} h-24 rounded-t-xl flex items-center justify-center relative`}>
                    <Package className="w-8 h-8 text-foreground/20" />
                    {isOut && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-t-xl bg-background/60">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Out of Stock</span>
                      </div>
                    )}
                    {inCart && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {inCart.qty}
                      </div>
                    )}
                    {isLow && !isOut && (
                      <div className="absolute bottom-1.5 right-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 space-y-1">
                    <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                      {item.name}
                    </p>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground font-mono truncate">{item.sku}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">
                        {item.salePrice != null ? fmt(item.salePrice) : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.quantity} left
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Cart Sidebar ── */}
      <div className="lg:w-80 xl:w-96 flex flex-col gap-4">
        <Card className="bg-card border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">Cart</span>
              {cart.length > 0 && (
                <span className="text-xs bg-primary/15 text-primary rounded-full px-1.5 py-0.5 font-semibold">
                  {cart.length}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          <CardContent className="p-0 flex flex-col flex-1">
            {/* Success state */}
            {successId !== null && (
              <div className="p-4 flex flex-col items-center justify-center gap-3 text-center py-8">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Sale Complete!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Invoice created successfully.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={clearCart} className="mt-1">
                  New Sale
                </Button>
              </div>
            )}

            {/* Empty cart */}
            {cart.length === 0 && successId === null && (
              <div className="p-6 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground flex-1">
                <ShoppingCart className="w-8 h-8 opacity-30" />
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs">Click a product to add it</p>
              </div>
            )}

            {/* Cart items */}
            {cart.length > 0 && successId === null && (
              <>
                <div className="flex flex-col divide-y divide-border max-h-64 overflow-y-auto">
                  {cart.map((c) => (
                    <div key={c.item.id} className="p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {c.item.name}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {fmt(c.item.salePrice ?? 0)} × {c.qty} ={" "}
                          <span className="font-semibold text-foreground">
                            {fmt((c.item.salePrice ?? 0) * c.qty)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => changeQty(c.item.id, -1)}
                          className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">
                          {c.qty}
                        </span>
                        <button
                          onClick={() => changeQty(c.item.id, 1)}
                          disabled={c.qty >= c.item.quantity}
                          className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(c.item.id)}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="p-4 border-t border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-foreground tabular-nums">{fmt(subtotal)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                      <span className="font-medium text-foreground tabular-nums">{fmt(tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground tabular-nums">{fmt(total)}</span>
                  </div>
                </div>

                {/* Payment method */}
                <div className="px-4 pb-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Payment Method</p>
                  <div className="flex gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setPaymentMethod(m.value)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          paymentMethod === m.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  </div>
                )}

                {/* Complete Sale */}
                <div className="px-4 pb-4">
                  <Button
                    className="w-full"
                    onClick={completeSale}
                    disabled={loading || cart.length === 0}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Complete Sale · {fmt(total)}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
