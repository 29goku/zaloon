import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function getGiftCards(salonId: string) {
  return prisma.giftCard.findMany({
    where: { salonId },
    include: { GiftCardTransaction: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function getGiftCardByCode(code: string, salonId: string) {
  return prisma.giftCard.findFirst({ where: { code, salonId }, include: { GiftCardTransaction: true } })
}

export async function createGiftCardRecord(
  salonId: string,
  data: Omit<Prisma.GiftCardUncheckedCreateInput, "salonId">
) {
  const { randomUUID } = await import("crypto")
  return prisma.giftCard.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateGiftCardRecord(
  id: string,
  salonId: string,
  data: Prisma.GiftCardUpdateInput
) {
  await prisma.giftCard.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  return prisma.giftCard.update({ where: { id }, data })
}

export async function createGiftCardTransaction(
  data: Prisma.GiftCardTransactionUncheckedCreateInput
) {
  const { randomUUID } = await import("crypto")
  return prisma.giftCardTransaction.create({ data: { ...data, id: data.id ?? randomUUID() } })
}
