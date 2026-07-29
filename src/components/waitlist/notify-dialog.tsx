"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bell, Loader2, MessageSquare } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { notifyWaitlistEntry } from "@/app/actions/waitlist";

interface NotifyDialogProps {
  id: string;
  entry: {
    name: string;
    phone: string | null;
    serviceName: string | null;
    slotDate?: string | null;
    slotTime?: string | null;
  };
  bookingLink?: string;
}

function buildDefaultMessage(
  name: string,
  serviceName: string | null,
  slotDate: string | null | undefined,
  slotTime: string | null | undefined,
  bookingLink: string | undefined
): string {
  const datePart = slotDate ? ` on ${slotDate}` : "";
  const timePart = slotTime ? ` at ${slotTime}` : "";
  const servicePart = serviceName ? ` for ${serviceName}` : "";
  const linkPart = bookingLink ? ` Reply to confirm: ${bookingLink}` : "";
  return `Hi ${name}, a slot is now available${datePart}${timePart}${servicePart}!${linkPart}`;
}

export function NotifyDialog({ id, entry, bookingLink }: NotifyDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  function handleOpen(next: boolean) {
    if (next) {
      setMessage(
        buildDefaultMessage(
          entry.name,
          entry.serviceName,
          entry.slotDate,
          entry.slotTime,
          bookingLink
        )
      );
      setServerError(null);
      setSent(false);
    }
    setOpen(next);
  }

  function handleSend() {
    setServerError(null);
    startTransition(async () => {
      const result = await notifyWaitlistEntry(id);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            disabled={isPending}
          />
        }
      >
        <Bell className="w-3 h-3" />
        Notify
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notify Waitlist Entry</DialogTitle>
        </DialogHeader>

        {/* Entry details */}
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium text-foreground">{entry.name}</span>
          </div>
          {entry.phone && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium text-foreground">{entry.phone}</span>
            </div>
          )}
          {entry.serviceName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium text-foreground">{entry.serviceName}</span>
            </div>
          )}
        </div>

        {/* Message preview */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notify-msg" className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Message preview
          </Label>
          <Textarea
            id="notify-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="resize-none text-sm"
            placeholder="Notification message…"
          />
          <p className="text-xs text-muted-foreground">
            Edit the message above before sending. This is a preview — delivery happens via your configured channel.
          </p>
        </div>

        {serverError && (
          <p className="text-xs text-destructive">{serverError}</p>
        )}

        {sent && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Entry marked as notified.
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            disabled={isPending || sent || !message.trim()}
            onClick={handleSend}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Send notification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
