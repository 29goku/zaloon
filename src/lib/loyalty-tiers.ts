export interface LoyaltyTier {
  name: string;
  minPoints: number;
  color: string;
  benefits: string[];
  discountPct: number;
  pointMultiplier: number;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    name: "Bronze",
    minPoints: 0,
    color: "amber-600",
    benefits: ["1 point per $1 spent"],
    discountPct: 0,
    pointMultiplier: 1,
  },
  {
    name: "Silver",
    minPoints: 500,
    color: "slate-400",
    benefits: ["1.25x points", "5% birthday discount"],
    discountPct: 0,
    pointMultiplier: 1.25,
  },
  {
    name: "Gold",
    minPoints: 1500,
    color: "yellow-500",
    benefits: ["1.5x points", "10% off all services"],
    discountPct: 10,
    pointMultiplier: 1.5,
  },
  {
    name: "Platinum",
    minPoints: 5000,
    color: "purple-500",
    benefits: ["2x points", "15% off", "Priority booking"],
    discountPct: 15,
    pointMultiplier: 2,
  },
];

export function getClientTier(points: number): LoyaltyTier {
  // Walk tiers from highest to lowest and return the first one the client qualifies for
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (points >= LOYALTY_TIERS[i].minPoints) {
      return LOYALTY_TIERS[i];
    }
  }
  return LOYALTY_TIERS[0];
}

export function getPointsToNextTier(points: number): number | null {
  for (let i = 0; i < LOYALTY_TIERS.length; i++) {
    if (points < LOYALTY_TIERS[i].minPoints) {
      return LOYALTY_TIERS[i].minPoints - points;
    }
  }
  // Already at the highest tier
  return null;
}

/** $0.01 per point — returns the dollar discount amount */
export function pointsToDiscount(
  _points: number,
  pointsToRedeem: number
): number {
  return pointsToRedeem * 0.01;
}
