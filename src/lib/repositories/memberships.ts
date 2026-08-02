import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function getMembershipPlans(salonId: string) {
  return prisma.membershipPlan.findMany({ where: { salonId }, orderBy: { name: "asc" } })
}

export async function createMembershipPlanRecord(
  salonId: string,
  data: Omit<Prisma.MembershipPlanUncheckedCreateInput, "salonId">
) {
  const { randomUUID } = await import("crypto")
  return prisma.membershipPlan.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateMembershipPlanRecord(
  id: string,
  salonId: string,
  data: Prisma.MembershipPlanUpdateInput
) {
  await prisma.membershipPlan.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  return prisma.membershipPlan.update({ where: { id }, data })
}

export async function deleteMembershipPlanRecord(id: string, salonId: string): Promise<void> {
  await prisma.membershipPlan.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.membershipPlan.delete({ where: { id } })
}

export async function getClientMemberships(salonId: string, clientId?: string) {
  return prisma.clientMembership.findMany({
    where: { Plan: { salonId }, ...(clientId ? { clientId } : {}) },
    include: { Plan: true, Client: true },
    orderBy: { startDate: "desc" },
  })
}

export async function createClientMembershipRecord(
  data: Prisma.ClientMembershipUncheckedCreateInput
) {
  const { randomUUID } = await import("crypto")
  return prisma.clientMembership.create({ data: { ...data, id: data.id ?? randomUUID() } })
}

export async function updateClientMembershipRecord(
  id: string,
  data: Prisma.ClientMembershipUpdateInput
) {
  return prisma.clientMembership.update({ where: { id }, data })
}
