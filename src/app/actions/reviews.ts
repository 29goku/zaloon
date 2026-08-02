"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseReviewContent, RESPONSE_SEPARATOR, FLAGGED_MARKER } from "@/lib/review-utils";
import { getCurrentSalonId } from "@/lib/repositories/base";


// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewWithRelations = {
  id: string;
  rating: number;
  comment: string | null;
  isPublic: boolean;
  createdAt: Date;
  Client: { id: string; name: string } | null;
  Staff: { id: string; name: string } | null;
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createReviewSchema = z.object({
  clientId: z.string().optional(),
  appointmentId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  staffId: z.string().optional(),
  isPublic: z.boolean().optional().default(true),
  // Extended satisfaction survey fields — stored as JSON in the comment field
  wouldRecommend: z.boolean().optional(),
  serviceRating: z.number().int().min(1).max(5).optional(),
  cleanlinessRating: z.number().int().min(1).max(5).optional(),
  staffRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ─── createReview ─────────────────────────────────────────────────────────────

export async function createReview(
  data: CreateReviewInput
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createReviewSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const {
    clientId,
    appointmentId,
    rating,
    comment,
    staffId,
    isPublic,
    wouldRecommend,
    serviceRating,
    cleanlinessRating,
    staffRating,
    valueRating,
  } = parsed.data;

  // Build the stored comment — if any survey extras are present, serialize as JSON
  // so they can be parsed back for analytics. Plain text falls back gracefully.
  let storedComment: string | null = comment ?? null;
  const hasSurveyData =
    wouldRecommend !== undefined ||
    serviceRating !== undefined ||
    cleanlinessRating !== undefined ||
    staffRating !== undefined ||
    valueRating !== undefined;

  if (hasSurveyData) {
    const payload: Record<string, unknown> = {};
    if (comment) payload.text = comment;
    if (wouldRecommend !== undefined) payload.wouldRecommend = wouldRecommend;
    if (serviceRating !== undefined) payload.serviceRating = serviceRating;
    if (cleanlinessRating !== undefined) payload.cleanlinessRating = cleanlinessRating;
    if (staffRating !== undefined) payload.staffRating = staffRating;
    if (valueRating !== undefined) payload.valueRating = valueRating;
    storedComment = JSON.stringify(payload);
  }

  try {
    const salonId = await getCurrentSalonId();

    // Prevent duplicate review for the same appointment
    if (appointmentId) {
      const existing = await prisma.review.findUnique({
        where: { appointmentId },
      });
      if (existing) {
        return { success: false, error: "A review for this appointment already exists" };
      }
    }

    const review = await prisma.review.create({
      data: {
        id: randomUUID(),
        salonId,
        clientId: clientId ?? null,
        appointmentId: appointmentId ?? null,
        rating,
        comment: storedComment,
        staffId: staffId ?? null,
        isPublic: isPublic ?? true,
      },
    });

    revalidatePath("/dashboard/reviews");
    return { success: true, id: review.id };
  } catch (err) {
    console.error("[createReview]", err);
    return { success: false, error: "Failed to create review" };
  }
}

// ─── getReviews ───────────────────────────────────────────────────────────────

export async function getReviews(filter?: {
  staffId?: string;
  minRating?: number;
}): Promise<ReviewWithRelations[]> {
  const salonId = await getCurrentSalonId();
  return prisma.review.findMany({
    where: {
      salonId,
      ...(filter?.staffId ? { staffId: filter.staffId } : {}),
      ...(filter?.minRating ? { rating: { gte: filter.minRating } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      Client: { select: { id: true, name: true } },
      Staff: { select: { id: true, name: true } },
    },
  });
}

// ─── deleteReview ─────────────────────────────────────────────────────────────

export async function deleteReview(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing review id" };

  try {
    await prisma.review.delete({ where: { id } });
    revalidatePath("/dashboard/reviews");
    return { success: true };
  } catch (err) {
    console.error("[deleteReview]", err);
    return { success: false, error: "Failed to delete review" };
  }
}

// ─── getAverageRating ─────────────────────────────────────────────────────────

export async function getAverageRating(staffId?: string): Promise<number | null> {
  const salonId = await getCurrentSalonId();
  const result = await prisma.review.aggregate({
    _avg: { rating: true },
    where: staffId ? { salonId, staffId } : { salonId },
  });
  return result._avg.rating;
}

// ─── getRatingDistribution ────────────────────────────────────────────────────

export async function getRatingDistribution(): Promise<Record<number, number>> {
  const salonId = await getCurrentSalonId();
  const counts = await prisma.review.groupBy({
    by: ["rating"],
    where: { salonId },
    _count: { rating: true },
  });

  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of counts) {
    dist[row.rating] = row._count.rating;
  }
  return dist;
}

// ─── respondToReview ──────────────────────────────────────────────────────────

export async function respondToReview(
  reviewId: string,
  response: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!reviewId) return { success: false, error: "Missing review id" };
  if (!response?.trim()) return { success: false, error: "Response cannot be empty" };

  try {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return { success: false, error: "Review not found" };

    const { clientComment, isFlagged } = parseReviewContent(review.comment);
    const baseComment = clientComment ?? "";
    const flagPart = isFlagged ? `\n${FLAGGED_MARKER}` : "";

    const newComment = `${baseComment}${RESPONSE_SEPARATOR}${response.trim()}${flagPart}`;

    await prisma.review.update({
      where: { id: reviewId },
      data: { comment: newComment },
    });

    revalidatePath("/dashboard/reviews");
    return { success: true };
  } catch (err) {
    console.error("[respondToReview]", err);
    return { success: false, error: "Failed to save response" };
  }
}

// ─── updateReviewVisibility ───────────────────────────────────────────────────

export async function updateReviewVisibility(
  reviewId: string,
  isPublic: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  if (!reviewId) return { success: false, error: "Missing review id" };

  try {
    await prisma.review.update({
      where: { id: reviewId },
      data: { isPublic },
    });
    revalidatePath("/dashboard/reviews");
    return { success: true };
  } catch (err) {
    console.error("[updateReviewVisibility]", err);
    return { success: false, error: "Failed to update visibility" };
  }
}

// ─── flagReview ───────────────────────────────────────────────────────────────

export async function flagReview(
  reviewId: string,
  reason: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!reviewId) return { success: false, error: "Missing review id" };

  try {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return { success: false, error: "Review not found" };

    const base = review.comment ?? "";
    // Avoid double-flagging
    if (base.includes(FLAGGED_MARKER)) {
      return { success: true };
    }

    const newComment = `${base}\n${FLAGGED_MARKER}${reason.trim()}`;
    await prisma.review.update({
      where: { id: reviewId },
      data: { comment: newComment },
    });

    revalidatePath("/dashboard/reviews");
    return { success: true };
  } catch (err) {
    console.error("[flagReview]", err);
    return { success: false, error: "Failed to flag review" };
  }
}
