"use server";

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
