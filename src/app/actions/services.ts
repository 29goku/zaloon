"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentSalonId } from "@/lib/repositories/base";

// ── Schemas ────────────────────────────────────────────────────────────────

const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon: z.string().optional(),
});

const createServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  categoryId: z.string().min(1, "Category is required"),
  price: z.number().min(0, "Price must be 0 or more"),
  durationMins: z.number().int().min(1, "Duration must be at least 1 minute"),
  isAddon: z.boolean().optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  bufferTimeBefore: z.number().int().min(0).optional(),
  bufferTimeAfter: z.number().int().min(0).optional(),
  onlineBooking: z.boolean().optional(),
});

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  durationMins: z.number().int().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  active: z.boolean().optional(),
  isAddon: z.boolean().optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).or(z.null()),
  bufferTimeBefore: z.number().int().min(0).optional(),
  bufferTimeAfter: z.number().int().min(0).optional(),
  onlineBooking: z.boolean().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon: z.string().optional(),
});

// ── createCategory ─────────────────────────────────────────────────────────

export async function createCategory(
  data: z.infer<typeof createCategorySchema>
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createCategorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salonId = await getCurrentSalonId();

    const category = await prisma.serviceCategory.create({
      data: {
        id: randomUUID(),
        salonId,
        name: parsed.data.name,
        icon: parsed.data.icon ?? null,
      },
    });

    return { success: true, id: category.id };
  } catch (err) {
    console.error("[createCategory]", err);
    return { success: false, error: "Failed to create category" };
  }
}

// ── createService ──────────────────────────────────────────────────────────

export async function createService(
  data: z.infer<typeof createServiceSchema>
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createServiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salonId = await getCurrentSalonId();

    const service = await prisma.service.create({
      data: {
        id: randomUUID(),
        salonId,
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        price: parsed.data.price,
        durationMins: parsed.data.durationMins,
        isAddon: parsed.data.isAddon ?? false,
        imageUrl: parsed.data.imageUrl || null,
        bufferTimeBefore: parsed.data.bufferTimeBefore ?? 0,
        bufferTimeAfter: parsed.data.bufferTimeAfter ?? 0,
        onlineBooking: parsed.data.onlineBooking ?? true,
      },
    });

    return { success: true, id: service.id };
  } catch (err) {
    console.error("[createService]", err);
    return { success: false, error: "Failed to create service" };
  }
}

// ── updateService ──────────────────────────────────────────────────────────

export async function updateService(
  id: string,
  data: z.infer<typeof updateServiceSchema>
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = updateServiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    // Coerce empty imageUrl to null
    const updateData = {
      ...parsed.data,
      imageUrl: parsed.data.imageUrl === "" ? null : parsed.data.imageUrl,
    };

    await prisma.service.update({
      where: { id },
      data: updateData,
    });

    return { success: true };
  } catch (err) {
    console.error("[updateService]", err);
    return { success: false, error: "Failed to update service" };
  }
}

// ── toggleServiceActive ────────────────────────────────────────────────────

export async function toggleServiceActive(
  id: string,
  active: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.service.update({ where: { id }, data: { active } });
    return { success: true };
  } catch (err) {
    console.error("[toggleServiceActive]", err);
    return { success: false, error: "Failed to update service" };
  }
}

// ── duplicateService ───────────────────────────────────────────────────────

export async function duplicateService(
  id: string
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const original = await prisma.service.findUnique({ where: { id } });
    if (!original) return { success: false, error: "Service not found" };

    const copy = await prisma.service.create({
      data: {
        id: randomUUID(),
        salonId: original.salonId,
        categoryId: original.categoryId,
        name: `Copy of ${original.name}`,
        price: original.price,
        durationMins: original.durationMins,
        active: original.active,
        isAddon: original.isAddon,
        imageUrl: original.imageUrl,
        bufferTimeBefore: original.bufferTimeBefore,
        bufferTimeAfter: original.bufferTimeAfter,
        onlineBooking: original.onlineBooking,
      },
    });

    return { success: true, id: copy.id };
  } catch (err) {
    console.error("[duplicateService]", err);
    return { success: false, error: "Failed to duplicate service" };
  }
}

// ── bulkUpdatePrices ───────────────────────────────────────────────────────

