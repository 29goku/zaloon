"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  birthday: z.string().optional(),
  notes: z.string().optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  birthday: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateClientInput = z.infer<typeof clientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export async function createClient(
  data: CreateClientInput
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return { success: false, error: "No salon found" };
    }

    const { name, phone, email, birthday, notes } = parsed.data;

    const client = await prisma.client.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name,
        phone: phone || null,
        email: email || null,
        birthday: birthday ? new Date(birthday) : null,
        notes: notes || null,
      },
    });

    return { success: true, id: client.id };
  } catch (err) {
    console.error("[createClient]", err);
    return { success: false, error: "Failed to create client" };
  }
}

export async function updateClient(
  id: string,
  data: UpdateClientInput
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = updateClientSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const { name, phone, email, birthday, notes } = parsed.data;

    await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(birthday !== undefined && {
          birthday: birthday ? new Date(birthday) : null,
        }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[updateClient]", err);
    return { success: false, error: "Failed to update client" };
  }
}

export async function deleteClient(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.client.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    console.error("[deleteClient]", err);
    return { success: false, error: "Failed to delete client" };
  }
}

export async function addLoyaltyPoints(
  clientId: string,
  points: number,
  reason: string
): Promise<{ success: true; newTotal: number } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  if (!Number.isInteger(points) || points <= 0) {
    return { success: false, error: "Points must be a positive integer" };
  }

  try {
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { loyaltyPoints: { increment: points } },
      select: { loyaltyPoints: true },
    });

    // Record in ledger for traceability
    await prisma.ledgerEntry.create({
      data: {
        id: randomUUID(),
        clientId,
        type: "CREDIT",
        amount: points,
        note: `Points earned: ${reason}`,
      },
    });

    return { success: true, newTotal: updated.loyaltyPoints };
  } catch (err) {
    console.error("[addLoyaltyPoints]", err);
    return { success: false, error: "Failed to add loyalty points" };
  }
}

export async function redeemLoyaltyPoints(
  clientId: string,
  points: number
): Promise<{ success: true; newTotal: number } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  if (!Number.isInteger(points) || points <= 0) {
    return { success: false, error: "Points must be a positive integer" };
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { loyaltyPoints: true },
    });

    if (!client) return { success: false, error: "Client not found" };
    if (client.loyaltyPoints < points) {
      return {
        success: false,
        error: `Insufficient points. Client has ${client.loyaltyPoints} pts, requested ${points} pts.`,
      };
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { loyaltyPoints: { decrement: points } },
      select: { loyaltyPoints: true },
    });

    await prisma.ledgerEntry.create({
      data: {
        id: randomUUID(),
        clientId,
        type: "DEBIT",
        amount: points,
        note: `Points redeemed: ${points} pts`,
      },
    });

    return { success: true, newTotal: updated.loyaltyPoints };
  } catch (err) {
    console.error("[redeemLoyaltyPoints]", err);
    return { success: false, error: "Failed to redeem loyalty points" };
  }
}
