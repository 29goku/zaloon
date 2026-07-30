"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCampaign } from "@/app/actions/campaigns";
import { InlineConfirm } from "@/components/ui/inline-confirm";

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
  const [done, setDone] = React.useState(false);

  const nonOpenersCount = Math.max(0, recipientCount - openCount);

  if (nonOpenersCount === 0) return null;

  return (
    <InlineConfirm
      message={`Create a new draft campaign targeting the ~${nonOpenersCount} non-openers of "${name}"?`}
      confirmLabel="Create Draft"
      confirmClassName="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
      onConfirm={async () => {
        const result = await createCampaign({
          name: `${name} — Resend (non-openers)`,
          type: "CUSTOM",
          message,
          channel,
          subject: channel === "EMAIL" ? subject : null,
          targetFilter,
          scheduledAt: null,
        });
        if (!result.success) throw new Error(result.error ?? "Failed to create draft");
        setDone(true);
        router.refresh();
        setTimeout(() => {
          router.push(`/dashboard/campaigns/${result.id}`);
        }, 800);
      }}
      trigger={
        <Button variant="outline" disabled={done} className="gap-2 w-fit">
          <RefreshCw className="w-4 h-4" />
          {done
            ? "Draft created! Redirecting…"
            : `Resend to ~${nonOpenersCount.toLocaleString()} non-openers`}
        </Button>
      }
    />
  );
}
