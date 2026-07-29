"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function importServices(
  rows: {
    name: string;
    category: string;
    duration: string;
    price: string;
  }[]
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const salon = await prisma.salon.findFirst();
  if (!salon) {
    return { success: false, imported: 0, errors: ["No salon found"] };
  }

  let imported = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowLabel = `Row ${i + 2}`; // +2: 1-based + header

    const name = row.name?.trim();
    if (!name) {
      errors.push(`${rowLabel}: name is required`);
      continue;
    }

    const categoryName = row.category?.trim();
    if (!categoryName) {
      errors.push(`${rowLabel} (${name}): category is required`);
      continue;
    }

    const durationMins = parseInt(row.duration?.trim() ?? "30", 10);
    if (isNaN(durationMins) || durationMins <= 0) {
      errors.push(`${rowLabel} (${name}): invalid duration "${row.duration}"`);
      continue;
    }

    const price = parseFloat(row.price?.trim() ?? "0");
    if (isNaN(price) || price < 0) {
      errors.push(`${rowLabel} (${name}): invalid price "${row.price}"`);
      continue;
    }

    try {
      // Find or create ServiceCategory
      let category = await prisma.serviceCategory.findFirst({
        where: {
          salonId: salon.id,
          name: { equals: categoryName },
        },
      });

      if (!category) {
        category = await prisma.serviceCategory.create({
          data: {
            id: randomUUID(),
            salonId: salon.id,
            name: categoryName,
          },
        });
      }

      // Check for duplicate service name in same category
      const existing = await prisma.service.findFirst({
        where: {
          salonId: salon.id,
          categoryId: category.id,
          name: { equals: name },
        },
      });

      if (existing) {
        errors.push(`${rowLabel} (${name}): service already exists in category "${categoryName}" — skipped`);
        continue;
      }

      await prisma.service.create({
        data: {
          id: randomUUID(),
          salonId: salon.id,
          categoryId: category.id,
          name,
          durationMins,
          price,
          active: true,
        },
      });

      imported++;
    } catch (err) {
      console.error("[importServices] row error", err);
      errors.push(`${rowLabel} (${name}): unexpected error`);
    }
  }

  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/settings/import");
  return { success: true, imported, errors };
}
