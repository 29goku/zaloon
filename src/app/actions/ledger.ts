"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const ledgerEntrySchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  type: z.enum(["CREDIT", "DEBIT"]),
  amount: z.number().positive("Amount must be positive"),
  note: z.string().optional(),
});

export type CreateLedgerEntryInput = z.infer<typeof ledgerEntrySchema>;

export async function createLedgerEntry(
  data: CreateLedgerEntryInput
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = ledgerEntrySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const { clientId, type, amount, note } = parsed.data;

    const entry = await prisma.ledgerEntry.create({
      data: {
        id: randomUUID(),
        clientId,
        type,
        amount,
        note: note || null,
      },
    });

    return { success: true, id: entry.id };
  } catch (err) {
    console.error("[createLedgerEntry]", err);
    return { success: false, error: "Failed to create ledger entry" };
  }
}

export async function deleteLedgerEntry(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.ledgerEntry.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    console.error("[deleteLedgerEntry]", err);
    return { success: false, error: "Failed to delete ledger entry" };
  }
}
