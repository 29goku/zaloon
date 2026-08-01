import "server-only";
import { get } from "@vercel/edge-config";

export type Features = {
  FINANCE: boolean;
  REPORTS: boolean;
  OPERATIONS: boolean;
};

export async function getFeatures(): Promise<Features> {
  try {
    const [finance, reports, operations] = await Promise.all([
      get<boolean>("feature_finance"),
      get<boolean>("feature_reports"),
      get<boolean>("feature_operations"),
    ]);
    return {
      FINANCE: finance ?? false,
      REPORTS: reports ?? false,
      OPERATIONS: operations ?? false,
    };
  } catch {
    // Edge Config unavailable (e.g. local dev without EDGE_CONFIG set)
    return {
      FINANCE: process.env.NEXT_PUBLIC_FEATURE_FINANCE === "true",
      REPORTS: process.env.NEXT_PUBLIC_FEATURE_REPORTS === "true",
      OPERATIONS: process.env.NEXT_PUBLIC_FEATURE_OPERATIONS === "true",
    };
  }
}
