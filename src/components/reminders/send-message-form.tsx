"use client";

import * as React from "react";
import { MessageSquare, Mail, Phone, Send, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { sendDirectMessage } from "@/app/actions/reminders";
import { TemplatePicker } from "@/components/settings/templates-manager";
import type { MessageTemplate } from "@/app/actions/templates";
import { cn } from "@/lib/utils";

// ── constants ─────────────────────────────────────────────────────────────────

const CHANNELS = [
  { value: "SMS", label: "SMS", icon: Phone, charLimit: 160 },
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageSquare, charLimit: 4096 },
  { value: "EMAIL", label: "Email", icon: Mail, charLimit: 2000 },
] as const;

type Channel = (typeof CHANNELS)[number]["value"];

// ── props ─────────────────────────────────────────────────────────────────────

export interface SendMessageFormClient {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface SendMessageFormProps {
  /** Pre-selected client */
  client?: SendMessageFormClient | null;
  /** Pre-fill from appointment (shows appointment details in preview) */
  appointmentId?: string;
  /** Pre-fill message text */
  initialMessage?: string;
  /** Called after a message is successfully sent */
  onSuccess?: (reminderId: string) => void;
  /** Compact mode for embedding inside sheets etc. */
  compact?: boolean;
  /** Templates to show in the template picker (loaded by parent) */
  templates?: MessageTemplate[];
}

// ── component ─────────────────────────────────────────────────────────────────

export function SendMessageForm({
  client,
  appointmentId,
  initialMessage = "",
  onSuccess,
  compact = false,
  templates = [],
}: SendMessageFormProps) {
  const [channel, setChannel] = React.useState<Channel>("SMS");
  const [message, setMessage] = React.useState(initialMessage);
  const [submitting, setSubmitting] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const currentChannel = CHANNELS.find((c) => c.value === channel)!;
  const charLimit = currentChannel.charLimit;
  const charCount = message.length;
  const overLimit = charCount > charLimit;

  // For SMS: show segment count
  const smsSegments = channel === "SMS" ? Math.ceil(Math.max(1, charCount) / 160) : null;

  // Map channel value to template channel name
  const templateChannel = channel === "WHATSAPP" ? "WhatsApp" : channel === "EMAIL" ? "Email" : "SMS";

  function applyTemplateBody(body: string) {
    const name = client?.name ?? "Customer";
    // Replace {{clientName}} and legacy {name} patterns
    const resolved = body
      .replace(/\{\{clientName\}\}/g, name)
      .replace(/\{name\}/g, name);
    setMessage(resolved);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }
    if (overLimit) {
      toast.error(`Message too long (${charCount}/${charLimit} characters)`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await sendDirectMessage({
        clientId: client?.id,
        message: message.trim(),
        type: channel,
        appointmentId,
      });

      if (result.success) {
        const recipient = client?.name ?? "client";
        toast.success("Message sent!", `${channel} sent to ${recipient}.`);
        setMessage("");
        setPreviewOpen(false);
        onSuccess?.(result.id);
      } else {
        toast.error("Failed to send", result.error);
      }
    } catch {
      toast.error("Unexpected error", "Could not send the message.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-xl border border-border bg-card space-y-4",
        compact ? "p-3" : "p-4"
      )}
    >
      {!compact && (
        <div className="flex items-center gap-2">
          <Send className="size-4 text-primary" />
          <h3 className="font-semibold text-sm">Send Message</h3>
        </div>
      )}

      {/* Client info (read-only if pre-filled) */}
      {client ? (
        <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
          <User className="size-3.5 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-medium">{client.name}</span>
            {client.phone && (
              <span className="text-xs text-muted-foreground ml-2">{client.phone}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="smf-phone" className="text-xs font-medium">
            Recipient Phone / Email
          </Label>
          <Input
            id="smf-phone"
            placeholder="+1 555 000 0000 or email@example.com"
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">
            To save history, select a client from the Clients page.
          </p>
        </div>
      )}

      {/* Channel selector */}
      <div className="grid grid-cols-3 gap-2">
        {CHANNELS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setChannel(value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border py-2 px-3 text-xs font-medium transition-colors",
              channel === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Template picker */}
      {!compact && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Templates</p>
          <TemplatePicker
            templates={templates}
            channel={templateChannel}
            onSelect={applyTemplateBody}
            label="Use a template"
          />
        </div>
      )}

      {/* Message textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="smf-message" className="text-xs font-medium">
            Message
          </Label>
          <span
            className={cn(
              "text-xs tabular-nums",
              overLimit
                ? "text-destructive font-semibold"
                : charCount > charLimit * 0.85
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            )}
          >
            {charCount}/{charLimit}
            {smsSegments && smsSegments > 1 && (
              <span className="ml-1 text-muted-foreground">({smsSegments} SMS)</span>
            )}
          </span>
        </div>
        <Textarea
          id="smf-message"
          placeholder="Type your message here…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={compact ? 3 : 4}
          aria-invalid={overLimit}
          className={cn(overLimit && "border-destructive")}
          disabled={submitting}
        />
        {overLimit && (
          <p className="text-xs text-destructive">
            Message exceeds {charLimit} character limit for {channel}.
          </p>
        )}
      </div>

      {/* Preview toggle */}
      {!compact && message.trim() && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {previewOpen ? "Hide preview" : "Show preview"}
          </button>
          {previewOpen && (
            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">
                Preview — {channel}
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message}</p>
            </div>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting || !message.trim() || overLimit}
        className="w-full gap-1.5"
        size={compact ? "sm" : "default"}
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send className="size-4" />
            Send {channel}
          </>
        )}
      </Button>
    </form>
  );
}
