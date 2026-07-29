import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Megaphone, Users, CalendarDays, BarChart2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  CampaignEditForm,
  CampaignSendButtons,
  CampaignDeleteButton,
} from "@/components/campaigns/campaign-detail-actions";
import { ResendToNonOpenersButton } from "@/components/campaigns/resend-to-non-openers-button";

export const dynamic = "force-dynamic";

// ── Badge helpers ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  BIRTHDAY: "Birthday",
  WIN_BACK: "Win-back",
  PROMOTIONAL: "Promotional",
  CUSTOM: "Custom",
};

const TYPE_COLORS: Record<string, string> = {
  BIRTHDAY: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  WIN_BACK: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  PROMOTIONAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  CUSTOM: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

const CHANNEL_COLORS: Record<string, string> = {
  SMS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  EMAIL: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  WHATSAPP: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-primary/10 text-primary",
  PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
}

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Phone mock preview ────────────────────────────────────────────────────────

function PhonePreview({ message, subject, channel }: { message: string; subject: string | null; channel: string }) {
  return (
    <div className="mx-auto w-64 rounded-3xl border-4 border-border bg-background shadow-lg overflow-hidden">
      {/* Status bar mock */}
      <div className="bg-muted/60 px-4 py-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">9:41</span>
        <div className="flex gap-1 items-center">
          <span className="text-xs text-muted-foreground">●●●</span>
        </div>
      </div>
      {/* App header mock */}
      <div className="bg-muted/30 px-3 py-2 border-b border-border">
        <p className="text-xs font-semibold text-foreground">
          {channel === "EMAIL" ? "Email — " : channel === "WHATSAPP" ? "WhatsApp" : "SMS"}
        </p>
        {channel === "EMAIL" && subject && (
          <p className="text-xs text-muted-foreground truncate">{subject}</p>
        )}
      </div>
      {/* Message bubble */}
      <div className="p-3 min-h-[120px]">
        <div className="bg-primary/10 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[90%]">
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Analytics row (SENT / ACTIVE campaigns) ───────────────────────────────────

interface AnalyticsRowProps {
  recipientCount: number;
  openCount: number;
  clickCount: number;
}

function AnalyticsRow({ recipientCount, openCount, clickCount }: AnalyticsRowProps) {
  const delivered = recipientCount;
  // If openCount/clickCount are 0 (legacy rows), fall back to estimates
  const opened = openCount > 0 ? openCount : Math.floor(recipientCount * 0.35);
  const clicked = clickCount > 0 ? clickCount : Math.floor(recipientCount * 0.08);
  const unsubscribed = 0;
  const hasRealData = openCount > 0 || clickCount > 0;

  const stats = [
    { label: "Delivered", value: delivered, color: "text-foreground" },
    {
      label: "Opened",
      value: opened,
      sub: `${recipientCount > 0 ? Math.round((opened / recipientCount) * 100) : 0}%`,
      color: "text-primary",
    },
    {
      label: "Clicked",
      value: clicked,
      sub: `${recipientCount > 0 ? Math.round((clicked / recipientCount) * 100) : 0}%`,
      color: "text-blue-600 dark:text-blue-400",
    },
    { label: "Unsubscribed", value: unsubscribed, color: "text-muted-foreground" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          Analytics
        </h2>
        {!hasRealData && (
          <span className="text-xs text-muted-foreground italic">Estimated</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl bg-muted/40 p-3 text-center">
            <p className={`text-2xl font-bold tabular-nums ${color}`}>
              {value.toLocaleString()}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  // Audience size estimate
  let audienceCount: number | null = null;
  if (campaign.targetFilter) {
    try {
      const { getTargetAudience } = await import("@/app/actions/campaigns");
      const result = await getTargetAudience(campaign.targetFilter);
      audienceCount = result.count;
    } catch {
      // non-critical
    }
  }

  const isDraft = campaign.status === "DRAFT";
  const isSent = campaign.status === "ACTIVE" || campaign.status === "COMPLETED";
  const isPaused = campaign.status === "PAUSED";

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{campaign.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge
                label={TYPE_LABELS[campaign.type] ?? campaign.type}
                colorClass={TYPE_COLORS[campaign.type] ?? "bg-muted text-muted-foreground"}
              />
              <Badge
                label={campaign.channel}
                colorClass={CHANNEL_COLORS[campaign.channel] ?? "bg-muted text-muted-foreground"}
              />
              <Badge
                label={campaign.status}
                colorClass={STATUS_COLORS[campaign.status] ?? "bg-muted text-muted-foreground"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Key info row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground leading-none">
              {audienceCount !== null ? audienceCount.toLocaleString() : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Estimated audience</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">
              {campaign.sentAt
                ? formatDate(campaign.sentAt)
                : campaign.scheduledAt
                ? formatDate(campaign.scheduledAt)
                : "Not scheduled"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {campaign.sentAt ? "Sent at" : campaign.scheduledAt ? "Scheduled for" : "Date"}
            </p>
          </div>
        </div>

        {isSent || isPaused ? (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-foreground leading-none">
                {campaign.recipientCount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Recipients</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-xs font-bold">D</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">Draft</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ready to send</p>
            </div>
          </div>
        )}
      </div>

      {/* Analytics (sent/active) */}
      {(isSent || isPaused) && campaign.recipientCount > 0 && (
        <>
          <AnalyticsRow
            recipientCount={campaign.recipientCount}
            openCount={campaign.openCount}
            clickCount={campaign.clickCount}
          />
          {/* Resend to non-openers */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
            <h2 className="text-base font-semibold text-foreground">Re-engagement</h2>
            <p className="text-sm text-muted-foreground">
              Create a follow-up draft campaign targeting clients who did not open this campaign.
            </p>
            <ResendToNonOpenersButton
              originalId={campaign.id}
              name={campaign.name}
              message={campaign.message}
              channel={campaign.channel}
              subject={campaign.subject}
              targetFilter={campaign.targetFilter}
              recipientCount={campaign.recipientCount}
              openCount={campaign.openCount}
            />
          </div>
        </>
      )}

      {/* Message preview */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Message Preview</h2>
        <PhonePreview
          message={campaign.message}
          subject={campaign.subject}
          channel={campaign.channel}
        />
      </div>

      {/* Edit form (DRAFT only) */}
      {isDraft && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Edit Campaign</h2>
          <CampaignEditForm
            id={campaign.id}
            name={campaign.name}
            message={campaign.message}
            subject={campaign.subject}
            scheduledAt={campaign.scheduledAt ? campaign.scheduledAt.toISOString() : null}
          />
        </div>
      )}

      {/* Send actions (DRAFT only) */}
      {isDraft && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-base font-semibold text-foreground">Send Campaign</h2>
          <p className="text-sm text-muted-foreground">
            Ready to go? Send the campaign immediately or it will launch on the scheduled date.
          </p>
          <CampaignSendButtons
            id={campaign.id}
            name={campaign.name}
            scheduledAt={campaign.scheduledAt ? campaign.scheduledAt.toISOString() : null}
          />
        </div>
      )}

      {/* Sent summary */}
      {isSent && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
          <h2 className="text-base font-semibold text-foreground">Delivery Summary</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Sent at</dt>
              <dd className="font-medium text-foreground">{formatDate(campaign.sentAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Recipients</dt>
              <dd className="font-medium text-foreground">
                {campaign.recipientCount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Channel</dt>
              <dd className="font-medium text-foreground">{campaign.channel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Status</dt>
              <dd>
                <Badge
                  label={campaign.status}
                  colorClass={STATUS_COLORS[campaign.status] ?? "bg-muted text-muted-foreground"}
                />
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Delete */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
        <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete this campaign. This action cannot be undone.
        </p>
        <CampaignDeleteButton id={campaign.id} name={campaign.name} />
      </div>
    </div>
  );
}
