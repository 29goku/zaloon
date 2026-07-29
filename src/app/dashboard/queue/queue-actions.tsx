"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, CheckCircle, UserX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startAppointment,
  completeAppointment,
  markNoShow,
} from "@/app/actions/appointments";

interface QueueActionsProps {
  id: string;
  status: string;
}

export function QueueActions({ id, status }: QueueActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    startTransition(async () => {
      await startAppointment(id);
      router.refresh();
    });
  }

  function handleComplete() {
    startTransition(async () => {
      await completeAppointment(id);
      router.refresh();
    });
  }

  function handleNoShow() {
    startTransition(async () => {
      await markNoShow(id);
      router.refresh();
    });
  }

  const isTerminal = status === "COMPLETED" || status === "NO_SHOW";

  if (isTerminal) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 justify-end flex-wrap">
      {status === "SCHEDULED" && (
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs gap-1"
          disabled={isPending}
          onClick={handleStart}
          title="Start appointment"
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          Start
        </Button>
      )}

      {(status === "SCHEDULED" || status === "IN_PROGRESS") && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          disabled={isPending}
          onClick={handleComplete}
          title="Mark complete"
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <CheckCircle className="w-3 h-3" />
          )}
          Complete
        </Button>
      )}

      {status !== "NO_SHOW" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={isPending}
          onClick={handleNoShow}
          title="Mark no-show"
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <UserX className="w-3 h-3" />
          )}
          No Show
        </Button>
      )}
    </div>
  );
}
