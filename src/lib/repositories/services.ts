import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function getServices(salonId: string) {
  return prisma.service.findMany({
    where: { salonId },
    include: { ServiceCategory: true },
    orderBy: { name: "asc" },
  })
}

export async function getServiceById(id: string, salonId: string) {
  return prisma.service.findFirst({
    where: { id, salonId },
    include: { ServiceCategory: true },
  })
}

export async function createServiceRecord(
  salonId: string,
  data: Omit<Prisma.ServiceUncheckedCreateInput, "salonId">
) {
  return prisma.service.create({ data: { ...data, salonId } })
}

export async function updateServiceRecord(
  id: string,
  salonId: string,
  data: Prisma.ServiceUpdateInput
) {
  await prisma.service.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  return prisma.service.update({ where: { id }, data })
}

export async function deleteServiceRecord(id: string, salonId: string): Promise<void> {
  await prisma.service.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.service.delete({ where: { id } })
}

export async function getCategories(salonId: string) {
  return prisma.serviceCategory.findMany({
    where: { salonId },
    include: { Service: true },
    orderBy: { name: "asc" },
  })
}

export async function createCategoryRecord(salonId: string, name: string) {
  const { randomUUID } = await import("crypto")
  return prisma.serviceCategory.create({ data: { id: randomUUID(), salonId, name } })
}

export async function deleteCategoryRecord(id: string, salonId: string): Promise<void> {
  await prisma.serviceCategory.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.serviceCategory.delete({ where: { id } })
}
