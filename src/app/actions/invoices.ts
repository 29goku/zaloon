"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClientTier, pointsToDiscount } from "@/lib/loyalty-tiers";

// ─── Invoice number sequencing ────────────────────────────────────────────────

/**
 * Generates the next sequential invoice number for a salon.
 * Finds the highest existing invoiceNumber stored in the note field as "#INV-XXXX",
 * then returns prefix + zero-padded next number (e.g., "INV-0042").
 */
async function getNextInvoiceNumber(salonId: string): Promise<string> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { invoicePrefix: true },
  });
  const prefix = salon?.invoicePrefix ?? "INV";
  const pattern = `#${prefix}-`;

  // Find all invoices for this salon that have a note matching the pattern
  const invoices = await prisma.invoice.findMany({
    where: { salonId, note: { contains: pattern } },
    select: { note: true },
  });

  let maxNum = 0;
  for (const inv of invoices) {
    if (!inv.note) continue;
    // Extract number from "#INV-0042" style note (may have other text too)
    const match = inv.note.match(new RegExp(`#${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)`));
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  return `${prefix}-${String(maxNum + 1).padStart(4, "0")}`;
}

export async function getInvoice(id: string) {
  if (!id) return null;

  const [invoice, salon, invoiceCount] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        Client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            loyaltyPoints: true,
          },
        },
        Appointment: {
          include: {
            Staff: true,
            AppointmentService: {
              include: { Service: true },
            },
          },
        },
        InvoiceItem: true,
        PartialPayment: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.salon.findFirst(),
    prisma.invoice.count(),
  ]);

  if (!invoice) return null;

  // Prefer sequential number stored in note field (#INV-XXXX), else derive from count
  const prefix = salon?.invoicePrefix ?? "INV";
  let invoiceNumber: string;
  if (invoice.note) {
    const match = invoice.note.match(new RegExp(`#(${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d+)`));
    invoiceNumber = match ? match[1] : `${prefix}-${String(invoiceCount).padStart(4, "0")}`;
  } else {
    invoiceNumber = `${prefix}-${String(invoiceCount).padStart(4, "0")}`;
  }

  return { invoice, salon, invoiceNumber };
}

export async function createInvoice(data: {
  salonId: string;
  clientId?: string;
  appointmentId?: string;
  total: number;
  paymentMethod: string;
  items: { name: string; price: number }[];
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!data.salonId) {
    return { success: false, error: "salonId is required" };
  }
  if (isNaN(data.total) || data.total < 0) {
    return { success: false, error: "Invalid total" };
  }

  try {
    // Generate sequential invoice number
    const invoiceNum = await getNextInvoiceNumber(data.salonId);

    const invoice = await prisma.invoice.create({
      data: {
        id: randomUUID(),
        salonId: data.salonId,
        clientId: data.clientId ?? null,
        appointmentId: data.appointmentId ?? null,
        total: data.total,
        paymentMethod: data.paymentMethod ?? "CASH",
        status: "PAID",
        // Store sequential invoice number in the note field as "#INV-XXXX"
        note: `#${invoiceNum}`,
      },
    });

    // Award loyalty points when invoice is PAID and has a clientId
    if (data.clientId) {
      await _awardPointsForInvoice(data.clientId, data.total, invoice.id);
    }

    return { success: true, id: invoice.id };
  } catch (err) {
    console.error("[createInvoice]", err);
    return { success: false, error: "Failed to create invoice" };
  }
}

/**
 * Internal helper — awards loyalty points based on invoice total and client tier.
 * Points = Math.floor(total * multiplier).
 */
