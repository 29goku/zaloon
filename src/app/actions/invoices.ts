"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export async function getInvoice(id: string) {
  if (!id) return null;

  const [invoice, salon, invoiceCount] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
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

    return { success: true, id: invoice.id };
  } catch (err) {
    console.error("[createInvoice]", err);
    return { success: false, error: "Failed to create invoice" };
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

    return { success: true };
  } catch (err) {
    console.error("[voidInvoice]", err);
    return { success: false, error: "Failed to void invoice" };
  }
}
