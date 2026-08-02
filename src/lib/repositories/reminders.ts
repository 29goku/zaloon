import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type ReminderFilter = { status?: string; type?: string; limit?: number }

export async function getReminders(salonId: string, filter?: ReminderFilter) {
  const where: Prisma.ReminderWhereInput = { salonId }
  if (filter?.status) where.status = filter.status
  if (filter?.type) where.type = filter.type
  return prisma.reminder.findMany({
    where,
    include: { Appointment: { include: { Client: true } } },
    orderBy: { scheduledAt: "asc" },
    take: filter?.limit,
  })
}

export async function getPendingReminderCount(salonId: string): Promise<number> {
  return prisma.reminder.count({ where: { salonId, status: "PENDING" } })
}

export async function createReminderRecord(
  salonId: string,
  data: Omit<Prisma.ReminderUncheckedCreateInput, "salonId">
) {
  const { randomUUID } = await import("crypto")
  return prisma.reminder.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateReminderRecord(
  id: string,
  salonId: string,
  data: Prisma.ReminderUpdateInput
) {
  await prisma.reminder.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  return prisma.reminder.update({ where: { id }, data })
}

export async function deleteReminderRecord(id: string, salonId: string): Promise<void> {
  await prisma.reminder.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.reminder.delete({ where: { id } })
}
