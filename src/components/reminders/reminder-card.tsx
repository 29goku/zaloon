"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Send, Mail, MessageSquare, Phone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { sendReminder, cancelReminder } from "@/app/actions/reminders";
import { cn } from "@/lib/utils";
import type { ReminderWithAppointment } from "@/app/actions/reminders";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dt: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dt));
}

function channelIcon(type: string) {
  switch (type) {
    case "EMAIL":
      return <Mail className="size-3" />;
    case "WHATSAPP":
      return <MessageSquare className="size-3" />;
    default:
      return <Phone className="size-3" />;
  }
}

function channelVariant(type: string): "default" | "secondary" | "outline" {
  switch (type) {
    case "EMAIL":
      return "secondary";
    case "WHATSAPP":
      return "default";
    default:
      return "outline";
  }
}

function statusClass(status: string): string {
  switch (status) {
    case "SENT":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-transparent";
    case "FAILED":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-transparent";
    case "CANCELLED":
      return "bg-muted text-muted-foreground border-transparent";
    default:
      // PENDING
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-transparent";
  }
}

// ── component ─────────────────────────────────────────────────────────────────

interface ReminderCardProps {
  reminder: ReminderWithAppointment;
}

export function ReminderCard({ reminder }: ReminderCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [localStatus, setLocalStatus] = React.useState(reminder.status);
  const [localSentAt, setLocalSentAt] = React.useState<Date | null>(reminder.sentAt);

  const clientName = reminder.Appointment?.Client?.name ?? "Walk-in";
  const apptDate = reminder.Appointment?.date;
  const apptTime = reminder.Appointment?.startTime;

  async function handleSendNow() {
    setSending(true);
    try {
      const result = await sendReminder(reminder.id);
      if (result.success) {
        const now = new Date();
        setLocalStatus("SENT");
        setLocalSentAt(now);
        toast.success("Reminder sent!", `Sent to ${clientName} via ${reminder.type}`);
      } else {
        toast.error("Failed to send", result.error);
      }
    } catch {
      toast.error("Unexpected error", "Could not send the reminder.");
    } finally {
      setSending(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const result = await cancelReminder(reminder.id);
      if (result.success) {
        setLocalStatus("CANCELLED");
        toast.success("Reminder cancelled");
      } else {
        toast.error("Failed to cancel", result.error);
      }
    } catch {
      toast.error("Unexpected error", "Could not cancel the reminder.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card transition-colors hover:bg-muted/20">
      {/* Card header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
        {/* Left: client + appt info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{clientName}</span>
            {apptDate && apptTime && (
              <span className="text-xs text-muted-foreground">
                {apptDate} at {apptTime}
              </span>
            )}
          </div>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              expanded ? "" : "line-clamp-1"
            )}
          >
            {reminder.message}
          </p>
        </div>

        {/* Middle: channel + status badges */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Badge variant={channelVariant(reminder.type)} className="gap-1">
            {channelIcon(reminder.type)}
            {reminder.type}
          </Badge>
          <Badge className={cn("text-xs", statusClass(localStatus))}>
            {localStatus}
          </Badge>
        </div>

        {/* Right: times + actions */}
        <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTime(reminder.scheduledAt)}
          </span>

          {localStatus === "SENT" && localSentAt && (
            <span className="text-xs text-green-600 dark:text-green-400 whitespace-nowrap">
              Sent {formatDateTime(localSentAt)}
            </span>
          )}

          <div className="flex items-center gap-1.5">
            {localStatus === "PENDING" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendNow}
                  disabled={sending || cancelling}
                  className="gap-1"
                >
                  <Send className="size-3" />
                  {sending ? "Sending…" : "Send Now"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={sending || cancelling}
                  className="gap-1 text-muted-foreground hover:text-destructive"
                  aria-label="Cancel reminder"
                >
                  <X className="size-3.5" />
                  {cancelling ? "Cancelling…" : "Cancel"}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Collapse message" : "Expand message"}
              className="px-1.5"
            >
              {expanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded full message */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/30 rounded-b-xl">
          <p className="text-sm leading-relaxed">{reminder.message}</p>
        </div>
      )}
    </div>
  );
}
