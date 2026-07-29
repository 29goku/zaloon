"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import type { AutomationRule, AutomationRuleData } from "@/app/actions/automations";
import { createRule, updateRule } from "@/app/actions/automations";
import type { MessageTemplate } from "@/app/actions/templates";
import { TemplatePicker } from "@/components/settings/templates-manager";

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIGGERS = [
  { value: "appointment_created", label: "Appointment Created", description: "When a new appointment is booked" },
  { value: "appointment_completed", label: "Appointment Completed", description: "When an appointment is marked done" },
  { value: "birthday", label: "Client Birthday", description: "On the client's birthday" },
  { value: "no_show", label: "No Show", description: "When a client misses their appointment" },
  { value: "anniversary", label: "Anniversary", description: "On the client's anniversary date" },
];

const CHANNELS = [
  { value: "SMS", label: "SMS" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
];

const TIMINGS = [
  { value: "immediate", label: "Immediately" },
  { value: "1h_before", label: "1 hour before" },
  { value: "24h_before", label: "24 hours before" },
  { value: "48h_before", label: "48 hours before" },
  { value: "1h_after", label: "1 hour after" },
  { value: "24h_after", label: "24 hours after" },
  { value: "7d_after", label: "7 days after" },
  { value: "30d_after", label: "30 days after" },
];

const VARIABLES = [
  { token: "{client_name}", label: "Client Name" },
  { token: "{appointment_date}", label: "Appointment Date" },
  { token: "{appointment_time}", label: "Appointment Time" },
  { token: "{service_name}", label: "Service Name" },
  { token: "{staff_name}", label: "Staff Name" },
  { token: "{salon_name}", label: "Salon Name" },
];

const MAX_CHARS = 1600;

// ── Props ─────────────────────────────────────────────────────────────────────

interface RuleFormProps {
  rule?: AutomationRule;
  onClose: () => void;
  onSaved: () => void;
  templates?: MessageTemplate[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RuleForm({ rule, onClose, onSaved, templates = [] }: RuleFormProps) {
  const isEditing = !!rule;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(rule?.name ?? "");
  const [trigger, setTrigger] = useState(rule?.trigger ?? "appointment_created");
  const [channel, setChannel] = useState(rule?.channel ?? "SMS");
  const [timing, setTiming] = useState(rule?.timing ?? "24h_before");
  const [messageTemplate, setMessageTemplate] = useState(
    rule?.messageTemplate ??
      "Hi {client_name}! Reminder: your appointment is on {appointment_date} at {appointment_time} at {salon_name}. See you soon!"
  );
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);

  const charCount = messageTemplate.length;

  function insertVariable(token: string) {
    setMessageTemplate((prev) => prev + token);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const data: AutomationRuleData = {
      name,
      trigger,
      channel,
      timing,
      messageTemplate,
      isActive,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateRule(rule.id, data)
        : await createRule(data);

      if (result.success) {
        onSaved();
      } else {
        setError((result as { success: false; error: string }).error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {isEditing ? "Edit Rule" : "New Automation Rule"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close form"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Rule Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Appointment reminder 24h"
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Trigger + Channel row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Trigger */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Trigger
            </label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {TRIGGERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {TRIGGERS.find((t) => t.value === trigger)?.description}
            </p>
          </div>

          {/* Channel */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timing */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Timing
          </label>
          <select
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {TIMINGS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Message Template */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Message Template
            </label>
            <span
              className={`text-xs font-mono tabular-nums ${
                charCount > MAX_CHARS ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {charCount} / {MAX_CHARS}
            </span>
          </div>

          {/* Template picker */}
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <TemplatePicker
                templates={templates}
                channel={channel as "SMS" | "WhatsApp" | "Email"}
                onSelect={(body) => setMessageTemplate(body)}
                label="Use a template"
              />
            </div>
          )}

          {/* Variable chips */}
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => insertVariable(v.token)}
                className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors"
              >
                {v.token}
              </button>
            ))}
          </div>

          <textarea
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            rows={4}
            placeholder="Type your message... use the variable buttons above to insert dynamic values."
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Variables like {"{client_name}"} will be replaced with real data when messages are sent.
          </p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Active</p>
            <p className="text-xs text-muted-foreground">Rule will fire when triggered</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              isActive ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending || charCount > MAX_CHARS}
            className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Saving…" : isEditing ? "Save Changes" : "Create Rule"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
