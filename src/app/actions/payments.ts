"use server";

import { prisma } from "@/lib/prisma";

export interface CreatedInvoice {
  id: string;
  total: number;
  paymentMethod: string;
  note: string | null;
  createdAt: string;
  clientName: string | null;
}

export async function createQuickPayment(data: {
  amount: number;
  method: string;
  note?: string;
  clientId?: string;
}): Promise<{ success: true; invoice: CreatedInvoice } | { success: false; error: string }> {
  if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
    return { success: false, error: "Invalid amount" };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const invId = randomUUID();
    await prisma.invoice.create({
      data: {
        id: invId,
        salonId: salon.id,
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
