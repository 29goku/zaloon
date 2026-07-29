"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Send,
  Trash2,
  RefreshCw,
  Mail,
  MessageSquare,
  Phone,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import {
  sendReminder,
  deleteReminders,
  markReminderSent,
} from "@/app/actions/reminders";
import { cn } from "@/lib/utils";
import type { ReminderWithRelations } from "@/app/actions/reminders";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDT(dt: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dt));
}

function ChannelBadge({ channel }: { channel: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    SMS: {
      icon: <Phone className="size-3" />,
      label: "SMS",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    },
    WHATSAPP: {
      icon: <MessageSquare className="size-3" />,
      label: "WhatsApp",
      cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    },
    EMAIL: {
      icon: <Mail className="size-3" />,
      label: "Email",
      cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    },
  };
  const cfg = map[channel] ?? map.SMS;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        cfg.cls
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    PENDING: {
      icon: <Clock className="size-3" />,
      label: "Pending",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    },
    SENT: {
      icon: <CheckCircle2 className="size-3" />,
      label: "Sent",
      cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    },
    FAILED: {
      icon: <AlertCircle className="size-3" />,
      label: "Failed",
      cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    },
    CANCELLED: {
      icon: <XCircle className="size-3" />,
      label: "Cancelled",
      cls: "bg-muted text-muted-foreground",
    },
  };
  const cfg = map[status] ?? map.PENDING;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        cfg.cls
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface RemindersTableProps {
  reminders: ReminderWithRelations[];
}

export function RemindersTable({ reminders }: RemindersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [localStatuses, setLocalStatuses] = React.useState<Record<string, string>>({});

  function getStatus(r: ReminderWithRelations): string {
    return localStatuses[r.id] ?? r.status;
  }

  const allIds = reminders.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected || someSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const res = await deleteReminders(ids);
      if (res.success) {
        toast.success(`Deleted ${res.count} reminder${res.count !== 1 ? "s" : ""}`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error("Delete failed", res.error);
      }
    });
  }

  function handleResend(id: string) {
    startTransition(async () => {
      const res = await sendReminder(id);
      if (res.success) {
        setLocalStatuses((prev) => ({ ...prev, [id]: "SENT" }));
        toast.success("Reminder resent successfully");
        router.refresh();
      } else {
        toast.error("Resend failed", res.error);
      }
    });
  }

  function handleMarkSent(id: string) {
    startTransition(async () => {
      const res = await markReminderSent(id);
      if (res.success) {
        setLocalStatuses((prev) => ({ ...prev, [id]: "SENT" }));
        toast.success("Marked as sent");
        router.refresh();
      } else {
        toast.error("Failed", res.error);
      }
    });
  }

  if (reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
        <Clock className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">No reminders match this filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {(someSelected || allSelected) && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isPending}
            className="gap-1.5 ml-auto"
          >
            <Trash2 className="size-3.5" />
            Delete Selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
            disabled={isPending}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="flex items-center justify-center"
                    aria-label="Select all"
                  >
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      readOnly
                      className="pointer-events-none"
                    />
                  </button>
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Client
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">
                  Appointment
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Channel
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">
                  Scheduled
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reminders.map((reminder) => {
                const status = getStatus(reminder);
                const clientName = reminder.Appointment?.Client?.name ?? "Walk-in";
                const apptDate = reminder.Appointment?.date;
                const apptTime = reminder.Appointment?.startTime;
                const isChecked = selected.has(reminder.id);

                return (
                  <tr
                    key={reminder.id}
                    className={cn(
                      "transition-colors hover:bg-muted/20",
                      isChecked && "bg-primary/5"
                    )}
                  >
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleOne(reminder.id)}
                        className="flex items-center justify-center"
                        aria-label={`Select reminder for ${clientName}`}
                      >
                        <Checkbox
                          checked={isChecked}
                          readOnly
                          className="pointer-events-none"
                        />
                      </button>
                    </td>
                    <td className="px-3 py-3 font-medium">{clientName}</td>
                    <td className="px-3 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {apptDate && apptTime ? `${apptDate} ${apptTime}` : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <ChannelBadge channel={reminder.type} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                      {formatDT(reminder.scheduledAt)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(status === "FAILED" || status === "SENT") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResend(reminder.id)}
                            disabled={isPending}
                            className="gap-1 text-xs h-7"
                          >
                            <RefreshCw className="size-3" />
                            Resend
                          </Button>
                        )}
                        {status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkSent(reminder.id)}
                            disabled={isPending}
                            className="gap-1 text-xs h-7"
                          >
                            <Send className="size-3" />
                            Send
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
