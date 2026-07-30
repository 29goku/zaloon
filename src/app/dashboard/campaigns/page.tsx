import * as React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Megaphone,
  Users,
  TrendingUp,
  BarChart2,
  CalendarDays,
  Gift,
  RefreshCw,
  Tag,
  BookOpen,
} from "lucide-react";
import { CampaignDialog, QuickCreateCampaignDialog } from "@/components/campaigns/campaign-dialog";
import { CampaignActions } from "@/components/campaigns/campaign-actions";
import { CampaignWizardDialog } from "@/components/campaigns/campaign-wizard-dialog";

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
  });
}

// Open rate progress bar
function OpenRateBar({ openCount, recipientCount }: { openCount: number; recipientCount: number }) {
  if (recipientCount === 0) return <span className="text-muted-foreground text-xs">—</span>;
  const rate = Math.round((openCount / recipientCount) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{rate}%</span>
    </div>
  );
}

// ── Quick-create button ────────────────────────────────────────────────────────

interface QuickCreateCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  defaultType: "BIRTHDAY" | "WIN_BACK" | "PROMOTIONAL";
}

function QuickCreateCard({ icon, label, description, defaultType }: QuickCreateCardProps) {
  return (
    <QuickCreateCampaignDialog defaultType={defaultType}>
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-left w-full cursor-pointer group">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </QuickCreateCampaignDialog>
  );
}

// ── Tab nav ───────────────────────────────────────────────────────────────────

type TabKey = "all" | "draft" | "scheduled" | "sent";

const TAB_DEFS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "sent", label: "Sent" },
];

