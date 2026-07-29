"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCampaignAndSend } from "@/app/actions/campaigns";

interface QuickClientCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientIds: string[];
  clientCount: number;
}

export function QuickClientCampaignDialog({
  open,
  onOpenChange,
  clientIds,
  clientCount,
}: QuickClientCampaignDialogProps) {
  const router = useRouter();
  const [channel, setChannel] = React.useState<"SMS" | "EMAIL">("SMS");
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleClose() {
    if (loading) return;
    setMessage("");
    setError(null);
    onOpenChange(false);
  }

  async function handleSend() {
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const targetFilter = JSON.stringify({
        filter: "custom",
        clientIds,
      });

      const result = await createCampaignAndSend({
        name: `Quick campaign — ${clientCount} client${clientCount !== 1 ? "s" : ""}`,
        type: "CUSTOM",
        message: message.trim(),
        channel,
        targetFilter,
        recipientCount: clientCount,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
      handleClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Campaign for {clientCount} client{clientCount !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Channel picker */}
          <div className="flex flex-col gap-1.5">
            <Label>Channel</Label>
            <div className="flex gap-2">
              {(["SMS", "EMAIL"] as const).map((ch) => (
                <label
                  key={ch}
                  className={`flex-1 flex items-center justify-center p-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                    channel === ch
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    value={ch}
                    checked={channel === ch}
                    onChange={() => setChannel(ch)}
                  />
                  {ch === "SMS" ? "SMS" : "Email"}
                </label>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-msg">Message</Label>
            <Textarea
              id="quick-msg"
              placeholder={`Hi! We have a special offer just for you. Visit us soon at ${channel === "SMS" ? "our salon" : "Zaloon"}!`}
              className="resize-none min-h-[120px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span />
              <p
                className={`text-xs tabular-nums ${
                  message.length > 160 && channel === "SMS"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}
              >
                {message.length}
                {channel === "SMS" ? " / 160" : ""}
              </p>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="rounded-xl bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
            This will create a campaign record marked as sent to the {clientCount} selected client{clientCount !== 1 ? "s" : ""}.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSend} disabled={loading || !message.trim()} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
