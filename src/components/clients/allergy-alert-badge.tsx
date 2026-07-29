"use client";

import { AlertTriangle } from "lucide-react";

interface AllergyAlertBadgeProps {
  /** The parsed preferences object for the client */
  preferences: Record<string, unknown> | null | undefined;
  /** Additional class names for the wrapper */
  className?: string;
}

/**
 * Reads `preferences.allergies` (string or string[]) and renders a red
 * alert badge when allergies are present.  Safe to render unconditionally —
 * returns null when there are no allergies.
 */
export function AllergyAlertBadge({
  preferences,
  className,
}: AllergyAlertBadgeProps) {
  if (!preferences) return null;

  const raw = preferences.allergies;
  let allergyList: string[] = [];

  if (Array.isArray(raw)) {
    allergyList = (raw as unknown[])
      .filter((a): a is string => typeof a === "string" && a.trim() !== "")
      .map((a) => a.trim());
  } else if (typeof raw === "string" && raw.trim()) {
    allergyList = [raw.trim()];
  }

  if (allergyList.length === 0) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-[#F41666]/40 bg-[#F41666]/10 px-3 py-2 ${className ?? ""}`}
    >
      <AlertTriangle className="w-4 h-4 text-[#F41666] flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <span className="text-xs font-semibold text-[#F41666]">Allergies: </span>
        <span className="text-xs text-[#F41666]/80">{allergyList.join(", ")}</span>
      </div>
    </div>
  );
}
