"use server";

import { randomUUID, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GiftCardRow {
  id: string;
  salonId: string;
  code: string;
  initialValue: number;
  balance: number;
  purchasedBy: string | null;
  recipientName: string | null;
  expiresAt: string | null;
  status: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(6);
  const result = Array.from(bytes).map(b => chars[b % chars.length]).join("");
  return "GC-" + result;
}

// Generates a 12-char public purchase code — no confusable chars (no 0/O/I/1)
function generatePublicCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  return Array.from(bytes).map(b => chars[b % chars.length]).join("");
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const today = new Date().toISOString().slice(0, 10);
  return expiresAt < today;
}

// ---------------------------------------------------------------------------
// issueGiftCard
// ---------------------------------------------------------------------------

export async function issueGiftCard(data: {
  initialValue: number;
  purchasedBy?: string;
  recipientName?: string;
  expiresAt?: string;
}): Promise<{ success: true; code: string; id: string } | { success: false; error: string }> {
  if (!data.initialValue || isNaN(data.initialValue) || data.initialValue <= 0) {
    return { success: false, error: "Initial value must be greater than 0" };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    // Generate a unique code — retry a few times in case of collision
    let code = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCode();
      const existing = await prisma.giftCard.findUnique({ where: { code: candidate } });
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) return { success: false, error: "Failed to generate unique code" };

    const card = await prisma.giftCard.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        code,
        initialValue: data.initialValue,
        balance: data.initialValue,
        purchasedBy: data.purchasedBy ?? null,
        recipientName: data.recipientName ?? null,
        expiresAt: data.expiresAt ?? null,
        status: "ACTIVE",
      },
    });

    return { success: true, code: card.code, id: card.id };
  } catch (err) {
    console.error("[issueGiftCard]", err);
    return { success: false, error: "Failed to issue gift card" };
  }
}

// ---------------------------------------------------------------------------
// validateGiftCard
// ---------------------------------------------------------------------------

export async function validateGiftCard(
  code: string
): Promise<{ success: true; card: GiftCardRow } | { success: false; error: string }> {
  if (!code?.trim()) return { success: false, error: "Code is required" };

  try {
    const card = await prisma.giftCard.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!card) return { success: false, error: "Gift card not found" };
    if (card.status === "VOIDED") return { success: false, error: "This gift card has been voided" };
    if (card.status === "REDEEMED") return { success: false, error: "This gift card has already been fully redeemed" };

    // Check expiry
    if (isExpired(card.expiresAt)) {
      // Mark as expired if not already
      if (card.status !== "EXPIRED") {
        await prisma.giftCard.update({ where: { id: card.id }, data: { status: "EXPIRED" } });
      }
      return { success: false, error: "This gift card has expired" };
    }

    return {
      success: true,
      card: {
        ...card,
        createdAt: card.createdAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("[validateGiftCard]", err);
    return { success: false, error: "Failed to validate gift card" };
  }
}

// ---------------------------------------------------------------------------
// redeemGiftCard
// ---------------------------------------------------------------------------

export async function redeemGiftCard(
  code: string,
  amount: number,
  invoiceId?: string
): Promise<{ success: true; newBalance: number } | { success: false; error: string }> {
  if (!amount || isNaN(amount) || amount <= 0) {
    return { success: false, error: "Redemption amount must be greater than 0" };
  }

  const validation = await validateGiftCard(code);
  if (!validation.success) return validation;

  const card = validation.card;

  if (amount > card.balance) {
    return { success: false, error: `Amount exceeds available balance of $${card.balance.toFixed(2)}` };
  }

  try {
    const newBalance = Math.max(0, card.balance - amount);
    const newStatus = newBalance === 0 ? "REDEEMED" : "ACTIVE";

    await prisma.$transaction([
      prisma.giftCard.update({
        where: { id: card.id },
        data: { balance: newBalance, status: newStatus },
      }),
      prisma.giftCardTransaction.create({
        data: {
          id: randomUUID(),
          giftCardId: card.id,
          amount: -amount, // negative = redemption
          note: `Redeemed $${amount.toFixed(2)}`,
          invoiceId: invoiceId ?? null,
        },
      }),
    ]);

    return { success: true, newBalance };
  } catch (err) {
    console.error("[redeemGiftCard]", err);
    return { success: false, error: "Failed to redeem gift card" };
  }
}

// ---------------------------------------------------------------------------
// getGiftCards
// ---------------------------------------------------------------------------

export async function getGiftCards(filter?: {
  status?: string;
}): Promise<GiftCardRow[]> {
  try {
    const cards = await prisma.giftCard.findMany({
      where: filter?.status ? { status: filter.status } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return cards.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("[getGiftCards]", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// purchaseGiftCard — public self-serve purchase
// ---------------------------------------------------------------------------

export async function purchaseGiftCard(data: {
  salonSlug: string;
  amount: number;
  recipientName?: string;
  fromName?: string;
  message?: string;
  recipientEmail?: string;
  purchaserEmail?: string;
}): Promise<{ success: true; code: string; id: string } | { success: false; error: string }> {
  if (!data.amount || isNaN(data.amount) || data.amount < 10) {
    return { success: false, error: "Minimum gift card amount is $10" };
  }

  try {
    const salon = await prisma.salon.findUnique({ where: { slug: data.salonSlug } });
    if (!salon) return { success: false, error: "Salon not found" };

    // Generate unique 12-char code with no confusable chars
    let code = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generatePublicCode();
      const existing = await prisma.giftCard.findUnique({ where: { code: candidate } });
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) return { success: false, error: "Failed to generate unique code — please try again" };

    const purchasedBy = data.fromName?.trim() || data.purchaserEmail?.trim() || null;

    const card = await prisma.giftCard.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        code,
        initialValue: data.amount,
        balance: data.amount,
        purchasedBy,
        recipientName: data.recipientName?.trim() || null,
        expiresAt: null,
        status: "ACTIVE",
      },
    });

    return { success: true, code: card.code, id: card.id };
  } catch (err) {
    console.error("[purchaseGiftCard]", err);
    return { success: false, error: "Failed to purchase gift card" };
  }
}

// ---------------------------------------------------------------------------
// checkGiftCardBalance — public balance lookup
// ---------------------------------------------------------------------------

export async function checkGiftCardBalance(
  code: string
): Promise<
  | {
      success: true;
      balance: number;
      initialValue: number;
      status: string;
      expiresAt: string | null;
      recipientName: string | null;
    }
  | { success: false; error: string }
> {
  if (!code?.trim()) return { success: false, error: "Please enter a gift card code" };

  try {
    const card = await prisma.giftCard.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!card) return { success: false, error: "Gift card not found — please check the code and try again" };

    return {
      success: true,
      balance: card.balance,
      initialValue: card.initialValue,
      status: card.status,
      expiresAt: card.expiresAt,
      recipientName: card.recipientName,
    };
  } catch (err) {
    console.error("[checkGiftCardBalance]", err);
    return { success: false, error: "Failed to look up gift card" };
  }
}
