import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function getAppointments(
  salonId: string,
  filter?: { date?: string; staffId?: string; status?: string }
) {
  const where: Prisma.AppointmentWhereInput = { salonId }
  if (filter?.status) where.status = filter.status
  if (filter?.staffId) {
    where.AppointmentService = { some: { staffId: filter.staffId } }
  }
  if (filter?.date) {
    where.date = filter.date
  }
  return prisma.appointment.findMany({
    where,
    include: {
      Client: true,
      Staff: true,
      AppointmentService: { include: { Service: true, Staff: true } },
    },
    orderBy: { startTime: "asc" },
  })
}

export async function getAppointmentById(id: string, salonId: string) {
  return prisma.appointment.findFirst({
    where: { id, salonId },
    include: {
      Client: true,
      Staff: true,
      AppointmentService: { include: { Service: true, Staff: true } },
    },
  })
}

export async function updateAppointmentRecord(
  id: string,
  salonId: string,
  data: Prisma.AppointmentUpdateInput
) {
  // Verify ownership before updating
  const existing = await prisma.appointment.findFirst({ where: { id, salonId } })
  if (!existing) return null
  return prisma.appointment.update({
    where: { id },
    data,
  })
}

export async function deleteAppointmentRecord(id: string, salonId: string): Promise<void> {
  // Verify ownership before deleting (delete only accepts unique fields)
  const existing = await prisma.appointment.findFirst({ where: { id, salonId } })
  if (!existing) return
  await prisma.appointment.delete({ where: { id } })
}