async function _awardPointsForInvoice(
  clientId: string,
  total: number,
  invoiceId: string
): Promise<void> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { loyaltyPoints: true },
    });
    if (!client) return;

    const tier = getClientTier(client.loyaltyPoints);
    const points = Math.floor(total * tier.pointMultiplier);
    if (points <= 0) return;

    await prisma.client.update({
      where: { id: clientId },
      data: { loyaltyPoints: { increment: points } },
    });

    await prisma.ledgerEntry.create({
      data: {
        id: randomUUID(),
        clientId,
        type: "LOYALTY",
        amount: points,
        note: `Earned from invoice ${invoiceId} (${tier.name} ${tier.pointMultiplier}x)`,
      },
    });
  } catch (err) {
    console.error("[_awardPointsForInvoice]", err);
  }
}

export async function voidInvoice(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) {
    return { success: false, error: "id is required" };
  }

  try {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }
    if (existing.status === "VOID") {
      return { success: false, error: "Invoice is already void" };
    }

    await prisma.invoice.update({
      where: { id },
      data: { status: "VOID" },
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[voidInvoice]", err);
    return { success: false, error: "Failed to void invoice" };
  }
}

// ── New actions ───────────────────────────────────────────────────────────────

export async function markInvoicePaid(
  id: string,
  paymentMethod: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  try {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Invoice not found" };
    if (existing.status === "VOID") return { success: false, error: "Cannot mark a voided invoice as paid" };

    await prisma.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paymentMethod: paymentMethod || existing.paymentMethod,
        paidAt: new Date(),
      },
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[markInvoicePaid]", err);
    return { success: false, error: "Failed to mark invoice as paid" };
  }
}

