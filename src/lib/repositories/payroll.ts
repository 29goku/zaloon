import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function getPayrollRecords(salonId: string, from: Date, to: Date) {
  return prisma.payrollRecord.findMany({
    where: { salonId, periodStart: { gte: from }, periodEnd: { lte: to } },
    include: { Staff: true },
    orderBy: { periodStart: "desc" },
  })
}

export async function savePayrollRecord(
  salonId: string,
  data: Omit<Prisma.PayrollRecordUncheckedCreateInput, "salonId">
) {
  const { randomUUID } = await import("crypto")
  const id = data.id ?? randomUUID()
  return prisma.payrollRecord.upsert({
    where: { id },
    create: { ...data, id, salonId },
    update: { ...data, salonId },
  })
}
