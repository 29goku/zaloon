"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateWaitlistStatus } from "@/app/actions/waitlist";
import type { WaitlistStatus } from "@/app/actions/waitlist";

interface WaitlistActionButtonsProps {
  id: string;
  currentStatus: string;
}

export function WaitlistActionButtons({ id, currentStatus }: WaitlistActionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleStatus(status: WaitlistStatus) {
    startTransition(async () => {
      await updateWaitlistStatus(id, status);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {currentStatus === "WAITING" && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={isPending}
          onClick={() => handleStatus("NOTIFIED")}
        >
          Mark Notified
        </Button>
      )}
      {(currentStatus === "WAITING" || currentStatus === "NOTIFIED") && (
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs"
          disabled={isPending}
          onClick={() => handleStatus("BOOKED")}
        >
          Mark Booked
        </Button>
      )}
      {currentStatus !== "CANCELLED" && currentStatus !== "BOOKED" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={isPending}
          onClick={() => handleStatus("CANCELLED")}
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
