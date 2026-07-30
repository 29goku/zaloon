export type LoyaltyTierName = "Bronze" | "Silver" | "Gold" | "Platinum";

export function getLoyaltyTier(points: number): LoyaltyTierName {
  if (points >= 5000) return "Platinum";
  if (points >= 1500) return "Gold";
  if (points >= 500) return "Silver";
  return "Bronze";
}
