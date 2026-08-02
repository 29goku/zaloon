import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type InventoryFilter = {
  category?: string
  lowStock?: boolean
  limit?: number
}

export async function getInventory(salonId: string, filter?: InventoryFilter) {
  const where: Prisma.InventoryItemWhereInput = { salonId }
  if (filter?.category) where.category = filter.category
  // NOTE: lowStock (quantity <= minQuantity) is a cross-column comparison — handled in a
  // post-fetch filter because Prisma's where cannot compare two columns natively.
  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: "asc" },
    take: filter?.lowStock ? undefined : filter?.limit,
  })
  if (filter?.lowStock) {
    const lowStock = items.filter((i) => i.quantity <= i.minQuantity)
    return filter.limit ? lowStock.slice(0, filter.limit) : lowStock
  }
  return items
}

export async function getInventoryItemById(id: string, salonId: string) {
  return prisma.inventoryItem.findFirst({ where: { id, salonId } })
}

export async function createInventoryItemRecord(
  salonId: string,
  data: Omit<Prisma.InventoryItemUncheckedCreateInput, "salonId">
) {
  const { randomUUID } = await import("crypto")
  return prisma.inventoryItem.create({
    data: { ...data, id: data.id ?? randomUUID(), salonId },
  })
}

export async function updateInventoryItemRecord(
  id: string,
  salonId: string,
  data: Prisma.InventoryItemUpdateInput
) {
  await prisma.inventoryItem.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  return prisma.inventoryItem.update({ where: { id }, data })
}

export async function deleteInventoryItemRecord(id: string, salonId: string): Promise<void> {
  await prisma.inventoryItem.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.inventoryItem.delete({ where: { id } })
}

export async function createInventoryTransaction(
  data: Prisma.InventoryTransactionUncheckedCreateInput
) {
  const { randomUUID } = await import("crypto")
  return prisma.inventoryTransaction.create({
    data: { ...data, id: data.id ?? randomUUID() },
  })
}

export async function getInventoryTransactions(salonId: string, itemId?: string) {
  return prisma.inventoryTransaction.findMany({
    where: {
      Item: { salonId },
      ...(itemId ? { itemId } : {}),
    },
    include: { Item: true },
    orderBy: { createdAt: "desc" },
  })
}
