"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { sendDirectMessage } from "@/app/actions/reminders";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2, Check, Pencil } from "lucide-react";

interface ThankYouButtonProps {
  appointmentId: string;
  clientId: string | null;
  salonName: string;
  serviceNames: string[];
}

export function ThankYouButton({
  appointmentId,
  clientId,
  salonName,
  serviceNames,
}: ThankYouButtonProps) {
  const router = useRouter();

  const defaultMessage = `Thank you for visiting ${salonName}! We hope you enjoyed your ${
    serviceNames.length > 0 ? serviceNames.join(" & ") : "visit"
  }. We'd love to see you again!`;

  const [message, setMessage] = React.useState(defaultMessage);
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  async function handleSend() {
    if (!message.trim()) return;
    setPending(true);
    setError(null);

    const result = await sendDirectMessage({
      clientId: clientId ?? undefined,
      appointmentId,
      type: "SMS",
      message: message.trim(),
    });

    setPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSent(true);
    router.refresh();
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-sm text-primary py-2">
        <Check className="w-4 h-4" />
        Thank you message sent!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pre-filled template preview / edit */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Message preview
          </p>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3 h-3" />
            {editing ? "Done" : "Edit"}
          </button>
        </div>

        {editing ? (
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="text-sm"
          />
        ) : (
          <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-foreground leading-relaxed">
            {message}
          </div>
        )}
      </div>

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleSend}
        disabled={pending || !message.trim()}
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Heart className="w-4 h-4 text-pink-500" />
            Send Thank You Message
          </>
        )}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Sends via SMS. You can edit the message before sending.
      </p>
    </div>
  );
}
