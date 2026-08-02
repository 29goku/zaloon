import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type InvoiceFilter = {
  status?: string
  clientId?: string
  from?: Date
  to?: Date
  limit?: number
}

export async function getInvoices(salonId: string, filter?: InvoiceFilter) {
  const where: Prisma.InvoiceWhereInput = { salonId }
  if (filter?.status) where.status = filter.status
  if (filter?.clientId) where.clientId = filter.clientId
  if (filter?.from || filter?.to) {
    where.createdAt = {}
    if (filter.from) where.createdAt.gte = filter.from
    if (filter.to) where.createdAt.lte = filter.to
  }
  return prisma.invoice.findMany({
    where,
    include: { Client: true, InvoiceItem: true, PartialPayment: true },
    orderBy: { createdAt: "desc" },
    take: filter?.limit,
  })
}

export async function getInvoiceById(id: string, salonId: string) {
  return prisma.invoice.findFirst({
    where: { id, salonId },
    include: { Client: true, InvoiceItem: true, PartialPayment: true },
  })
}

export async function updateInvoiceRecord(
  id: string,
  salonId: string,
  data: Prisma.InvoiceUpdateInput
) {
  // Verify ownership before updating
  const existing = await prisma.invoice.findFirst({ where: { id, salonId } })
  if (!existing) return null
  return prisma.invoice.update({ where: { id }, data })
}

export async function deleteInvoiceRecord(id: string, salonId: string): Promise<void> {
  // Verify ownership before deleting (delete only accepts unique fields)
  const existing = await prisma.invoice.findFirst({ where: { id, salonId } })
  if (!existing) return
  await prisma.invoice.delete({ where: { id } })
}
