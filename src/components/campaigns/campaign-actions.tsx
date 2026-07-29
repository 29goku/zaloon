"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { launchCampaign, pauseCampaign, deleteCampaign } from "@/app/actions/campaigns";

interface CampaignActionsProps {
  id: string;
  status: string;
  name: string;
}

export function CampaignActions({ id, status, name }: CampaignActionsProps) {
  const router = useRouter();
  const [launching, setLaunching] = React.useState(false);
  const [pausing, setPausing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handleLaunch() {
    if (!confirm(`Launch campaign "${name}" now? This will simulate sending to all recipients.`)) return;
    setLaunching(true);
    try {
      const result = await launchCampaign(id);
      if (!result.success) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setLaunching(false);
    }
  }

  async function handlePause() {
    if (!confirm(`Pause campaign "${name}"?`)) return;
    setPausing(true);
    try {
      const result = await pauseCampaign(id);
      if (!result.success) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setPausing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const result = await deleteCampaign(id);
      if (!result.success) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  const busy = launching || pausing || deleting;

  return (
    <div className="flex items-center justify-end gap-2">
      {/* Launch: available for DRAFT and PAUSED */}
      {(status === "DRAFT" || status === "PAUSED") && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs gap-1.5"
          onClick={handleLaunch}
          disabled={busy}
          title="Launch campaign"
        >
          {launching ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">Launch</span>
        </Button>
      )}

      {/* Pause: available for ACTIVE */}
      {status === "ACTIVE" && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs gap-1.5"
          onClick={handlePause}
          disabled={busy}
          title="Pause campaign"
        >
          {pausing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Pause className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">Pause</span>
        </Button>
      )}

      {/* Send icon for ACTIVE to show it's launched */}
      {status === "ACTIVE" && (
        <span className="text-xs text-primary font-medium hidden sm:inline-flex items-center gap-1">
          <Send className="w-3 h-3" />
          Live
        </span>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={busy}
        title="Delete campaign"
      >
        {deleting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
      </Button>
    </div>
  );
}
