"use server";

import { prisma } from "@/lib/prisma";

export async function getSalonBranding(slug: string): Promise<{
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  businessHours: string | null;
  logo: string | null;
  slug: string;
} | null> {
  return prisma.salon.findUnique({
    where: { slug },
    select: {
      name: true,
      city: true,
      address: true,
      phone: true,
      businessHours: true,
      logo: true,
      slug: true,
    },
  });
}

export async function findClientByPhone(phone: string): Promise<{ id: string } | null> {
  const salon = await prisma.salon.findFirst({ select: { id: true } });
  if (!salon) return null;
  return prisma.client.findFirst({
    where: { salonId: salon.id, phone: phone.trim() },
    select: { id: true },
  });
}
