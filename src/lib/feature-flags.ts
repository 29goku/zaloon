export const FEATURES = {
  FINANCE: process.env.NEXT_PUBLIC_FEATURE_FINANCE === "true",
  REPORTS: process.env.NEXT_PUBLIC_FEATURE_REPORTS === "true",
  OPERATIONS: process.env.NEXT_PUBLIC_FEATURE_OPERATIONS === "true",
} as const;
