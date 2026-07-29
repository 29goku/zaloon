"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCampaign } from "@/app/actions/campaigns";

interface ResendToNonOpenersButtonProps {
  originalId: string;
  name: string;
  message: string;
  channel: string;
  subject: string | null;
  targetFilter: string | null;
  recipientCount: number;
  openCount: number;
}

export function ResendToNonOpenersButton({
  name,
  message,
  channel,
  subject,
  targetFilter,
  recipientCount,
  openCount,
}: ResendToNonOpenersButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const nonOpenersCount = Math.max(0, recipientCount - openCount);

  async function handleResend() {
    if (nonOpenersCount === 0) return;
    if (
      !confirm(
        `Create a new draft campaign targeting the ~${nonOpenersCount} non-openers of "${name}"?`
      )
    )
      return;

    setLoading(true);
    setError(null);

    try {
      const result = await createCampaign({
        name: `${name} — Resend (non-openers)`,
        type: "CUSTOM",
        message,
        channel,
        subject: channel === "EMAIL" ? subject : null,
        targetFilter,
        scheduledAt: null,
      });

      if (!result.success) {
        setError(result.error);
      } else {
        setDone(true);
        router.refresh();
        // Navigate to the new draft after a brief pause
        setTimeout(() => {
          router.push(`/dashboard/campaigns/${result.id}`);
        }, 800);
      }
    } finally {
      setLoading(false);
    }
  }

  if (nonOpenersCount === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        onClick={handleResend}
        disabled={loading || done}
        className="gap-2 w-fit"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating draft…
          </>
        ) : done ? (
          <>
            <RefreshCw className="w-4 h-4" />
            Draft created! Redirecting…
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Resend to ~{nonOpenersCount.toLocaleString()} non-openers
          </>
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
