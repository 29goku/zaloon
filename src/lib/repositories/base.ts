import "server-only"
import { prisma } from "@/lib/prisma"

export type SalonContext = { salonId: string }

export async function getCurrentSalonId(): Promise<string> {
  const salon = await prisma.salon.findFirstOrThrow({ select: { id: true } })
  return salon.id
}

export async function getSalonBySlug(slug: string): Promise<{ id: string; slug: string; name: string }> {
  const salon = await prisma.salon.findUniqueOrThrow({
    where: { slug },
    select: { id: true, slug: true, name: true },
  })
  return salon
}