export async function addInvoiceNote(
  id: string,
  note: string,
  isInternal: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  try {
    const field = isInternal ? "internalNotes" : "clientNotes";
    await prisma.invoice.update({
      where: { id },
      data: { [field]: note.trim() || null },
    });

    revalidatePath(`/dashboard/invoices/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[addInvoiceNote]", err);
    return { success: false, error: "Failed to save note" };
  }
}

export async function recordPartialPayment(
  id: string,
  amount: number,
  method: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };
  if (!amount || isNaN(amount) || amount <= 0) return { success: false, error: "Invalid amount" };

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { PartialPayment: true },
    });
    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.status === "VOID") return { success: false, error: "Cannot add payment to a voided invoice" };

    const paidSoFar = invoice.PartialPayment.reduce((s, p) => s + p.amount, 0);
    const remaining = invoice.total - paidSoFar;

    if (amount > remaining + 0.001) {
      return { success: false, error: `Amount exceeds remaining balance of ${remaining.toFixed(2)}` };
    }

    await prisma.partialPayment.create({
      data: {
        id: randomUUID(),
        invoiceId: id,
        amount,
        method: method || "CASH",
      },
    });

    // Auto-mark paid if fully covered
    if (amount >= remaining - 0.001) {
      await prisma.invoice.update({
        where: { id },
        data: { status: "PAID", paidAt: new Date() },
      });
    }

    revalidatePath(`/dashboard/invoices/${id}`);
    revalidatePath("/dashboard/invoices");
    return { success: true };
  } catch (err) {
    console.error("[recordPartialPayment]", err);
    return { success: false, error: "Failed to record partial payment" };
  }
}

export async function voidInvoices(
  ids: string[]
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  if (!ids || ids.length === 0) return { success: false, error: "No invoice IDs provided" };

  try {
    const result = await prisma.invoice.updateMany({
      where: { id: { in: ids }, status: { not: "VOID" } },
      data: { status: "VOID" },
    });

    revalidatePath("/dashboard/invoices");
    return { success: true, count: result.count };
  } catch (err) {
    console.error("[voidInvoices]", err);
    return { success: false, error: "Failed to void invoices" };
  }
}

// ─── Convenience aliases for invoice detail modal ────────────────────────────

/**
 * Add a partial payment to an invoice.
 * Returns the new remaining balance.
 */
export async function addPartialPayment(
  invoiceId: string,
  data: { amount: number; method: string; note?: string }
): Promise<{ success: true; newBalance?: number } | { success: false; error: string }> {
  if (!invoiceId) return { success: false, error: "invoiceId is required" };
  if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
    return { success: false, error: "Invalid amount" };
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { PartialPayment: true },
    });
    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.status === "VOID") return { success: false, error: "Cannot add payment to a voided invoice" };

    const paidSoFar = invoice.PartialPayment.reduce((s, p) => s + p.amount, 0);
    const remaining = invoice.total - paidSoFar;

    if (data.amount > remaining + 0.001) {
      return {
        success: false,
        error: `Amount exceeds remaining balance of ${remaining.toFixed(2)}`,
      };
    }

    await prisma.partialPayment.create({
      data: {
        id: randomUUID(),
        invoiceId,
        amount: data.amount,
        method: data.method || "CASH",
        note: data.note ?? null,
      },
    });

    const newBalance = Math.max(0, remaining - data.amount);

    // Auto-mark paid if fully covered
    if (data.amount >= remaining - 0.001) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAID", paidAt: new Date() },
      });
    }

    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    revalidatePath("/dashboard/invoices");
    return { success: true, newBalance };
  } catch (err) {
    console.error("[addPartialPayment]", err);
    return { success: false, error: "Failed to add partial payment" };
  }
}

// ─── Loyalty points redemption in invoice flow ────────────────────────────────

/**
 * Redeems loyalty points against an invoice.
 * - Validates the client has enough points.
 * - Calculates the dollar discount ($0.01 per point).
 * - Deducts points from the client and records a LOYALTY ledger entry.
 * - Updates the invoice discount field.
 */
export async function redeemLoyaltyPoints(
  invoiceId: string,
  clientId: string,
  pointsToRedeem: number
): Promise<
  | { success: true; discount: number; newPointsTotal: number }
  | { success: false; error: string }
> {
  if (!invoiceId) return { success: false, error: "invoiceId is required" };
  if (!clientId) return { success: false, error: "clientId is required" };
  if (!Number.isInteger(pointsToRedeem) || pointsToRedeem <= 0) {
    return { success: false, error: "pointsToRedeem must be a positive integer" };
  }

  try {
    const [client, invoice] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: { loyaltyPoints: true },
      }),
      prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { status: true, total: true, discount: true, clientId: true },
      }),
    ]);

    if (!client) return { success: false, error: "Client not found" };
    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.status === "VOID") {
      return { success: false, error: "Cannot apply points to a voided invoice" };
    }
    if (invoice.clientId !== clientId) {
      return { success: false, error: "Client does not match invoice" };
    }
    if (client.loyaltyPoints < pointsToRedeem) {
      return {
        success: false,
        error: `Insufficient points. Client has ${client.loyaltyPoints} pts, requested ${pointsToRedeem} pts.`,
      };
    }

    const discount = pointsToDiscount(client.loyaltyPoints, pointsToRedeem);
    const newDiscount = Math.min(invoice.discount + discount, invoice.total);

    // Deduct points and update invoice discount atomically (two writes, same tx-ish)
    const [updatedClient] = await Promise.all([
      prisma.client.update({
        where: { id: clientId },
        data: { loyaltyPoints: { decrement: pointsToRedeem } },
        select: { loyaltyPoints: true },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { discount: newDiscount },
      }),
      prisma.ledgerEntry.create({
        data: {
          id: randomUUID(),
          clientId,
          type: "LOYALTY",
          amount: -pointsToRedeem,
          note: `Redeemed ${pointsToRedeem} pts on invoice ${invoiceId} (−$${discount.toFixed(2)})`,
        },
      }),
    ]);

    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    revalidatePath(`/dashboard/clients/${clientId}`);

    return {
      success: true,
      discount: newDiscount,
      newPointsTotal: updatedClient.loyaltyPoints,
    };
  } catch (err) {
    console.error("[redeemLoyaltyPoints]", err);
    return { success: false, error: "Failed to redeem loyalty points" };
  }
}
