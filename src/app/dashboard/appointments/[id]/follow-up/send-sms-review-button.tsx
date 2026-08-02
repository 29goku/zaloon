"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { sendDirectMessage } from "@/app/actions/reminders";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, Check } from "lucide-react";

interface SendSmsReviewButtonProps {
  appointmentId: string;
  clientId: string | null;
  reviewLink: string;
  salonName: string;
}

export function SendSmsReviewButton({
  appointmentId,
  clientId,
  reviewLink,
  salonName,
}: SendSmsReviewButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSend() {
    setPending(true);
    setError(null);

    const message = `We'd love your feedback! Leave a review for ${salonName}: ${reviewLink}`;

    const result = await sendDirectMessage({
      clientId: clientId ?? undefined,
      appointmentId,
      type: "WHATSAPP",
      message,
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
        Review link sent via WhatsApp!
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={handleSend}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <MessageSquare className="w-3.5 h-3.5" />
            Send via WhatsApp
          </>
        )}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
