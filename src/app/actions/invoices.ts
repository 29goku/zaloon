"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClientTier, pointsToDiscount } from "@/lib/loyalty-tiers";

export async function getInvoice(id: string) {
  if (!id) return null;

  const [invoice, salon, invoiceCount] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        Client: true,
        Appointment: {
          include: {
            Staff: true,
            AppointmentService: {
              include: { Service: true },
            },
          },
        },
        PartialPayment: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.salon.findFirst(),
    prisma.invoice.count(),
  ]);

  if (!invoice) return null;

  // Auto-generate invoice number: prefix + 4-digit sequence based on count
  const prefix = salon?.invoicePrefix ?? "INV";
  const invoiceNumber = `${prefix}-${String(invoiceCount).padStart(4, "0")}`;

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
    const invoice = await prisma.invoice.create({
      data: {
        id: randomUUID(),
        salonId: data.salonId,
        clientId: data.clientId ?? null,
        appointmentId: data.appointmentId ?? null,
        total: data.total,
        paymentMethod: data.paymentMethod ?? "CASH",
        status: "PAID",
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
