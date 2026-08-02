import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function getWaitlistBySalon(salonId: string) {
  return prisma.waitlist.findMany({
    where: { salonId },
    include: { Client: true, Service: true, Staff: true },
    orderBy: { createdAt: "asc" },
  })
}

export async function createWaitlistRecord(
  salonId: string,
  data: Omit<Prisma.WaitlistUncheckedCreateInput, "salonId">
) {
  const { randomUUID } = await import("crypto")
  return prisma.waitlist.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function deleteWaitlistRecord(id: string, salonId: string): Promise<void> {
  await prisma.waitlist.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.waitlist.delete({ where: { id } })
}
