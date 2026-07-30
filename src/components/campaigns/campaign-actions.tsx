"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { launchCampaign, pauseCampaign, deleteCampaign } from "@/app/actions/campaigns";
import { InlineConfirm } from "@/components/ui/inline-confirm";

interface CampaignActionsProps {
  id: string;
  status: string;
  name: string;
}

export function CampaignActions({ id, status, name }: CampaignActionsProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-end gap-2">
      {/* Launch: available for DRAFT and PAUSED */}
      {(status === "DRAFT" || status === "PAUSED") && (
        <InlineConfirm
          message={`Launch campaign "${name}" now? This will simulate sending to all recipients.`}
          confirmLabel="Launch"
          confirmClassName="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
          onConfirm={async () => {
            const result = await launchCampaign(id);
            if (!result.success) throw new Error(result.error ?? "Failed to launch");
            router.refresh();
          }}
          trigger={
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1.5" title="Launch campaign">
              <Play className="w-3 h-3" />
              <span className="hidden sm:inline">Launch</span>
            </Button>
          }
        />
      )}

      {/* Pause: available for ACTIVE */}
      {status === "ACTIVE" && (
        <InlineConfirm
          message={`Pause campaign "${name}"?`}
          confirmLabel="Pause"
          confirmClassName="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
          onConfirm={async () => {
            const result = await pauseCampaign(id);
            if (!result.success) throw new Error(result.error ?? "Failed to pause");
            router.refresh();
          }}
          trigger={
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1.5" title="Pause campaign">
              <Pause className="w-3 h-3" />
              <span className="hidden sm:inline">Pause</span>
            </Button>
          }
        />
      )}

      {/* Send icon for ACTIVE to show it's launched */}
      {status === "ACTIVE" && (
        <span className="text-xs text-primary font-medium hidden sm:inline-flex items-center gap-1">
          <Send className="w-3 h-3" />
          Live
        </span>
      )}

      <InlineConfirm
        message={`Delete campaign "${name}"? This cannot be undone.`}
        onConfirm={async () => {
          const result = await deleteCampaign(id);
          if (!result.success) throw new Error(result.error ?? "Failed to delete");
          router.refresh();
        }}
        trigger={
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            title="Delete campaign"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        }
      />
    </div>
  );
}
