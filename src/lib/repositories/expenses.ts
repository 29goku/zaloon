import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type ExpenseFilter = {
  category?: string
  from?: string
  to?: string
  limit?: number
}

export async function getExpenses(salonId: string, filter?: ExpenseFilter) {
  const where: Prisma.ExpenseWhereInput = { salonId }
  if (filter?.category) where.category = filter.category
  if (filter?.from || filter?.to) {
    where.date = {}
    if (filter.from) where.date.gte = filter.from
    if (filter.to) where.date.lte = filter.to
  }
  return prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    take: filter?.limit,
  })
}

export async function createExpenseRecord(
  salonId: string,
  data: Omit<Prisma.ExpenseUncheckedCreateInput, "salonId">
) {
  const { randomUUID } = await import("crypto")
  return prisma.expense.create({ data: { ...data, id: data.id ?? randomUUID(), salonId } })
}

export async function updateExpenseRecord(
  id: string,
  salonId: string,
  data: Prisma.ExpenseUpdateInput
) {
  await prisma.expense.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  return prisma.expense.update({ where: { id }, data })
}

export async function deleteExpenseRecord(id: string, salonId: string): Promise<void> {
  await prisma.expense.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.expense.delete({ where: { id } })
}
