"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CalendarClock, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { scheduleRemindersForDate } from "@/app/actions/reminders";

export function ScheduleForDateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = React.useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [lastResult, setLastResult] = React.useState<{
    scheduled: number;
    skipped: number;
    appts: number;
  } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await scheduleRemindersForDate(date);
      if (res.success) {
        const { summary } = res;
        setLastResult({
          scheduled: summary.scheduledCount,
          skipped: summary.skippedCount,
          appts: summary.appointmentsFound,
        });
        toast.success(
          `Scheduled ${summary.scheduledCount} reminder${summary.scheduledCount !== 1 ? "s" : ""}`,
          `${summary.appointmentsFound} appointment${summary.appointmentsFound !== 1 ? "s" : ""} found on ${date}`
        );
        router.refresh();
      } else {
        toast.error("Scheduling failed", res.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-4 text-primary" />
        <span className="text-sm font-semibold">Bulk Schedule for Date</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Creates 24h, 2h, and 1h reminders for every appointment on the chosen date (skips
        already-scheduled or past windows).
      </p>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="max-w-[160px] h-9 text-sm"
          required
        />
        <Button size="sm" type="submit" disabled={isPending} className="gap-1.5">
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CalendarClock className="size-3.5" />
          )}
          {isPending ? "Scheduling…" : "Schedule"}
        </Button>
      </form>

      {lastResult && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-green-500" />
          <span>
            {lastResult.appts} appointment{lastResult.appts !== 1 ? "s" : ""} —{" "}
            <strong className="text-foreground">{lastResult.scheduled} scheduled</strong>,{" "}
            {lastResult.skipped} skipped
          </span>
        </div>
      )}
    </div>
  );
}
