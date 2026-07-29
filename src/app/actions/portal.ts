"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Update a client's basic profile info, identified by phone number.
 * Used by the public portal (no auth — phone is the identity check).
 */
export async function updateClientProfile(
  phone: string,
  data: { name: string; email: string; birthday: string }
): Promise<{ success: true } | { success: false; error: string }> {
  const trimmedPhone = phone?.trim();
  if (!trimmedPhone) return { success: false, error: "Phone number is required" };
  if (!data.name?.trim()) return { success: false, error: "Name is required" };

  try {
    const salon = await prisma.salon.findFirst({ select: { id: true } });
    if (!salon) return { success: false, error: "No salon found" };

    const client = await prisma.client.findFirst({
      where: { salonId: salon.id, phone: trimmedPhone },
      select: { id: true },
    });

    if (!client) {
      return { success: false, error: "No account found for that phone number." };
    }

    await prisma.client.update({
      where: { id: client.id },
      data: {
        name: data.name.trim(),
        email: data.email?.trim() || null,
        birthday: data.birthday?.trim() ? new Date(data.birthday.trim()) : null,
      },
    });

    revalidatePath(`/dashboard/clients`);
    return { success: true };
  } catch (err) {
    console.error("[updateClientProfile]", err);
    return { success: false, error: "Failed to update profile. Please try again." };
  }
}

// ─── updateClientProfile by clientId (portal with clientId in URL) ────────────

export async function updateClientProfileById(
  clientId: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    birthday?: string;
    preferences?: Record<string, unknown>;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Client ID is required" };

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, preferences: true },
    });
    if (!client) return { success: false, error: "Client not found" };

    // Merge preferences if provided
    let mergedPreferences: string | undefined;
    if (data.preferences !== undefined) {
      let existing: Record<string, unknown> = {};
      try {
        existing = JSON.parse(client.preferences ?? "{}") as Record<string, unknown>;
      } catch {
        existing = {};
      }
      mergedPreferences = JSON.stringify({ ...existing, ...data.preferences });
    }

    await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(data.name !== undefined && data.name.trim() ? { name: data.name.trim() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone.trim() || null } : {}),
        ...(data.email !== undefined ? { email: data.email.trim() || null } : {}),
        ...(data.birthday !== undefined
          ? { birthday: data.birthday.trim() ? new Date(data.birthday.trim()) : null }
          : {}),
        ...(mergedPreferences !== undefined ? { preferences: mergedPreferences } : {}),
      },
    });

    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (err) {
    console.error("[updateClientProfileById]", err);
    return { success: false, error: "Failed to update profile. Please try again." };
  }
}

// ─── submitReview (portal version) ───────────────────────────────────────────

export async function submitReview(data: {
  clientId: string;
  salonId: string;
  rating: number;
  comment?: string;
  staffId?: string;
  appointmentId?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!data.clientId) return { success: false, error: "Client ID is required" };
  if (!data.salonId) return { success: false, error: "Salon ID is required" };
  if (!data.rating || data.rating < 1 || data.rating > 5) {
    return { success: false, error: "Rating must be between 1 and 5" };
  }

  try {
    // Prevent duplicate review for the same appointment
    if (data.appointmentId) {
      const existing = await prisma.review.findUnique({
        where: { appointmentId: data.appointmentId },
      });
      if (existing) {
        return { success: false, error: "A review for this appointment already exists" };
      }
    }

    await prisma.review.create({
      data: {
        id: randomUUID(),
        salonId: data.salonId,
        clientId: data.clientId,
        rating: data.rating,
        comment: data.comment?.trim() || null,
        staffId: data.staffId || null,
        appointmentId: data.appointmentId || null,
        isPublic: true,
      },
    });

    revalidatePath("/dashboard/reviews");
    return { success: true };
  } catch (err) {
    console.error("[submitReview]", err);
    return { success: false, error: "Failed to submit review. Please try again." };
  }
}

// ─── findClientByPhone (portal server action) ─────────────────────────────────

export async function findClientByPhone(
  slug: string,
  phone: string
): Promise<{ success: true; clientId: string } | { success: false; error: string }> {
  const trimmed = phone?.trim();
  if (!trimmed) return { success: false, error: "Phone number is required" };

  try {
    const salon = await prisma.salon.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!salon) return { success: false, error: "Salon not found" };

    const client = await prisma.client.findFirst({
      where: { salonId: salon.id, phone: trimmed },
      select: { id: true },
    });

    if (!client) {
      return { success: false, error: "No account found for that phone number." };
    }

    return { success: true, clientId: client.id };
  } catch (err) {
    console.error("[findClientByPhone]", err);
    return { success: false, error: "Failed to look up account." };
  }
}
