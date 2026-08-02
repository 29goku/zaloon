import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function getCampaigns(salonId: string) {
  return prisma.campaign.findMany({ where: { salonId }, orderBy: { createdAt: "desc" } })
}

export async function getCampaignById(id: string, salonId: string) {
  return prisma.campaign.findFirst({ where: { id, salonId } })
}

export async function createCampaignRecord(
  salonId: string,
  data: Omit<Prisma.CampaignUncheckedCreateInput, "salonId">
) {
  const { randomUUID } = await import("crypto")
  return prisma.campaign.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateCampaignRecord(
  id: string,
  salonId: string,
  data: Prisma.CampaignUpdateInput
) {
  await prisma.campaign.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  return prisma.campaign.update({ where: { id }, data })
}

export async function deleteCampaignRecord(id: string, salonId: string): Promise<void> {
  await prisma.campaign.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.campaign.delete({ where: { id } })
}
