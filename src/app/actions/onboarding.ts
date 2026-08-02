"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentSalonId } from "@/lib/repositories/base";

// ── updateSalonProfile ─────────────────────────────────────────────────────

const salonProfileSchema = z.object({
  name: z.string().min(1, "Salon name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  businessType: z.string().optional(),
});

export type SalonProfileInput = z.infer<typeof salonProfileSchema>;

export async function updateSalonProfile(
  data: SalonProfileInput
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = salonProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salonId = await getCurrentSalonId();

    // Check slug uniqueness (excluding current salon)
    const slugConflict = await prisma.salon.findFirst({
      where: { slug: parsed.data.slug, id: { not: salonId } },
    });
    if (slugConflict) {
      return { success: false, error: "This URL slug is already taken. Please choose another." };
    }

    await prisma.salon.update({
      where: { id: salonId },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[updateSalonProfile]", err);
    return { success: false, error: "Failed to update salon profile" };
  }
}

// ── bulkCreateServices ─────────────────────────────────────────────────────

const serviceInputSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  durationMins: z.number().int().min(1),
});

const bulkCreateServicesSchema = z.object({
  categoryName: z.string().min(1),
  services: z.array(serviceInputSchema).min(1),
});

export async function bulkCreateServices(
  data: z.infer<typeof bulkCreateServicesSchema>
): Promise<{ success: true; serviceIds: string[] } | { success: false; error: string }> {
  const parsed = bulkCreateServicesSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salonId = await getCurrentSalonId();

    // Find or create category
    let category = await prisma.serviceCategory.findFirst({
      where: { salonId, name: parsed.data.categoryName },
    });

    if (!category) {
      category = await prisma.serviceCategory.create({
        data: {
          id: randomUUID(),
          salonId,
          name: parsed.data.categoryName,
        },
      });
    }

    const serviceIds: string[] = [];
    for (const svc of parsed.data.services) {
      // Skip if already exists with same name
      const existing = await prisma.service.findFirst({
        where: { salonId, name: svc.name },
      });
      if (existing) {
        serviceIds.push(existing.id);
        continue;
      }

      const created = await prisma.service.create({
        data: {
          id: randomUUID(),
          salonId,
          categoryId: category.id,
          name: svc.name,
          price: svc.price,
          durationMins: svc.durationMins,
        },
      });
      serviceIds.push(created.id);
    }

    return { success: true, serviceIds };
  } catch (err) {
    console.error("[bulkCreateServices]", err);
    return { success: false, error: "Failed to create services" };
  }
}

// ── createOnboardingStaff ──────────────────────────────────────────────────

const createOnboardingStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
});

export async function createOnboardingStaff(
  data: z.infer<typeof createOnboardingStaffSchema>
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createOnboardingStaffSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salonId = await getCurrentSalonId();

    const staff = await prisma.staff.create({
      data: {
        id: randomUUID(),
        salonId,
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        commissionPct: 0,
      },
    });

    return { success: true, id: staff.id };
  } catch (err) {
    console.error("[createOnboardingStaff]", err);
    return { success: false, error: "Failed to create staff member" };
  }
}

// ── deleteOnboardingStaff ──────────────────────────────────────────────────

export async function deleteOnboardingStaff(
  staffId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.staff.delete({ where: { id: staffId } });
    return { success: true };
  } catch (err) {
    console.error("[deleteOnboardingStaff]", err);
    return { success: false, error: "Failed to delete staff member" };
  }
}

// ── saveStaffAvailability ──────────────────────────────────────────────────

const shiftInputSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

export async function saveStaffAvailability(
  staffId: string,
  shifts: z.infer<typeof shiftInputSchema>[]
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = z.array(shiftInputSchema).safeParse(shifts);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid shift data" };
  }

  try {
    await prisma.shift.deleteMany({ where: { staffId } });

    if (parsed.data.length > 0) {
      await prisma.shift.createMany({
        data: parsed.data.map((s) => ({
          id: randomUUID(),
          staffId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
    }

    return { success: true };
  } catch (err) {
    console.error("[saveStaffAvailability]", err);
    return { success: false, error: "Failed to save availability" };
  }
}
