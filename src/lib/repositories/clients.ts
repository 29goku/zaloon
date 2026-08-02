import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type ClientFilter = {
  query?: string
  tag?: string
  isVip?: boolean
  limit?: number
}

export async function getClients(salonId: string, filter?: ClientFilter) {
  const where: Prisma.ClientWhereInput = { salonId }
  if (filter?.isVip) where.isVip = true
  if (filter?.query) {
    where.OR = [
      { name: { contains: filter.query, mode: "insensitive" } },
      { email: { contains: filter.query, mode: "insensitive" } },
      { phone: { contains: filter.query, mode: "insensitive" } },
    ]
  }
  return prisma.client.findMany({
    where,
    orderBy: { name: "asc" },
    take: filter?.limit,
  })
}

export async function getClientById(id: string, salonId: string) {
  return prisma.client.findFirst({ where: { id, salonId } })
}

export async function createClientRecord(
  salonId: string,
  data: Omit<Prisma.ClientUncheckedCreateInput, "salonId">
) {
  return prisma.client.create({ data: { ...data, salonId } })
}

export async function updateClientRecord(
  id: string,
  salonId: string,
  data: Prisma.ClientUncheckedUpdateInput
) {
  return prisma.client.update({ where: { id }, data: { ...data, salonId } })
}

export async function deleteClientRecord(id: string, salonId: string): Promise<void> {
  // verify ownership before deleting
  await prisma.client.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.client.delete({ where: { id } })
}

export async function searchClientsByQuery(salonId: string, query: string) {
  return getClients(salonId, { query, limit: 20 })
}
