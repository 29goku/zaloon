"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentSalonId } from "@/lib/repositories/base";
import { applyCoupon } from "./coupons";
import { redeemGiftCard } from "./gift-cards";
import { createLedgerEntry } from "./ledger";

export interface CartItem {
  serviceId?: string;
  name: string;
  price: number;
  qty: number;
}

export interface SplitPayment {
  method: string;
  amount: number;
}

export interface ReceiptPrefs {
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
}

export interface CheckoutPayload {
  items: CartItem[];
  /** Primary payment method */
  method: string;
  /** Optional second method for split pay */
  split?: SplitPayment;
  /** Manual discount applied on top of coupon */
  manualDiscount?: number;
  /** Whether manualDiscount is a percentage (true) or fixed $ (false) */
  manualDiscountPct?: boolean;
  /** Coupon code – already validated on the client, we re-validate here */
  couponCode?: string;
  /** Gift-card code – already validated on the client */
  giftCardCode?: string;
  /** Amount to redeem from the gift card */
  giftCardAmount?: number;
  clientId?: string;
  note?: string;
  receiptPrefs?: ReceiptPrefs;
  /** Tip amount in dollars */
  tipAmount?: number;
}

export interface CreatedInvoice {
  id: string;
  invoiceNumber: string;
  total: number;
  subtotal: number;
  discount: number;
  tip: number;
  couponDiscount: number;
  giftCardAmount: number;
  paymentMethod: string;
  paymentMethod2: string | null;
  note: string | null;
  createdAt: string;
  clientName: string | null;
  items: CartItem[];
}

// ── Older minimal interface kept for RecentPayments list ──────────────────────
export interface RecentInvoiceSummary {
  id: string;
  total: number;
  paymentMethod: string;
  note: string | null;
  createdAt: string;
  clientName: string | null;
}

// ── Main checkout action ──────────────────────────────────────────────────────

