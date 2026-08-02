import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function getCoupons(salonId: string) {
  return prisma.coupon.findMany({ where: { salonId }, orderBy: { createdAt: "desc" } })
}

export async function getCouponByCode(code: string, salonId: string) {
  return prisma.coupon.findFirst({ where: { code, salonId } })
}

export async function createCouponRecord(
  salonId: string,
  data: Omit<Prisma.CouponUncheckedCreateInput, "salonId">
) {
  const { randomUUID } = await import("crypto")
  return prisma.coupon.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateCouponRecord(
  id: string,
  salonId: string,
  data: Prisma.CouponUpdateInput
) {
  await prisma.coupon.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  return prisma.coupon.update({ where: { id }, data })
}

export async function deleteCouponRecord(id: string, salonId: string): Promise<void> {
  await prisma.coupon.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.coupon.delete({ where: { id } })
}
