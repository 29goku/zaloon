import { PrismaClient } from "@prisma/client";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  color: string; // Tailwind color class
  tier: "bronze" | "silver" | "gold" | "platinum";
  criteria: {
    type: "appointments" | "revenue" | "reviews" | "streak" | "rating";
    threshold: number;
    period?: "all_time" | "month" | "week";
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_10",
    name: "Getting Started",
    description: "Complete your first 10 appointments",
    icon: "🌱",
    color: "from-amber-700/30 to-amber-900/20 border-amber-700/30",
    tier: "bronze",
    criteria: { type: "appointments", threshold: 10, period: "all_time" },
  },
  {
    id: "first_100",
    name: "Century Club",
    description: "Complete 100 appointments all time",
    icon: "💯",
    color: "from-slate-400/30 to-slate-600/20 border-slate-400/30",
    tier: "silver",
    criteria: { type: "appointments", threshold: 100, period: "all_time" },
  },
  {
    id: "first_500",
    name: "Veteran",
    description: "Complete 500 appointments all time",
    icon: "⭐",
    color: "from-amber-400/30 to-amber-600/20 border-amber-400/30",
    tier: "gold",
    criteria: { type: "appointments", threshold: 500, period: "all_time" },
  },
  {
    id: "rev_1k_month",
    name: "Money Maker",
    description: "Generate $1,000 revenue in a single month",
    icon: "💰",
    color: "from-slate-400/30 to-slate-600/20 border-slate-400/30",
    tier: "silver",
    criteria: { type: "revenue", threshold: 1000, period: "month" },
  },
  {
    id: "rev_5k_month",
    name: "Top Earner",
    description: "Generate $5,000 revenue in a single month",
    icon: "🏆",
    color: "from-amber-400/30 to-amber-600/20 border-amber-400/30",
    tier: "gold",
    criteria: { type: "revenue", threshold: 5000, period: "month" },
  },
  {
    id: "five_star",
    name: "5-Star All Month",
    description: "Maintain a 4.9+ average rating for a month",
    icon: "⭐",
    color: "from-amber-400/30 to-amber-600/20 border-amber-400/30",
    tier: "gold",
    criteria: { type: "rating", threshold: 4.9, period: "month" },
  },
  {
    id: "ten_reviews",
    name: "Review Collector",
    description: "Earn 10 reviews from clients",
    icon: "📝",
    color: "from-amber-700/30 to-amber-900/20 border-amber-700/30",
    tier: "bronze",
    criteria: { type: "reviews", threshold: 10, period: "all_time" },
  },
  {
    id: "perfect_week",
    name: "Perfect Week",
    description: "Complete 20 appointments in a single week",
    icon: "🎯",
    color: "from-slate-400/30 to-slate-600/20 border-slate-400/30",
    tier: "silver",
    criteria: { type: "appointments", threshold: 20, period: "week" },
  },
];

export const TIER_POINTS: Record<Achievement["tier"], number> = {
  bronze: 25,
  silver: 50,
  gold: 100,
  platinum: 200,
};

/** Calculate the points for a staff member based on their stats. */
export function calcPoints(params: {
  appointments: number;
  revenue: number;
  fiveStarReviews: number;
  earnedAchievements: Achievement[];
}): number {
  const { appointments, revenue, fiveStarReviews, earnedAchievements } = params;
  let pts = 0;
  pts += appointments * 1;
  pts += Math.floor(revenue / 100) * 10;
  pts += fiveStarReviews * 5;
  for (const a of earnedAchievements) {
    pts += TIER_POINTS[a.tier];
  }
  return pts;
}

export async function calculateAchievements(
  prismaClient: PrismaClient,
  staffId: string
): Promise<{ earned: Achievement[]; progress: Record<string, number> }> {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Start of current week (Sunday)
  const startOfWeekDate = new Date(today);
  startOfWeekDate.setDate(today.getDate() - today.getDay());
  const startOfWeek = startOfWeekDate.toISOString().split("T")[0];
  const endOfWeekDate = new Date(startOfWeekDate);
  endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
  const endOfWeek = endOfWeekDate.toISOString().split("T")[0];

  const [allTimeAppts, monthAppts, weekAppts, reviews, monthReviews] =
    await Promise.all([
      prismaClient.appointment.count({
        where: { staffId, status: "COMPLETED" },
      }),
      prismaClient.appointment.findMany({
        where: {
          staffId,
          status: "COMPLETED",
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { totalAmount: true },
      }),
      prismaClient.appointment.count({
        where: {
          staffId,
          status: "COMPLETED",
          date: { gte: startOfWeek, lte: endOfWeek },
        },
      }),
      prismaClient.review.count({
        where: { staffId },
      }),
      prismaClient.review.findMany({
        where: {
          staffId,
          createdAt: { gte: new Date(startOfMonth), lte: new Date(endOfMonth) },
        },
        select: { rating: true },
      }),
    ]);

  const monthRevenue = monthAppts.reduce((s, a) => s + a.totalAmount, 0);
  const monthAvgRating =
    monthReviews.length > 0
      ? monthReviews.reduce((s, r) => s + r.rating, 0) / monthReviews.length
      : 0;

  const progress: Record<string, number> = {
    first_10: allTimeAppts,
    first_100: allTimeAppts,
    first_500: allTimeAppts,
    rev_1k_month: monthRevenue,
    rev_5k_month: monthRevenue,
    five_star: monthAvgRating,
    ten_reviews: reviews,
    perfect_week: weekAppts,
  };

  const earned = ACHIEVEMENTS.filter((a) => {
    const val = progress[a.id] ?? 0;
    return val >= a.criteria.threshold;
  });

  return { earned, progress };
}
