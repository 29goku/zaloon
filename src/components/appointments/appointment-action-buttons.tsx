"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserX, CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markNoShow } from "@/app/actions/appointments";
import Link from "next/link";


interface AppointmentActionButtonsProps {
  appointmentId: string;
  status: string;
  /** ISO date string: YYYY-MM-DD */
  date: string;
  /** "HH:MM" 24-hour start time */
  startTime: string;
}

/**
 * Compact action buttons rendered next to appointment rows.
 *
 * "No Show" — shown only for SCHEDULED appointments that are in the past.
 * "Follow-Up" — shown for COMPLETED appointments, links to the follow-up page.
 */
export function AppointmentActionButtons({
  appointmentId,
  status,
  date,
  startTime,
}: AppointmentActionButtonsProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const now = new Date();
  const [h, m] = startTime.split(":").map(Number);
  const [y, mo, d] = date.split("-").map(Number);
  const apptDateTime = new Date(y, mo - 1, d, h, m);
  const isInThePast = apptDateTime < now;

  const showNoShow = status === "SCHEDULED" && isInThePast;
  const showFollowUp = status === "COMPLETED";

  if (!showNoShow && !showFollowUp) return null;

  async function handleNoShow() {
    setPending(true);
    setError(null);
    const result = await markNoShow(appointmentId);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      {showNoShow && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            handleNoShow();
          }}
          disabled={pending}
          title="Mark as no-show"
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UserX className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">No Show</span>
        </Button>
      )}

      {showFollowUp && (
        <Link
          href={`/dashboard/appointments/${appointmentId}/follow-up`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Follow-Up</span>
        </Link>
      )}

      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
