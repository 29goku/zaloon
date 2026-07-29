"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export interface AllergyAlertBannerProps {
  alertTexts: string[];
}

export function AllergyAlertBanner({ alertTexts }: AllergyAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alertTexts.length === 0) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-400">Allergy / Medical Alert</p>
        <p className="text-sm text-amber-400/80 mt-0.5 leading-relaxed">
          {alertTexts.join(" | ")}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="w-6 h-6 rounded-md flex items-center justify-center text-amber-400/60 hover:text-amber-400 hover:bg-amber-400/10 transition-colors flex-shrink-0"
        aria-label="Dismiss alert"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
