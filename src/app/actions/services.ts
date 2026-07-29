"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

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
});

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  durationMins: z.number().int().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  active: z.boolean().optional(),
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
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const category = await prisma.serviceCategory.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
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
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const service = await prisma.service.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        price: parsed.data.price,
        durationMins: parsed.data.durationMins,
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
    await prisma.service.update({
      where: { id },
      data: parsed.data,
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
