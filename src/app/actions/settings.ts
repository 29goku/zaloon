"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";

const salonSettingsSchema = z.object({
  name: z.string().min(1, "Salon name is required").optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  taxRate: z.number().min(0).max(30).optional(),
  invoicePrefix: z.string().min(1).max(20).optional(),
  invoiceFooter: z.string().max(500).optional(),
  businessHours: z.string().optional(),
});

export type SalonSettingsInput = z.infer<typeof salonSettingsSchema>;

export async function updateSalonSettings(
  data: SalonSettingsInput
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = salonSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return { success: false, error: "No salon found" };
    }

    const {
      name,
      address,
      city,
      country,
      timezone,
      currency,
      phone,
      email,
      taxRate,
      invoicePrefix,
      invoiceFooter,
      businessHours,
    } = parsed.data;

    await prisma.salon.update({
      where: { id: salon.id },
      data: {
        updatedAt: new Date(),
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address: address || null }),
        ...(city !== undefined && { city: city || null }),
        ...(country !== undefined && { country }),
        ...(timezone !== undefined && { timezone }),
        ...(currency !== undefined && { currency }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(taxRate !== undefined && { taxRate }),
        ...(invoicePrefix !== undefined && { invoicePrefix: invoicePrefix || "INV" }),
        ...(invoiceFooter !== undefined && { invoiceFooter: invoiceFooter || null }),
        ...(businessHours !== undefined && { businessHours: businessHours || null }),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[updateSalonSettings]", err);
    return { success: false, error: "Failed to update settings" };
  }
}