function TabNav({
  activeTab,
  counts,
}: {
  activeTab: TabKey;
  counts: Record<TabKey, number>;
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 w-fit">
      {TAB_DEFS.map(({ key, label }) => {
        const isActive = activeTab === key;
        return (
          <Link
            key={key}
            href={`/dashboard/campaigns${key === "all" ? "" : `?tab=${key}`}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span
                className={`text-xs tabular-nums rounded-full px-1.5 py-0.5 leading-none ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[key]}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ tab?: string; template?: string }>;
}

export default async function CampaignsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rawTab = sp.tab ?? "all";
  const activeTab: TabKey = ["all", "draft", "scheduled", "sent"].includes(rawTab)
    ? (rawTab as TabKey)
    : "all";
  // template prefill is handled client-side via the dialog; we just pass it through
  const templateMessage = sp.template ? (() => { try { return decodeURIComponent(sp.template!); } catch { return sp.template; } })() : undefined;

  const salon = await prisma.salon.findFirst();
  if (!salon) {
    return (
      <div className="p-6 text-muted-foreground text-sm">No salon found.</div>
    );
  }

  const allCampaigns = await prisma.campaign.findMany({
    where: { salonId: salon.id },
    orderBy: { createdAt: "desc" },
  });

  // Tab filter logic
  const now = new Date();

  function filterByTab(tab: TabKey) {
    if (tab === "draft") return allCampaigns.filter((c) => c.status === "DRAFT");
    if (tab === "scheduled")
      return allCampaigns.filter(
        (c) => c.scheduledAt !== null && c.status !== "ACTIVE" && c.status !== "COMPLETED"
      );
    if (tab === "sent")
      return allCampaigns.filter(
        (c) => c.status === "ACTIVE" || c.status === "COMPLETED"
      );
    return allCampaigns;
  }

  const campaigns = filterByTab(activeTab);

  // Tab counts
  const counts: Record<TabKey, number> = {
    all: allCampaigns.length,
    draft: allCampaigns.filter((c) => c.status === "DRAFT").length,
    scheduled: allCampaigns.filter(
      (c) => c.scheduledAt !== null && c.status !== "ACTIVE" && c.status !== "COMPLETED"
    ).length,
    sent: allCampaigns.filter(
      (c) => c.status === "ACTIVE" || c.status === "COMPLETED"
    ).length,
  };

  // Summary stats
  const totalCampaigns = allCampaigns.length;
  const activeCampaigns = allCampaigns.filter((c) => c.status === "ACTIVE").length;
  const totalRecipients = allCampaigns.reduce((sum, c) => sum + c.recipientCount, 0);

  const campaignsWithRecipients = allCampaigns.filter(
    (c) => c.recipientCount > 0 && c.openCount > 0
  );
  const avgOpenRate =
    campaignsWithRecipients.length > 0
      ? Math.round(
          campaignsWithRecipients.reduce(
            (sum, c) => sum + (c.openCount / c.recipientCount) * 100,
            0
          ) / campaignsWithRecipients.length
        )
      : 0;

  const emptyMessages: Record<TabKey, string> = {
    all: "No campaigns yet. Use the quick-create buttons above or click \"Create Campaign\" to get started.",
    draft: "No draft campaigns.",
    scheduled: "No scheduled campaigns.",
    sent: "No campaigns have been sent yet.",
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Campaigns
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage marketing campaigns for your clients
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard/campaigns/templates"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/40 text-sm font-semibold text-foreground transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Templates
          </Link>
          <CampaignWizardDialog />
          <CampaignDialog prefillMessage={templateMessage} />
        </div>
      </div>

      {/* Template prefill banner */}
      {templateMessage && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <span>
            A template message has been pre-filled. Click{" "}
            <strong>Create Campaign</strong> to use it.
          </span>
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{totalCampaigns}</p>
            <p className="text-xs text-muted-foreground mt-1">Total campaigns</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{activeCampaigns}</p>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {totalRecipients.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total recipients</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{avgOpenRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Avg open rate</p>
          </div>
        </div>
      </div>

      {/* Quick-create section */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Quick create</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickCreateCard
            icon={<Gift className="w-5 h-5 text-primary" />}
            label="Birthday Campaign"
            description="Celebrate clients with a birthday discount"
            defaultType="BIRTHDAY"
          />
          <QuickCreateCard
            icon={<RefreshCw className="w-5 h-5 text-primary" />}
            label="Win-back Campaign"
            description="Re-engage clients who haven't visited recently"
            defaultType="WIN_BACK"
          />
          <QuickCreateCard
            icon={<Tag className="w-5 h-5 text-primary" />}
            label="Promotional Offer"
            description="Promote a limited-time offer to all clients"
            defaultType="PROMOTIONAL"
          />
        </div>
      </section>

      {/* Campaigns table with tabs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
          <TabNav activeTab={activeTab} counts={counts} />
        </div>

        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Megaphone className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {emptyMessages[activeTab]}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Campaign
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">
                    Channel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                    Recipients
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden xl:table-cell">
                    Open rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden md:table-cell">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="group block"
                      >
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {campaign.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {campaign.message.slice(0, 60)}
                          {campaign.message.length > 60 ? "…" : ""}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge
                        label={TYPE_LABELS[campaign.type] ?? campaign.type}
                        colorClass={TYPE_COLORS[campaign.type] ?? "bg-muted text-muted-foreground"}
                      />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge
                        label={campaign.channel}
                        colorClass={
                          CHANNEL_COLORS[campaign.channel] ?? "bg-muted text-muted-foreground"
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={campaign.status}
                        colorClass={
                          STATUS_COLORS[campaign.status] ?? "bg-muted text-muted-foreground"
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums hidden lg:table-cell">
                      {campaign.recipientCount > 0 ? (
                        <span className="font-semibold text-foreground">
                          {campaign.recipientCount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <OpenRateBar
                        openCount={campaign.openCount}
                        recipientCount={campaign.recipientCount}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <CalendarDays className="w-3 h-3 inline-block mr-0.5" />
                        {campaign.sentAt
                          ? formatDate(campaign.sentAt)
                          : campaign.scheduledAt
                          ? formatDate(campaign.scheduledAt)
                          : "Not scheduled"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CampaignActions
                        id={campaign.id}
                        status={campaign.status}
                        name={campaign.name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