export async function checkoutQuickPay(
  payload: CheckoutPayload
): Promise<{ success: true; invoice: CreatedInvoice } | { success: false; error: string }> {
  const { items, method, split, couponCode, giftCardCode, giftCardAmount, clientId, note, receiptPrefs, tipAmount } = payload;

  if (!items || items.length === 0) {
    return { success: false, error: "Cart is empty" };
  }

  try {
    let salonId: string;
    try {
      salonId = await getCurrentSalonId();
    } catch {
      return { success: false, error: "No salon found" };
    }
    const salon = await prisma.salon.findUniqueOrThrow({ where: { id: salonId }, select: { id: true, invoicePrefix: true } });

    // ── Subtotal ─────────────────────────────────────────────────────────────
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    // ── Coupon discount ──────────────────────────────────────────────────────
    let couponDiscount = 0;
    let validatedCouponCode: string | null = null;
    if (couponCode) {
      const { validateCoupon } = await import("./coupons");
      const couponResult = await validateCoupon(couponCode, subtotal);
      if (!couponResult.valid) {
        return { success: false, error: couponResult.error ?? "Invalid coupon" };
      }
      couponDiscount = couponResult.discount;
      validatedCouponCode = couponCode.toUpperCase();
    }

    // ── Manual discount ──────────────────────────────────────────────────────
    let manualDiscountAmt = 0;
    if (payload.manualDiscount && payload.manualDiscount > 0) {
      if (payload.manualDiscountPct) {
        manualDiscountAmt = (subtotal * payload.manualDiscount) / 100;
      } else {
        manualDiscountAmt = payload.manualDiscount;
      }
    }

    const totalDiscount = couponDiscount + manualDiscountAmt;
    const afterDiscount = Math.max(0, subtotal - totalDiscount);

    // ── Gift card ────────────────────────────────────────────────────────────
    const gcAmount = giftCardAmount ?? 0;
    if (gcAmount > 0 && gcAmount > afterDiscount) {
      return { success: false, error: "Gift card amount exceeds order total after discounts" };
    }

    // ── Tip ──────────────────────────────────────────────────────────────────
    const tipAmt = tipAmount && tipAmount > 0 ? tipAmount : 0;

    // ── Final total ──────────────────────────────────────────────────────────
    const total = Math.max(0, afterDiscount - gcAmount + tipAmt);

    // ── Split payment validation ─────────────────────────────────────────────
    if (split) {
      const sumSplit = split.amount + (total - split.amount);
      // The primary pays (total - split.amount), secondary pays split.amount
      if (split.amount <= 0 || split.amount > total) {
        return { success: false, error: "Invalid split payment amount" };
      }
    }

    // ── Create invoice ───────────────────────────────────────────────────────
    const invId = randomUUID();
    const now = new Date();

    await prisma.invoice.create({
      data: {
        id: invId,
        salonId: salon.id,
        clientId: clientId ?? null,
        appointmentId: null,
        total,
        tip: tipAmt,
        discount: totalDiscount,
        paymentMethod: method,
        paymentMethod2: split?.method ?? null,
        paymentAmount2: split?.amount ?? null,
        giftCardCode: giftCardCode ?? null,
        giftCardAmount: gcAmount > 0 ? gcAmount : null,
        couponCode: validatedCouponCode,
        couponDiscount: couponDiscount > 0 ? couponDiscount : null,
        status: "PAID",
        note: note?.trim() || null,
        receiptPrefs: receiptPrefs ? JSON.stringify(receiptPrefs) : null,
        InvoiceItem: {
          create: items.map((item) => ({
            id: randomUUID(),
            name: item.name,
            price: item.price,
            qty: item.qty,
          })),
        },
      },
    });

    // ── Increment coupon used count ──────────────────────────────────────────
    if (validatedCouponCode) {
      await applyCoupon(validatedCouponCode);
    }

    // ── Redeem gift card ─────────────────────────────────────────────────────
    if (giftCardCode && gcAmount > 0) {
      const gcResult = await redeemGiftCard(giftCardCode, gcAmount, invId);
      if (!gcResult.success) {
        // Invoice was created; log error but don't fail the checkout
        console.error("[checkoutQuickPay] gift card redeem error:", gcResult.error);
      }
    }

    // ── Ledger entry for linked client ───────────────────────────────────────
    if (clientId) {
      await createLedgerEntry({
        clientId,
        type: "DEBIT",
        amount: total,
        note: `Quick Pay – Invoice #${invId.slice(-6).toUpperCase()}`,
      });
    }

    // ── Build invoice number ─────────────────────────────────────────────────
    const invoiceCount = await prisma.invoice.count({ where: { salonId: salon.id } });
    const prefix = salon.invoicePrefix ?? "INV";
    const invoiceNumber = `${prefix}-${String(invoiceCount).padStart(4, "0")}`;

    // ── Fetch client name ────────────────────────────────────────────────────
    let clientName: string | null = null;
    if (clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
      clientName = client?.name ?? null;
    }

    return {
      success: true,
      invoice: {
        id: invId,
        invoiceNumber,
        total,
        subtotal,
        discount: totalDiscount,
        tip: tipAmt,
        couponDiscount,
        giftCardAmount: gcAmount,
        paymentMethod: method,
        paymentMethod2: split?.method ?? null,
        note: note?.trim() || null,
        createdAt: now.toISOString(),
        clientName,
        items,
      },
    };
  } catch (err) {
    console.error("[checkoutQuickPay]", err);
    return { success: false, error: "Failed to record payment" };
  }
}

// ── Legacy action – kept so any other callers don't break ────────────────────

export async function createQuickPayment(data: {
  amount: number;
  method: string;
  note?: string;
  clientId?: string;
}): Promise<{ success: true; invoice: RecentInvoiceSummary } | { success: false; error: string }> {
  if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
    return { success: false, error: "Invalid amount" };
  }

  try {
    let salonId: string;
    try {
      salonId = await getCurrentSalonId();
    } catch {
      return { success: false, error: "No salon found" };
    }

    const invId = randomUUID();
    await prisma.invoice.create({
      data: {
        id: invId,
        salonId,
        clientId: data.clientId ?? null,
        appointmentId: null,
        total: data.amount,
        paymentMethod: data.method,
        status: "PAID",
        note: data.note ?? null,
      },
    });

    const inv = await prisma.invoice.findUnique({
      where: { id: invId },
      include: { Client: { select: { name: true } } },
    });

    return {
      success: true,
      invoice: {
        id: invId,
        total: data.amount,
        paymentMethod: data.method,
        note: data.note ?? null,
        createdAt: new Date().toISOString(),
        clientName: inv?.Client?.name ?? null,
      },
    };
  } catch (err) {
    console.error("[createQuickPayment]", err);
    return { success: false, error: "Failed to record payment" };
  }
}
