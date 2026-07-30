"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import {
  Calendar,
  MessageCircle,
  CreditCard,
  Zap,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

// ── Integration definitions ──────────────────────────────────────────────────

type IntegrationId = "google_calendar" | "whatsapp" | "stripe" | "zapier";

type Integration = {
  id: IntegrationId;
  name: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  description: string;
  detail: string;
  connectLabel: string;
  showWebhook?: boolean;
};

const INTEGRATIONS: Integration[] = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    icon: Calendar,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
    description: "Sync appointments to Google Calendar in real time.",
    detail:
      "New bookings, cancellations, and reschedules are automatically reflected in your Google Calendar so your team always has up-to-date schedules.",
    connectLabel: "Connect with Google",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    icon: MessageCircle,
    iconColor: "text-green-400",
    iconBg: "bg-green-400/10",
    description: "Send appointment reminders and confirmations via WhatsApp.",
    detail:
      "Connect your WhatsApp Business number to send automated reminders 24 hours before appointments. Requires an approved WhatsApp Business API account.",
    connectLabel: "Set up WhatsApp",
  },
  {
    id: "stripe",
    name: "Stripe",
    icon: CreditCard,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-400/10",
    description: "Accept online payments when clients book appointments.",
    detail:
      "Collect deposits or full payment at booking time. Funds are deposited directly to your bank account via Stripe. Requires a Stripe account.",
    connectLabel: "Connect Stripe",
  },
  {
    id: "zapier",
    name: "Zapier",
    icon: Zap,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-400/10",
    description: "Trigger automations whenever a booking is made or changed.",
    detail:
      "Connect Zaloon to 5,000+ apps via Zapier. Use your webhook URL below to receive events for new bookings, cancellations, client check-ins, and payments.",
    connectLabel: "Open in Zapier",
    showWebhook: true,
  },
];

const STORAGE_KEY = "zaloon_integrations_connected";
const WEBHOOK_URL = "https://hooks.zaloon.app/webhooks/your-unique-token";

// ── Component ────────────────────────────────────────────────────────────────

export function IntegrationsClient() {
  const [connected, setConnected] = useState<Set<IntegrationId>>(new Set());
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as IntegrationId[];
        setConnected(new Set(arr));
      }
    } catch {
      // ignore
    }
  }, []);

  function persist(next: Set<IntegrationId>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
  }

  function handleToggle(id: IntegrationId, name: string) {
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success(`${name} disconnected`, "You can reconnect at any time.");
      } else {
        next.add(id);
        toast.success(`${name} connected`, "Integration is now active.");
      }
      persist(next);
      return next;
    });
  }

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
    } catch {
      // fallback
    }
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  return (
    <div className="space-y-4">
      {INTEGRATIONS.map((integration) => {
        const Icon = integration.icon;
        const isConnected = connected.has(integration.id);

        return (
          <Card key={integration.id} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${integration.iconBg}`}
                >
                  <Icon className={`w-5 h-5 ${integration.iconColor}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">
                      {integration.name}
                    </p>
                    {isConnected ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px] px-2 py-0">
                        Connected
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground border-border text-[10px] px-2 py-0"
                      >
                        Not connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {integration.description}
                  </p>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed mt-1">
                    {integration.detail}
                  </p>

                  {/* Webhook URL for Zapier */}
                  {integration.showWebhook && (
                    <div className="mt-3 flex items-stretch gap-2">
                      <div className="flex-1 font-mono text-xs bg-secondary rounded-lg px-3 py-2 text-muted-foreground overflow-x-auto whitespace-nowrap select-all border border-border">
                        {WEBHOOK_URL}
                      </div>
                      <button
                        type="button"
                        onClick={copyWebhook}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium transition-colors"
                        aria-label="Copy webhook URL"
                      >
                        {copiedWebhook ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(integration.id, integration.name)}
                    className={
                      isConnected
                        ? "h-8 px-4 rounded-xl text-xs font-medium border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
                        : "h-8 px-4 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    }
                  >
                    {isConnected ? "Disconnect" : integration.connectLabel}
                  </button>
                  {isConnected && (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Configure
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

    </div>
  );
}
