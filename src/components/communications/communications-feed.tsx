"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Mail,
  Megaphone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Ban,
  ExternalLink,
} from "lucide-react";
import { cancelScheduledMessage, retryFailedMessage } from "@/app/actions/reminders";

type ReminderRow = {
  id: string;
  type: string;
  status: string;
  message: string;
  scheduledAt: string;
  sentAt: string | null;
  clientId: string | null;
  clientName: string | null;
};

type CampaignRow = {
  id: string;
  name: string;
  channel: string;
  status: string;
  recipientCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

type Tab = "all" | "reminders" | "campaigns" | "scheduled";

interface CommunicationsFeedProps {
  reminders: ReminderRow[];
  campaigns: CampaignRow[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "Pending", cls: "bg-amber-400/15 text-amber-400" },
    SENT: { label: "Sent", cls: "bg-emerald-400/15 text-emerald-400" },
    FAILED: { label: "Failed", cls: "bg-red-400/15 text-red-400" },
    CANCELLED: { label: "Cancelled", cls: "bg-muted text-muted-foreground" },
    DRAFT: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    ACTIVE: { label: "Active", cls: "bg-emerald-400/15 text-emerald-400" },
    PAUSED: { label: "Paused", cls: "bg-amber-400/15 text-amber-400" },
    COMPLETED: { label: "Completed", cls: "bg-blue-400/15 text-blue-400" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const map: Record<string, string> = {
    SMS: "bg-blue-400/15 text-blue-400",
    EMAIL: "bg-violet-400/15 text-violet-400",
    WHATSAPP: "bg-green-400/15 text-green-400",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[channel] ?? "bg-muted text-muted-foreground"}`}>
      {channel}
    </span>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CommunicationsFeed({ reminders, campaigns }: CommunicationsFeedProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  const now = new Date();
  const scheduledReminders = reminders.filter(
    (r) => r.status === "PENDING" && new Date(r.scheduledAt) > now
  );

  function handleCancel(id: string) {
    setActionId(id);
    startTransition(async () => {
      await cancelScheduledMessage(id);
      setActionId(null);
      router.refresh();
    });
  }

  function handleRetry(id: string) {
    setActionId(id);
    startTransition(async () => {
      await retryFailedMessage(id);
      setActionId(null);
      router.refresh();
    });
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "all", label: "All Messages" },
    { key: "reminders", label: "Reminders", count: reminders.length },
    { key: "campaigns", label: "Campaigns", count: campaigns.length },
    { key: "scheduled", label: "Scheduled", count: scheduledReminders.length },
  ];

  // Build unified feed sorted by scheduledAt desc
  type FeedItem =
    | { kind: "reminder"; data: ReminderRow; sortKey: string }
    | { kind: "campaign"; data: CampaignRow; sortKey: string };

  const feed: FeedItem[] = [];

  if (activeTab === "all" || activeTab === "reminders") {
    for (const r of reminders) {
      feed.push({ kind: "reminder", data: r, sortKey: r.scheduledAt });
    }
  }
  if (activeTab === "all" || activeTab === "campaigns") {
    for (const c of campaigns) {
      feed.push({ kind: "campaign", data: c, sortKey: c.scheduledAt ?? c.createdAt });
    }
  }
  if (activeTab === "scheduled") {
    for (const r of scheduledReminders) {
      feed.push({ kind: "reminder", data: r, sortKey: r.scheduledAt });
    }
  }

  feed.sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="text-[10px] font-bold rounded-full bg-primary/10 text-primary px-1.5 py-0.5 leading-none">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      {feed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">No messages yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Send a quick message or create a campaign to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {feed.map((item) => {
            if (item.kind === "reminder") {
              const r = item.data;
              const isProcessing = actionId === r.id && isPending;
              return (
                <div
                  key={`r-${r.id}`}
                  className="rounded-2xl border border-border bg-card px-4 py-3 flex items-start gap-3"
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    r.type === "EMAIL" ? "bg-violet-400/10" : "bg-blue-400/10"
                  }`}>
                    {r.type === "EMAIL"
                      ? <Mail className="w-4 h-4 text-violet-400" />
                      : <MessageSquare className="w-4 h-4 text-blue-400" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {r.clientName ?? "Unknown Client"}
                      </span>
                      <ChannelBadge channel={r.type} />
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {r.message.length > 80 ? r.message.slice(0, 80) + "…" : r.message}
                    </p>
                  </div>

                  {/* Time + actions */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatTime(r.scheduledAt)}
                    </span>
                    <div className="flex gap-1">
                      {r.status === "FAILED" && (
                        <button
                          className="text-xs text-primary hover:underline flex items-center gap-0.5 disabled:opacity-50"
                          onClick={() => handleRetry(r.id)}
                          disabled={isProcessing}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                      {r.status === "PENDING" && new Date(r.scheduledAt) > now && (
                        <button
                          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-0.5 disabled:opacity-50"
                          onClick={() => handleCancel(r.id)}
                          disabled={isProcessing}
                        >
                          <Ban className="w-3 h-3" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            } else {
              const c = item.data;
              return (
                <div
                  key={`c-${c.id}`}
                  className="rounded-2xl border border-border bg-card px-4 py-3 flex items-start gap-3"
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-xl bg-violet-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Megaphone className="w-4 h-4 text-violet-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {c.name}
                      </span>
                      <ChannelBadge channel={c.channel} />
                      <StatusBadge status={c.status} />
                      {c.recipientCount > 0 && (
                        <span className="text-[10px] bg-muted text-muted-foreground rounded-md px-2 py-0.5 font-medium">
                          {c.recipientCount} recipients
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Campaign
                      {c.sentAt ? ` · Sent ${formatTime(c.sentAt)}` : c.scheduledAt ? ` · Scheduled ${formatTime(c.scheduledAt)}` : ""}
                    </p>
                  </div>

                  {/* Link */}
                  <div className="flex-shrink-0 mt-0.5">
                    <Link
                      href={`/dashboard/campaigns/${c.id}`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