export async function bulkUpdatePrices(
  percentage: number
): Promise<{ success: true; updated: number } | { success: false; error: string }> {
  if (typeof percentage !== "number" || isNaN(percentage)) {
    return { success: false, error: "Invalid percentage" };
  }

  try {
    const salonId = await getCurrentSalonId();

    const services = await prisma.service.findMany({
      where: { salonId },
      select: { id: true, price: true },
    });

    const multiplier = 1 + percentage / 100;

    // SQLite doesn't support updateMany with computed values, so update individually
    await Promise.all(
      services.map((s) =>
        prisma.service.update({
          where: { id: s.id },
          data: { price: Math.round(s.price * multiplier * 100) / 100 },
        })
      )
    );

    return { success: true, updated: services.length };
  } catch (err) {
    console.error("[bulkUpdatePrices]", err);
    return { success: false, error: "Failed to update prices" };
  }
}

// ── deleteService ──────────────────────────────────────────────────────────

export async function deleteService(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.service.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    console.error("[deleteService]", err);
    return { success: false, error: "Failed to delete service" };
  }
}

// ── updateCategory ─────────────────────────────────────────────────────────

export async function updateCategory(
  id: string,
  data: z.infer<typeof updateCategorySchema>
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = updateCategorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.serviceCategory.update({
      where: { id },
      data: {
        name: parsed.data.name,
        icon: parsed.data.icon ?? null,
      },
    });
    return { success: true };
  } catch (err) {
    console.error("[updateCategory]", err);
    return { success: false, error: "Failed to update category" };
  }
}

// ── deleteCategory ─────────────────────────────────────────────────────────

export async function deleteCategory(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const count = await prisma.service.count({ where: { categoryId: id } });
    if (count > 0) {
      return {
        success: false,
        error: `Cannot delete category with ${count} service${count !== 1 ? "s" : ""}. Delete all services first.`,
      };
    }

    await prisma.serviceCategory.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    console.error("[deleteCategory]", err);
    return { success: false, error: "Failed to delete category" };
  }
}

// ── reorderCategories ──────────────────────────────────────────────────────

export async function reorderCategories(
  orderedIds: string[]
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const salonId = await getCurrentSalonId();

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { businessHours: true },
    });

    // Persist the order in Salon.businessHours as __categoryOrder
    let hours: Record<string, unknown> = {};
    if (salon?.businessHours) {
      try {
        hours = JSON.parse(salon.businessHours);
      } catch {
        hours = {};
      }
    }
    hours.__categoryOrder = orderedIds;

    await prisma.salon.update({
      where: { id: salonId },
      data: { businessHours: JSON.stringify(hours) },
    });

    return { success: true };
  } catch (err) {
    console.error("[reorderCategories]", err);
    return { success: false, error: "Failed to save category order" };
  }
}

// ── importServices ─────────────────────────────────────────────────────────

export type ImportServiceInput = {
  name: string;
  price: string;
  duration: string;
  category?: string;
};

export async function importServices(
  rows: ImportServiceInput[]
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  let salonId: string;
  try {
    salonId = await getCurrentSalonId();
  } catch {
    return { success: false, imported: 0, errors: ["No salon found"] };
  }

  let imported = 0;
  const errors: string[] = [];

  for (const raw of rows) {
    const name = raw.name?.trim();
    if (!name) {
      errors.push("Skipped row with empty name");
      continue;
    }

    const price = parseFloat(raw.price);
    if (isNaN(price) || price < 0) {
      errors.push(`Skipped "${name}": invalid price "${raw.price}"`);
      continue;
    }

    const durationMins = parseInt(raw.duration, 10);
    if (isNaN(durationMins) || durationMins < 1) {
      errors.push(`Skipped "${name}": invalid duration "${raw.duration}"`);
      continue;
    }

    try {
      // Resolve or create category
      const categoryName = raw.category?.trim() || "Imported";
      let category = await prisma.serviceCategory.findFirst({
        where: { salonId, name: categoryName },
        select: { id: true },
      });
      if (!category) {
        category = await prisma.serviceCategory.create({
          data: {
            id: randomUUID(),
            salonId,
            name: categoryName,
          },
          select: { id: true },
        });
      }

      // Skip if service with same name + price already exists
      const existing = await prisma.service.findFirst({
        where: { salonId, name, price },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.service.create({
        data: {
          id: randomUUID(),
          salonId,
          categoryId: category.id,
          name,
          price,
          durationMins,
        },
      });
      imported++;
    } catch (err) {
      console.error("[importServices] row error", err);
      errors.push(`Failed to import "${name}"`);
    }
  }

  return { success: true, imported, errors };
}
