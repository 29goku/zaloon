"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  UserX,
  TrendingUp,
  Send,
  Users,
  CheckSquare,
  Square,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { sendWinBackMessage, sendBulkWinBack } from "@/app/actions/clients";
import { createWinBackCampaign } from "./actions";
import type { AtRiskClientRow, RecoveredClientRow } from "./page";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AtRiskPageClientProps {
  atRiskClients: AtRiskClientRow[];
  lostClients: AtRiskClientRow[];
  recoveredClients: RecoveredClientRow[];
  atRiskCount: number;
  lostCount: number;
  recoveryRate: number;
  recoveredThisMonth: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr + "T00:00:00"));
}

// ─── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({
  atRiskCount,
  lostCount,
  recoveryRate,
  recoveredThisMonth,
}: {
  atRiskCount: number;
  lostCount: number;
  recoveryRate: number;
  recoveredThisMonth: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card className="bg-card border-border rounded-2xl">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="rounded-xl p-2.5 bg-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              At Risk
            </p>
            <p className="text-2xl font-bold text-foreground leading-none">
              {atRiskCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">45–90 days since visit</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-2xl">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="rounded-xl p-2.5 bg-[#F41666]/20">
            <UserX className="w-5 h-5 text-[#F41666]" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Lost
            </p>
            <p className="text-2xl font-bold text-foreground leading-none">
              {lostCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">90+ days since visit</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-2xl">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="rounded-xl p-2.5 bg-emerald-500/20">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Recovery Rate
            </p>
            <p className="text-2xl font-bold text-foreground leading-none">
              {recoveryRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {recoveredThisMonth} came back this month
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Win-Back Template Preview ─────────────────────────────────────────────────

function WinBackTemplateCard() {
  return (
    <Card className="bg-card border-border rounded-2xl mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Win-Back Message Template
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl bg-muted/40 border border-border p-4">
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            "Hi [Name]! We miss you at [Salon Name]. It's been [X] days since
            your last visit. Book your next appointment and get pampered:{" "}
            <span className="text-primary">[booking link]</span>"
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Sent via SMS. Client name and days since last visit are personalized
          automatically.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Client Row ────────────────────────────────────────────────────────────────

function ClientRow({
  client,
  tier,
  checked,
  onToggle,
  onSendMessage,
  sending,
}: {
  client: AtRiskClientRow;
  tier: "at-risk" | "lost";
  checked: boolean;
  onToggle: () => void;
  onSendMessage: () => void;
  sending: boolean;
}) {
  const isAtRisk = tier === "at-risk";
  const badgeClass = isAtRisk
    ? "bg-amber-500/20 text-amber-600"
    : "bg-[#F41666]/20 text-[#F41666]";

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={checked ? "Deselect" : "Select"}
        >
          {checked ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">
              {getInitials(client.name)}
            </span>
          </div>
          <Link
            href={`/dashboard/clients/${client.id}`}
            className="font-medium text-foreground hover:text-primary transition-colors text-sm"
          >
            {client.name}
          </Link>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {formatDate(client.lastVisitDate)}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeClass}`}>
          {client.daysSince}d ago
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-right tabular-nums text-foreground">
        {client.totalVisits}
      </td>
      <td className="px-4 py-3 text-sm text-right tabular-nums text-foreground">
        {formatCurrency(client.totalSpend)}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={onSendMessage}
          disabled={sending}
          className="h-7 text-xs gap-1.5"
        >
          <Send className="w-3 h-3" />
          {sending ? "Sending…" : "Send message"}
        </Button>
      </td>
    </tr>
  );
}

// ─── Recovered Row ─────────────────────────────────────────────────────────────

function RecoveredRow({ client }: { client: RecoveredClientRow }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-emerald-500">
              {getInitials(client.name)}
            </span>
          </div>
          <Link
            href={`/dashboard/clients/${client.id}`}
            className="font-medium text-foreground hover:text-primary transition-colors text-sm"
          >
            {client.name}
          </Link>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {formatDate(client.returnedDate)}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-600">
          Recovered
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-right tabular-nums text-foreground">
        {client.totalVisits}
      </td>
      <td className="px-4 py-3 text-sm text-right tabular-nums text-foreground">
        {formatCurrency(client.totalSpend)}
      </td>
    </tr>
  );
}

// ─── Client Table with Bulk Actions ───────────────────────────────────────────

function ClientTable({
  clients,
  tier,
}: {
  clients: AtRiskClientRow[];
  tier: "at-risk" | "lost";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bulkPending, startBulk] = useTransition();
  const [campaignPending, startCampaign] = useTransition();
  const [allAtRiskPending, startAllAtRisk] = useTransition();

  const allIds = clients.map((c) => c.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSendMessage(clientId: string) {
    setSendingId(clientId);
    sendWinBackMessage(clientId).then(() => {
      setSendingId(null);
      router.refresh();
    });
  }

  function handleBulkSend() {
    if (!selected.size) return;
    startBulk(async () => {
      await sendBulkWinBack(Array.from(selected));
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleCreateCampaign() {
    if (!selected.size) return;
    const name = `Win-Back Campaign – ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
    startCampaign(async () => {
      await createWinBackCampaign(Array.from(selected), name);
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleSendToAllAtRisk() {
    startAllAtRisk(async () => {
      await sendBulkWinBack(allIds);
      router.refresh();
    });
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Users className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No clients here</p>
        <p className="text-xs text-muted-foreground mt-1">
          {tier === "at-risk"
            ? "No clients at risk right now."
            : "No lost clients. Great work!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        {selected.size > 0 && (
          <>
            <span className="text-xs text-muted-foreground">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkSend}
              disabled={bulkPending}
              className="h-7 text-xs gap-1.5"
            >
              <Send className="w-3 h-3" />
              {bulkPending ? "Sending…" : "Send win-back messages"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateCampaign}
              disabled={campaignPending}
              className="h-7 text-xs gap-1.5"
            >
              <MessageSquare className="w-3 h-3" />
              {campaignPending ? "Creating…" : "Save as campaign"}
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleSendToAllAtRisk}
          disabled={allAtRiskPending}
          className="h-7 text-xs gap-1.5 ml-auto"
        >
          <RefreshCw className="w-3 h-3" />
          {allAtRiskPending
            ? "Sending…"
            : `Send to all ${tier === "at-risk" ? "at-risk" : "lost"} (${allIds.length})`}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 w-10">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={allSelected ? "Deselect all" : "Select all"}
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Last Visit
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Since
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Visits
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Total Spent
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  tier={tier}
                  checked={selected.has(client.id)}
                  onToggle={() => toggleOne(client.id)}
                  onSendMessage={() => handleSendMessage(client.id)}
                  sending={sendingId === client.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Recovered Table ──────────────────────────────────────────────────────────

function RecoveredTable({ clients }: { clients: RecoveredClientRow[] }) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <TrendingUp className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No recoveries yet this month</p>
        <p className="text-xs text-muted-foreground mt-1">
          Clients who were lost but returned this month will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Client
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Returned
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Status
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Visits
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Total Spent
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <RecoveredRow key={client.id} client={client} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Client Component ─────────────────────────────────────────────────────

export function AtRiskPageClient({
  atRiskClients,
  lostClients,
  recoveredClients,
  atRiskCount,
  lostCount,
  recoveryRate,
  recoveredThisMonth,
}: AtRiskPageClientProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">At-Risk & Lost Clients</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Re-engage clients who haven't visited recently before you lose them for good.
        </p>
      </div>

      {/* Summary cards */}
      <SummaryCards
        atRiskCount={atRiskCount}
        lostCount={lostCount}
        recoveryRate={recoveryRate}
        recoveredThisMonth={recoveredThisMonth}
      />

      {/* Win-back template */}
      <WinBackTemplateCard />

      {/* Tabs */}
      <Tabs defaultValue="at-risk">
        <TabsList className="mb-4">
          <TabsTrigger value="at-risk" className="gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            At-Risk
            {atRiskCount > 0 && (
              <span className="ml-1 bg-amber-500/20 text-amber-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {atRiskCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="lost" className="gap-2">
            <UserX className="w-3.5 h-3.5" />
            Lost
            {lostCount > 0 && (
              <span className="ml-1 bg-[#F41666]/20 text-[#F41666] text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {lostCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recovered" className="gap-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Recovered
            {recoveredClients.length > 0 && (
              <span className="ml-1 bg-emerald-500/20 text-emerald-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {recoveredClients.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="at-risk">
          <ClientTable clients={atRiskClients} tier="at-risk" />
        </TabsContent>

        <TabsContent value="lost">
          <ClientTable clients={lostClients} tier="lost" />
        </TabsContent>

        <TabsContent value="recovered">
          <RecoveredTable clients={recoveredClients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
