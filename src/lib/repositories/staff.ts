import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function getStaff(salonId: string) {
  return prisma.staff.findMany({
    where: { salonId },
    include: { StaffService: { include: { Service: true } }, Shift: true },
    orderBy: { name: "asc" },
  })
}

export async function getStaffById(id: string, salonId: string) {
  return prisma.staff.findFirst({
    where: { id, salonId },
    include: { StaffService: { include: { Service: true } }, Shift: true },
  })
}

export async function createStaffRecord(
  salonId: string,
  data: Omit<Prisma.StaffUncheckedCreateInput, "salonId">
) {
  return prisma.staff.create({ data: { ...data, salonId } })
}

export async function updateStaffRecord(
  id: string,
  salonId: string,
  data: Prisma.StaffUpdateInput
) {
  await prisma.staff.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  return prisma.staff.update({ where: { id }, data })
}

export async function deleteStaffRecord(id: string, salonId: string): Promise<void> {
  await prisma.staff.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.staff.delete({ where: { id } })
}

export async function getShiftsByStaff(staffId: string) {
  return prisma.shift.findMany({ where: { staffId }, orderBy: { dayOfWeek: "asc" } })
}

export async function getShiftsBySalon(salonId: string) {
  return prisma.shift.findMany({
    where: { Staff: { salonId } },
    include: { Staff: true },
  })
}

export async function getTimeOffBySalon(salonId: string) {
  return prisma.timeOff.findMany({
    where: { Staff: { salonId } },
    include: { Staff: true },
    orderBy: { startDate: "asc" },
  })
}
