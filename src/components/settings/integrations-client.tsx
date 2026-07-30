"use client";

import { useState } from "react";
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
  Eye,
  EyeOff,
} from "lucide-react";

// ── Props ────────────────────────────────────────────────────────────────────

interface IntegrationsClientProps {
  /** Whether NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set (resolved server-side) */
  stripeConfigured: boolean;
  /** The API key to display in the Zapier section (server-provided, masked client-side) */
  apiKey: string;
  /** The app URL (NEXT_PUBLIC_APP_URL) */
  appUrl: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function IntegrationsClient({
  stripeConfigured,
  apiKey,
  appUrl,
}: IntegrationsClientProps) {
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const webhookUrl = `${appUrl}/api/v1/appointments`;
  const maskedKey = apiKey
    ? apiKey.slice(0, 6) + "••••••••••••••••••••" + apiKey.slice(-4)
    : "API_KEY not configured";

  async function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback for browsers without clipboard API
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">

      {/* ── Google Calendar ────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-blue-400/10">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">Google Calendar</p>
                <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px] px-2 py-0">
                  Coming soon
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sync appointments to Google Calendar in real time.
              </p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed mt-1">
                New bookings, cancellations, and reschedules will be automatically reflected in your
                Google Calendar so your team always has up-to-date schedules.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── WhatsApp Business ─────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-green-400/10">
              <MessageCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">WhatsApp Business</p>
                <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px] px-2 py-0">
                  Coming soon
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Send appointment reminders and confirmations via WhatsApp.
              </p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed mt-1">
                Connect your WhatsApp Business number to send automated reminders 24 hours before
                appointments. Requires an approved WhatsApp Business API account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stripe ────────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-violet-400/10">
              <CreditCard className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">Stripe</p>
                {stripeConfigured ? (
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
                Accept online payments when clients book appointments.
              </p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed mt-1">
                {stripeConfigured
                  ? "Stripe is configured. Clients can pay deposits or full amounts at booking time."
                  : "Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY in your environment variables to enable online payments. Get your keys at stripe.com/dashboard."}
              </p>
              {!stripeConfigured && (
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-[11px] text-primary hover:underline underline-offset-4"
                >
                  <ExternalLink className="w-3 h-3" />
                  Get Stripe API keys
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Zapier ────────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-orange-400/10">
              <Zap className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">Zapier</p>
                <Badge
                  variant="outline"
                  className="text-muted-foreground border-border text-[10px] px-2 py-0"
                >
                  API trigger
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Trigger automations whenever a booking is made or changed.
              </p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed mt-1">
                Connect Zaloon to 5,000+ apps via Zapier. Use the webhook trigger URL below with
                the{" "}
                <code className="font-mono text-[10px] bg-secondary px-1 py-0.5 rounded">
                  X-API-Key
                </code>{" "}
                header set to your API key value.
              </p>

              {/* Webhook trigger URL */}
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Webhook Trigger URL
                </p>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 font-mono text-xs bg-secondary rounded-lg px-3 py-2 text-muted-foreground overflow-x-auto whitespace-nowrap select-all border border-border">
                    {webhookUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl, setCopiedWebhookUrl)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium transition-colors"
                    aria-label="Copy webhook URL"
                  >
                    {copiedWebhookUrl ? (
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
              </div>

              {/* API Key */}
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  X-API-Key header value
                </p>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 font-mono text-xs bg-secondary rounded-lg px-3 py-2 text-muted-foreground overflow-x-auto whitespace-nowrap select-all border border-border">
                    {showApiKey ? apiKey || "API_KEY not set in environment" : maskedKey}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium transition-colors"
                    aria-label={showApiKey ? "Hide API key" : "Reveal API key"}
                  >
                    {showApiKey ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!apiKey) {
                        toast.error("API key not configured", "Set API_KEY in your environment variables.");
                        return;
                      }
                      copyToClipboard(apiKey, setCopiedApiKey);
                    }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium transition-colors"
                    aria-label="Copy API key"
                  >
                    {copiedApiKey ? (
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
                <p className="text-[11px] text-muted-foreground/70">
                  In Zapier, add a custom header{" "}
                  <code className="font-mono bg-secondary px-1 py-0.5 rounded">X-API-Key</code>{" "}
                  with the value above when configuring your Zap trigger.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
