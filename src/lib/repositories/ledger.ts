import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function createLedgerEntryRecord(
  data: Prisma.LedgerEntryUncheckedCreateInput
) {
  const { randomUUID } = await import("crypto")
  return prisma.ledgerEntry.create({ data: { ...data, id: data.id ?? randomUUID() } })
}

export async function deleteLedgerEntryRecord(id: string): Promise<void> {
  await prisma.ledgerEntry.delete({ where: { id } })
}

export async function getLedgerEntriesByClient(clientId: string) {
  return prisma.ledgerEntry.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } })
}
