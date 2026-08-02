import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type ReviewFilter = { staffId?: string; minRating?: number; limit?: number }

export async function getReviews(salonId: string, filter?: ReviewFilter) {
  const where: Prisma.ReviewWhereInput = { salonId }
  if (filter?.staffId) where.staffId = filter.staffId
  if (filter?.minRating) where.rating = { gte: filter.minRating }
  return prisma.review.findMany({
    where,
    include: { Client: true, Staff: true, Appointment: true },
    orderBy: { createdAt: "desc" },
    take: filter?.limit,
  })
}

export async function getAverageRating(salonId: string): Promise<number> {
  const result = await prisma.review.aggregate({
    where: { salonId },
    _avg: { rating: true },
  })
  return result._avg.rating ?? 0
}

export async function getRatingDistribution(salonId: string): Promise<Record<number, number>> {
  const reviews = await prisma.review.findMany({ where: { salonId }, select: { rating: true } })
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) {
    const key = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5
    if (key >= 1 && key <= 5) dist[key]++
  }
  return dist
}

export async function updateReviewRecord(
  id: string,
  salonId: string,
  data: Prisma.ReviewUpdateInput
) {
  await prisma.review.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  return prisma.review.update({ where: { id }, data })
}

export async function deleteReviewRecord(id: string, salonId: string): Promise<void> {
  await prisma.review.findFirstOrThrow({ where: { id, salonId }, select: { id: true } })
  await prisma.review.delete({ where: { id } })
}
