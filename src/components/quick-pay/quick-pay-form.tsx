"use client";

import { useState, useRef, useTransition } from "react";
import {
  Search, X, Plus, Minus, CheckCircle, Printer, RotateCcw,
  Tag, CreditCard, Smartphone, Banknote, Wallet, ChevronDown, ChevronUp, DollarSign,
  ShoppingBag, Scissors,
} from "lucide-react";
import { checkoutQuickPay } from "@/app/actions/payments";
import { validateCoupon } from "@/app/actions/coupons";
import { validateGiftCard } from "@/app/actions/gift-cards";
import { searchClients } from "@/app/actions/search";
import type { ServiceOption, RetailProductOption } from "@/app/dashboard/quick-pay/page";
import type { CartItem, CreatedInvoice } from "@/app/actions/payments";
import { StripePaymentForm } from "@/app/dashboard/quick-pay/stripe-payment-form";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "CARD", label: "Card", icon: CreditCard },
  { id: "UPI", label: "UPI", icon: Smartphone },
  { id: "WALLET", label: "Wallet", icon: Wallet },
] as const;

type MethodId = (typeof PAYMENT_METHODS)[number]["id"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectedClient {
  id: string;
  name: string;
  phone: string | null;
}

interface AppliedCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  discount: number;
}

interface AppliedGiftCard {
  code: string;
  balance: number;
  applyAmount: number;
}

interface Props {
  services: ServiceOption[];
  retailProducts?: RetailProductOption[];
  onPaymentCreated: (invoice: CreatedInvoice) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickPayForm({ services, retailProducts = [], onPaymentCreated }: Props) {
  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  // "services" | "products"
  const [leftTab, setLeftTab] = useState<"services" | "products">("services");

  // Client
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<SelectedClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Discounts
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponPending, setCouponPending] = useState(false);
  const [manualDiscount, setManualDiscount] = useState("");
  const [manualDiscountPct, setManualDiscountPct] = useState(false);

  // Gift card
  const [gcInput, setGcInput] = useState("");
  const [appliedGc, setAppliedGc] = useState<AppliedGiftCard | null>(null);
  const [gcError, setGcError] = useState<string | null>(null);
  const [gcPending, setGcPending] = useState(false);

