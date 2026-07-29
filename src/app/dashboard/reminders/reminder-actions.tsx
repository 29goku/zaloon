"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, SendHorizontal } from "lucide-react";
import { sendReminder, sendAllPendingReminders } from "@/app/actions/reminders";

interface SendNowButtonProps {
  reminderId: string;
}

export function SendNowButton({ reminderId }: SendNowButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSend() {
    startTransition(async () => {
      await sendReminder(reminderId);
      router.refresh();
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleSend}
      disabled={isPending}
      className="gap-1.5"
    >
      <Send className="size-3.5" />
      {isPending ? "Sending…" : "Send Now"}
    </Button>
  );
}

interface SendAllButtonProps {
  pendingCount: number;
}

export function SendAllButton({ pendingCount }: SendAllButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSendAll() {
    startTransition(async () => {
      await sendAllPendingReminders();
      router.refresh();
    });
  }

  return (
    <Button
      onClick={handleSendAll}
      disabled={isPending || pendingCount === 0}
      className="gap-1.5"
    >
      <SendHorizontal className="size-4" />
      {isPending ? "Sending…" : `Send All Pending (${pendingCount})`}
    </Button>
  );
}
