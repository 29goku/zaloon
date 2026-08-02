import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma, Salon } from "@prisma/client"

export async function getSalon(salonId: string): Promise<Salon> {
  return prisma.salon.findUniqueOrThrow({ where: { id: salonId } })
}

export async function updateSalon(salonId: string, data: Prisma.SalonUpdateInput): Promise<Salon> {
  return prisma.salon.update({ where: { id: salonId }, data })
}

export async function readSalonBlob(salonId: string): Promise<Record<string, unknown>> {
  const salon = await prisma.salon.findUniqueOrThrow({
    where: { id: salonId },
    select: { businessHours: true },
  })
  if (!salon.businessHours) return {}
  try {
    return JSON.parse(salon.businessHours) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function writeSalonBlobKey(salonId: string, key: string, value: unknown): Promise<void> {
  const existing = await readSalonBlob(salonId)
  const updated = { ...existing, [key]: value }
  await prisma.salon.update({
    where: { id: salonId },
    data: { businessHours: JSON.stringify(updated) },
  })
}