  // Payment
  const [method, setMethod] = useState<MethodId>("CASH");
  const [cashTendered, setCashTendered] = useState("");
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitMethod, setSplitMethod] = useState<MethodId>("CARD");
  const [splitAmount, setSplitAmount] = useState("");

  // Receipt
  const [receiptSms, setReceiptSms] = useState(false);
  const [receiptEmail, setReceiptEmail] = useState(false);
  const [receiptWhatsapp, setReceiptWhatsapp] = useState(false);

  // Tip
  const [tipEnabled, setTipEnabled] = useState(false);
  const [tipPreset, setTipPreset] = useState<number | "custom" | null>(null);
  const [customTip, setCustomTip] = useState("");

  // Note
  const [note, setNote] = useState("");

  // UI
  const [showDiscountSection, setShowDiscountSection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<CreatedInvoice | null>(null);
  const [isPending, startTransition] = useTransition();

  // Stripe card flow
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  // Stash the checkout payload to reuse after Stripe payment succeeds
  const pendingPayloadRef = useRef<Parameters<typeof checkoutQuickPay>[0] | null>(null);

  // ── Derived totals ───────────────────────────────────────────────────────────

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const couponDiscount = appliedCoupon?.discount ?? 0;
  const manualDiscountNum = parseFloat(manualDiscount) || 0;
  const manualDiscountAmt = manualDiscountNum > 0
    ? manualDiscountPct
      ? (subtotal * manualDiscountNum) / 100
      : manualDiscountNum
    : 0;
  const totalDiscount = couponDiscount + manualDiscountAmt;
  const afterDiscount = Math.max(0, subtotal - totalDiscount);
  const gcApply = appliedGc ? Math.min(appliedGc.applyAmount, afterDiscount) : 0;

  // Tip amount
  const tipAmountNum = (() => {
    if (!tipEnabled) return 0;
    if (tipPreset === "custom") return parseFloat(customTip) || 0;
    if (typeof tipPreset === "number") return (afterDiscount - gcApply) * (tipPreset / 100);
    return 0;
  })();

  const total = Math.max(0, afterDiscount - gcApply + tipAmountNum);

  const changeDue = method === "CASH" && !splitEnabled
    ? Math.max(0, parseFloat(cashTendered || "0") - total)
    : 0;

  // ── Cart helpers ─────────────────────────────────────────────────────────────

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.categoryName.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const filteredProducts = retailProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const addService = (svc: ServiceOption) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.name === svc.name && i.price === svc.price);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { serviceId: svc.id, name: svc.name, price: svc.price, qty: 1 }];
    });
  };

  const addProduct = (product: RetailProductOption) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.findIndex((i) => i.serviceId === product.id);
      if (existing !== -1) {
        const next = [...prev];
        const newQty = next[existing].qty + 1;
        if (newQty > product.stock) return prev; // cap at available stock
        next[existing] = { ...next[existing], qty: newQty };
        return next;
      }
      return [...prev, { serviceId: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const changeQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const newQty = next[idx].qty + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== idx);
      next[idx] = { ...next[idx], qty: newQty };
      return next;
    });
  };

  const removeItem = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Client search ────────────────────────────────────────────────────────────

  const handleClientSearch = (q: string) => {
    setClientQuery(q);
    if (clientSearchRef.current) clearTimeout(clientSearchRef.current);
    if (!q.trim()) { setClientResults([]); setShowClientDropdown(false); return; }
    clientSearchRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchClients(q);
        setClientResults(results);
        setShowClientDropdown(true);
      });
    }, 250);
  };

  // ── Coupon ───────────────────────────────────────────────────────────────────

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponPending(true);
    setCouponError(null);
    const result = await validateCoupon(couponInput.trim(), subtotal);
    setCouponPending(false);
    if (!result.valid || !result.coupon) {
      setCouponError(result.error ?? "Invalid coupon");
      return;
    }
    setAppliedCoupon({
      ...result.coupon,
      discount: result.discount,
    });
    setCouponInput("");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // ── Gift card ────────────────────────────────────────────────────────────────

  const handleApplyGiftCard = async () => {
    if (!gcInput.trim()) return;
    setGcPending(true);
    setGcError(null);
    const result = await validateGiftCard(gcInput.trim());
    setGcPending(false);
    if (!result.success) {
      setGcError(result.error);
      return;
    }
    setAppliedGc({
      code: result.card.code,
      balance: result.card.balance,
      applyAmount: Math.min(result.card.balance, afterDiscount),
    });
    setGcInput("");
  };

  const removeGc = () => {
    setAppliedGc(null);
    setGcError(null);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const buildPayload = (): Parameters<typeof checkoutQuickPay>[0] => {
    const splitAmtNum = parseFloat(splitAmount) || 0;
    return {
      items: cart,
      method,
      split: splitEnabled && splitAmtNum > 0
        ? { method: splitMethod, amount: splitAmtNum }
        : undefined,
      manualDiscount: manualDiscountNum > 0 ? manualDiscountNum : undefined,
      manualDiscountPct,
      couponCode: appliedCoupon?.code,
      giftCardCode: appliedGc?.code,
      giftCardAmount: appliedGc ? gcApply : undefined,
      clientId: selectedClient?.id,
      note: note.trim() || undefined,
      receiptPrefs: { sms: receiptSms, email: receiptEmail, whatsapp: receiptWhatsapp },
      tipAmount: tipAmountNum > 0 ? tipAmountNum : undefined,
    };
  };

  const runCheckout = (payload: Parameters<typeof checkoutQuickPay>[0]) => {
    startTransition(async () => {
      const result = await checkoutQuickPay(payload);
      if (result.success) {
        setCompletedInvoice(result.invoice);
        onPaymentCreated(result.invoice);
      } else {
        setError(result.error);
      }
    });
  };

  const handleSubmit = () => {
    if (cart.length === 0) { setError("Add at least one service or product to the cart"); return; }
    setError(null);

    const payload = buildPayload();

    // For CARD payments, use Stripe if it is configured
    // (and only when the primary method is CARD — split flows stay as-is)
    const useStripe = method === "CARD" && !splitEnabled && !!STRIPE_PUBLISHABLE_KEY && total > 0;

    if (useStripe) {
      startTransition(async () => {
        try {
          const res = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: total,
              currency: "usd",
              description: `Quick Pay – ${cart.map((i) => i.name).join(", ")}`,
            }),
          });
          const data = await res.json() as { clientSecret?: string; error?: string };
          if (!res.ok || !data.clientSecret) {
            setError(data.error ?? "Failed to initialise card payment");
            return;
          }
          pendingPayloadRef.current = payload;
          setStripeClientSecret(data.clientSecret);
        } catch (err) {
          console.error("[QuickPayForm] Stripe init error:", err);
          setError("Failed to connect to payment service");
        }
      });
      return;
    }

    runCheckout(payload);
  };

  // Called when the Stripe card payment succeeds — finish creating the invoice
  const handleStripeSuccess = () => {
    const payload = pendingPayloadRef.current;
    setStripeClientSecret(null);
    pendingPayloadRef.current = null;
    if (payload) {
      runCheckout(payload);
    }
  };

  const handleStripeCancel = () => {
    setStripeClientSecret(null);
    pendingPayloadRef.current = null;
  };

  // ── Reset ────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setCart([]);
    setServiceSearch("");
    setProductSearch("");
    setLeftTab("services");
    setSelectedClient(null);
    setClientQuery("");
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput("");
    setManualDiscount("");
    setManualDiscountPct(false);
    setAppliedGc(null);
    setGcError(null);
    setGcInput("");
    setMethod("CASH");
    setCashTendered("");
    setSplitEnabled(false);
    setSplitAmount("");
    setTipEnabled(false);
    setTipPreset(null);
    setCustomTip("");
    setNote("");
    setReceiptSms(false);
    setReceiptEmail(false);
    setReceiptWhatsapp(false);
    setError(null);
    setCompletedInvoice(null);
    setShowDiscountSection(false);
  };

  // ── Success screen ───────────────────────────────────────────────────────────

  if (completedInvoice) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">Payment Complete</p>
            <p className="text-muted-foreground text-sm mt-1">
              {completedInvoice.clientName ?? "Walk-in"} &middot; {completedInvoice.invoiceNumber}
            </p>
          </div>

          {/* Totals */}
          <div className="bg-secondary rounded-xl p-4 text-sm text-left space-y-1">
            {completedInvoice.items.map((item, i) => (
              <div key={i} className="flex justify-between text-muted-foreground">
                <span>{item.qty > 1 ? `${item.qty}× ` : ""}{item.name}</span>
                <span>${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            {completedInvoice.discount > 0 && (
              <div className="flex justify-between text-primary pt-1">
                <span>Discount</span>
                <span>-${completedInvoice.discount.toFixed(2)}</span>
              </div>
            )}
            {completedInvoice.giftCardAmount > 0 && (
              <div className="flex justify-between text-primary">
                <span>Gift Card</span>
                <span>-${completedInvoice.giftCardAmount.toFixed(2)}</span>
              </div>
            )}
            {completedInvoice.tip > 0 && (
              <div className="flex justify-between text-emerald-500">
                <span>Tip</span>
                <span>+${completedInvoice.tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border mt-1">
              <span>Total</span>
              <span>${completedInvoice.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Via</span>
              <span>
                {completedInvoice.paymentMethod}
                {completedInvoice.paymentMethod2 ? ` + ${completedInvoice.paymentMethod2}` : ""}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <a
              href={`/dashboard/invoices/${completedInvoice.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </a>
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Sale
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Stripe card payment overlay ──────────────────────────────────────────────

  if (stripeClientSecret) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-lg font-bold text-foreground">Card Payment</p>
            <p className="text-sm text-muted-foreground mt-0.5">Enter your card details to complete the payment</p>
          </div>
          <StripePaymentForm
            clientSecret={stripeClientSecret}
            total={total}
            onSuccess={handleStripeSuccess}
            onCancel={handleStripeCancel}
          />
        </div>
      </div>
    );
  }

  // ── Main POS layout ──────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ── LEFT: Service/Product search + Cart ──────────────────────────────── */}
      <div className="space-y-4">
        {/* Tab toggle: Services | Products */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-1 bg-secondary/60 rounded-xl p-1 w-fit">
            <button
              onClick={() => setLeftTab("services")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                leftTab === "services"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Services
            </button>
            <button
              onClick={() => setLeftTab("products")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                leftTab === "products"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Products
              {retailProducts.length > 0 && (
                <span className="text-xs bg-primary/15 text-primary rounded-full px-1.5 py-0.5 font-semibold leading-none">
                  {retailProducts.length}
                </span>
              )}
            </button>
          </div>

          {/* Services panel */}
          {leftTab === "services" && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Search services..."
                  className="w-full bg-secondary text-foreground rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">No services found</p>
                ) : (
                  filteredServices.map((svc) => (
                    <button
                      key={svc.id}
                      onClick={() => addService(svc)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary text-sm transition-colors group"
                    >
                      <div className="text-left">
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">{svc.categoryName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">${svc.price.toFixed(2)}</span>
                        <Plus className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* Products panel */}
          {leftTab === "products" && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-secondary text-foreground rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    {retailProducts.length === 0
                      ? "No retail products yet. Add products in Inventory."
                      : "No products match your search."}
                  </p>
                ) : (
                  filteredProducts.map((product) => {
                    const outOfStock = product.stock <= 0;
                    const inCart = cart.find((i) => i.serviceId === product.id);
                    const cartQty = inCart?.qty ?? 0;
                    const stockLeft = product.stock - cartQty;

                    return (
                      <button
                        key={product.id}
                        onClick={() => addProduct(product)}
                        disabled={outOfStock || stockLeft <= 0}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary text-sm transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="text-left">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.sku && <span className="font-mono mr-1">{product.sku}</span>}
                            {outOfStock ? (
                              <span className="text-rose-500">Out of stock</span>
                            ) : (
                              <span>{stockLeft} {product.unit} left</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {product.price > 0 ? (
                            <span className="text-sm font-semibold text-foreground">${product.price.toFixed(2)}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">no price</span>
                          )}
                          {cartQty > 0 && (
                            <span className="text-xs bg-primary/15 text-primary rounded-full px-1.5 py-0.5 font-bold leading-none">
                              {cartQty}
                            </span>
                          )}
                          <Plus className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Cart */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Cart</p>
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Click a service to add it</p>
          ) : (
            <ul className="space-y-2">
              {cart.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => changeQty(idx, -1)}
                      className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold text-foreground w-5 text-center">{item.qty}</span>
                    <button
                      onClick={() => changeQty(idx, 1)}
                      className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <p className="text-sm font-bold text-foreground">${(item.price * item.qty).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Running subtotal */}
          {cart.length > 0 && (
            <div className="pt-2 border-t border-border flex justify-between text-sm font-semibold text-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Client selection */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Client <span className="text-muted-foreground font-normal">(optional)</span></p>
          {selectedClient ? (
            <div className="flex items-center bg-secondary rounded-xl px-4 py-2.5 text-sm gap-2">
              <span className="font-medium text-foreground flex-1">{selectedClient.name}</span>
              {selectedClient.phone && (
                <span className="text-muted-foreground text-xs">{selectedClient.phone}</span>
              )}
              <button onClick={() => { setSelectedClient(null); setClientQuery(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={clientQuery}
                onChange={(e) => handleClientSearch(e.target.value)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                onFocus={() => clientResults.length > 0 && setShowClientDropdown(true)}
                placeholder="Search by name or phone..."
                className="w-full bg-secondary text-foreground rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
              />
              {showClientDropdown && clientResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                  {clientResults.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={() => { setSelectedClient(c); setClientQuery(""); setClientResults([]); setShowClientDropdown(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-secondary text-left transition-colors"
                    >
                      <span className="font-medium text-foreground">{c.name}</span>
                      {c.phone && <span className="text-muted-foreground text-xs">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Discounts + Payment + Checkout ────────────────────────────── */}
      <div className="space-y-4">
        {/* Discounts */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowDiscountSection((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Discounts &amp; Coupons
              {(appliedCoupon || manualDiscountAmt > 0 || gcApply > 0) && (
                <span className="ml-1 text-xs text-primary font-medium">
                  (-${(totalDiscount + gcApply).toFixed(2)})
                </span>
              )}
            </span>
            {showDiscountSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDiscountSection && (
            <div className="px-4 pb-4 space-y-4 border-t border-border">
              {/* Coupon */}
              <div className="pt-3 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Coupon Code</p>
                {appliedCoupon ? (
                  <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2 text-sm">
                    <Tag className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-foreground">{appliedCoupon.code}</span>
                      <span className="text-muted-foreground ml-2">-${appliedCoupon.discount.toFixed(2)}</span>
                    </div>
                    <button onClick={removeCoupon} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      placeholder="SUMMER20"
                      className="flex-1 bg-secondary text-foreground rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponPending || !couponInput.trim()}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                      {couponPending ? "..." : "Apply"}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-xs text-destructive">{couponError}</p>}
              </div>

              {/* Manual discount */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Manual Discount</p>
                <div className="flex gap-2">
                  <div className="flex rounded-xl border border-border overflow-hidden shrink-0">
                    <button
                      onClick={() => setManualDiscountPct(false)}
                      className={`px-3 py-2 text-xs font-medium transition-colors ${!manualDiscountPct ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                      $
                    </button>
                    <button
                      onClick={() => setManualDiscountPct(true)}
                      className={`px-3 py-2 text-xs font-medium border-l border-border transition-colors ${manualDiscountPct ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={manualDiscount}
                    onChange={(e) => setManualDiscount(e.target.value)}
                    placeholder={manualDiscountPct ? "0–100" : "0.00"}
                    className="flex-1 bg-secondary text-foreground rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                  />
                </div>
                {manualDiscountAmt > 0 && (
                  <p className="text-xs text-primary">-${manualDiscountAmt.toFixed(2)} applied</p>
                )}
              </div>

              {/* Gift card */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Gift Card</p>
                {appliedGc ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2 text-sm">
                      <Wallet className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium text-foreground">{appliedGc.code}</span>
                        <span className="text-muted-foreground ml-2">Balance: ${appliedGc.balance.toFixed(2)}</span>
                      </div>
                      <button onClick={removeGc} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground shrink-0">Apply amount:</label>
                      <input
                        type="number"
                        min="0"
                        max={Math.min(appliedGc.balance, afterDiscount)}
                        step="0.01"
                        value={appliedGc.applyAmount}
                        onChange={(e) =>
                          setAppliedGc((prev) =>
                            prev ? { ...prev, applyAmount: Math.min(parseFloat(e.target.value) || 0, prev.balance, afterDiscount) } : prev
                          )
                        }
                        className="flex-1 bg-secondary text-foreground rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    {gcApply > 0 && <p className="text-xs text-primary">-${gcApply.toFixed(2)} from gift card</p>}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gcInput}
                      onChange={(e) => { setGcInput(e.target.value.toUpperCase()); setGcError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyGiftCard()}
                      placeholder="GC-ABC123"
                      className="flex-1 bg-secondary text-foreground rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={handleApplyGiftCard}
                      disabled={gcPending || !gcInput.trim()}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                      {gcPending ? "..." : "Apply"}
                    </button>
                  </div>
                )}
                {gcError && <p className="text-xs text-destructive">{gcError}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Tip section */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => { setTipEnabled((v) => !v); setTipPreset(null); setCustomTip(""); }}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Add Tip?
              {tipAmountNum > 0 && (
                <span className="text-xs text-emerald-500 font-medium">
                  (+${tipAmountNum.toFixed(2)})
                </span>
              )}
            </span>
            <span className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${tipEnabled ? "bg-emerald-500" : "bg-secondary"}`}>
              <span className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${tipEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </span>
          </button>

          {tipEnabled && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Select tip amount</p>
              <div className="flex flex-wrap gap-2">
                {([10, 15, 18, 20] as const).map((pct) => (
                  <button
                    key={pct}
                    onClick={() => { setTipPreset(pct); setCustomTip(""); }}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                      tipPreset === pct
                        ? "bg-emerald-500 text-white"
                        : "bg-secondary text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {pct}%
                    {tipPreset === pct && subtotal > 0 && (
                      <span className="ml-1 text-xs opacity-80">${((afterDiscount - gcApply) * pct / 100).toFixed(2)}</span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setTipPreset("custom")}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    tipPreset === "custom"
                      ? "bg-emerald-500 text-white"
                      : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  Custom
                </button>
              </div>
              {tipPreset === "custom" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-secondary text-foreground rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>
              )}
              {tipAmountNum > 0 && (
                <p className="text-xs text-emerald-500">Tip: +${tipAmountNum.toFixed(2)}</p>
              )}
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Payment Method</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors ${
                    method === m.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Cash change */}
          {method === "CASH" && !splitEnabled && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-2 items-center">
                <label className="text-xs text-muted-foreground shrink-0">Cash tendered:</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-secondary text-foreground rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
              {changeDue > 0 && (
                <div className="flex justify-between rounded-xl bg-primary/10 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Change due</span>
                  <span className="font-bold text-primary">${changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Split payment toggle */}
          <div className="pt-1">
            <button
              onClick={() => { setSplitEnabled((v) => !v); setSplitAmount(""); }}
              className={`text-xs font-medium transition-colors ${splitEnabled ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {splitEnabled ? "Disable" : "Enable"} split payment
            </button>
          </div>

          {splitEnabled && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Second payment method</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.filter((m) => m.id !== method).map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSplitMethod(m.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-colors ${
                        splitMethod === m.id
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-secondary text-foreground hover:bg-secondary/70"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                  Amount via {splitMethod}:
                </label>
                <input
                  type="number"
                  min="0"
                  max={total}
                  step="0.01"
                  value={splitAmount}
                  onChange={(e) => setSplitAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-secondary text-foreground rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
              {parseFloat(splitAmount) > 0 && (
                <div className="text-xs text-muted-foreground">
                  ${(total - (parseFloat(splitAmount) || 0)).toFixed(2)} via {method}, ${parseFloat(splitAmount || "0").toFixed(2)} via {splitMethod}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order total summary */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-primary">
              <span>Discount</span>
              <span>-${totalDiscount.toFixed(2)}</span>
            </div>
          )}
          {gcApply > 0 && (
            <div className="flex justify-between text-primary">
              <span>Gift Card</span>
              <span>-${gcApply.toFixed(2)}</span>
            </div>
          )}
          {tipAmountNum > 0 && (
            <div className="flex justify-between text-emerald-500">
              <span>Tip</span>
              <span>+${tipAmountNum.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Note */}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full bg-card border border-border text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
        />

        {/* Receipt preferences */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Send Receipt Via</p>
          <div className="flex gap-4 text-sm">
            {[
              { id: "sms", label: "SMS", state: receiptSms, set: setReceiptSms },
              { id: "email", label: "Email", state: receiptEmail, set: setReceiptEmail },
              { id: "whatsapp", label: "WhatsApp", state: receiptWhatsapp, set: setReceiptWhatsapp },
            ].map(({ id, label, state, set }) => (
              <label key={id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state}
                  onChange={(e) => set(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <span className="text-muted-foreground hover:text-foreground transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Checkout button */}
        <button
          onClick={handleSubmit}
          disabled={cart.length === 0 || isPending}
          className="w-full py-4 rounded-2xl font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending
            ? "Processing..."
            : method === "CARD" && !splitEnabled && !!STRIPE_PUBLISHABLE_KEY
              ? `Pay by Card $${total.toFixed(2)}`
              : `Collect $${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
