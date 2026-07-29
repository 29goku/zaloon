"use client";

import { useState, useTransition } from "react";
import { Zap, Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { RuleForm } from "./rule-form";
import type { AutomationRule } from "@/app/actions/automations";
import { deleteRule, toggleRule, createRule } from "@/app/actions/automations";
import { TRIGGER_LABELS, CHANNEL_LABELS, TIMING_LABELS } from "@/app/actions/automations-constants";
import type { MessageTemplate } from "@/app/actions/templates";

// ── Pre-built templates ───────────────────────────────────────────────────────

const TEMPLATES = [
  {
    name: "Appointment reminder (24h)",
    trigger: "appointment_created",
    channel: "SMS",
    timing: "24h_before",
    messageTemplate:
      "Hi {client_name}! Reminder: your appointment is tomorrow ({appointment_date}) at {appointment_time} at {salon_name}. Reply STOP to unsubscribe.",
    description: "Sends SMS the day before each appointment",
    icon: "📅",
  },
  {
    name: "Appointment reminder (2h)",
    trigger: "appointment_created",
    channel: "SMS",
    timing: "1h_before",
    messageTemplate:
      "Hi {client_name}! Your appointment at {salon_name} is in 2 hours — at {appointment_time} today. See you soon! 💇",
    description: "Sends SMS 1h before for last-minute reminders",
    icon: "⏰",
  },
  {
    name: "Thank you message",
    trigger: "appointment_completed",
    channel: "SMS",
    timing: "1h_after",
    messageTemplate:
      "Thank you for visiting {salon_name}, {client_name}! We hope you love your {service_name}. Leave us a review — we'd love to hear from you!",
    description: "Sends a thank-you after the appointment is completed",
    icon: "🙏",
  },
  {
    name: "Re-booking prompt",
    trigger: "appointment_completed",
    channel: "SMS",
    timing: "30d_after",
    messageTemplate:
      "Hi {client_name}! It's been a while since your last visit at {salon_name}. Ready for a refresh? Book your next appointment today!",
    description: "Encourages clients to rebook 30 days after last visit",
    icon: "🔄",
  },
  {
    name: "Birthday greeting",
    trigger: "birthday",
    channel: "SMS",
    timing: "immediate",
    messageTemplate:
      "Happy Birthday, {client_name}! 🎂 The team at {salon_name} wishes you a wonderful day. Treat yourself — book a special appointment today!",
    description: "Sends birthday wishes to clients on their birthday",
    icon: "🎂",
  },
];

const CHANNEL_COLORS: Record<string, string> = {
  SMS: "bg-blue-400/15 text-blue-400",
  EMAIL: "bg-violet-400/15 text-violet-400",
  WHATSAPP: "bg-green-400/15 text-green-400",
};

const TRIGGER_COLORS: Record<string, string> = {
  appointment_created: "bg-cyan-400/15 text-cyan-400",
  appointment_completed: "bg-emerald-400/15 text-emerald-400",
  birthday: "bg-pink-400/15 text-pink-400",
  no_show: "bg-red-400/15 text-red-400",
  anniversary: "bg-amber-400/15 text-amber-400",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface RulesListProps {
  initialRules: AutomationRule[];
  initialTemplates?: MessageTemplate[];
}

export function RulesList({ initialRules, initialTemplates = [] }: RulesListProps) {
  const [rules, setRules] = useState<AutomationRule[]>(initialRules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reload rules from the server by re-fetching after mutations
  async function refreshRules() {
    // We refetch by calling the action directly
    const { getRules } = await import("@/app/actions/automations");
    const fresh = await getRules();
    setRules(fresh);
  }

  function handleToggle(id: string) {
    setTogglingId(id);
    startTransition(async () => {
      const result = await toggleRule(id);
      if (result.success) {
        setRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isActive: result.isActive } : r))
        );
      }
      setTogglingId(null);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this automation rule?")) return;
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteRule(id);
      if (result.success) {
        setRules((prev) => prev.filter((r) => r.id !== id));
      }
      setDeletingId(null);
    });
  }

  function handleAddTemplate(tpl: (typeof TEMPLATES)[0]) {
    startTransition(async () => {
      const result = await createRule({
        name: tpl.name,
        trigger: tpl.trigger,
        channel: tpl.channel,
        timing: tpl.timing,
        messageTemplate: tpl.messageTemplate,
        isActive: true,
      });
      if (result.success) {
        await refreshRules();
      }
    });
  }

  const hasRules = rules.length > 0;

  return (
    <div className="space-y-8">
      {/* Pre-built templates — shown only when no rules exist */}
      {!hasRules && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Quick-start templates</h2>
            <span className="text-xs text-muted-foreground">— add a rule in one click</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEMPLATES.map((tpl) => (
              <div
                key={tpl.name}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      {tpl.icon} {tpl.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CHANNEL_COLORS[tpl.channel] ?? "bg-muted text-muted-foreground"}`}>
                    {CHANNEL_LABELS[tpl.channel]}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${TRIGGER_COLORS[tpl.trigger] ?? "bg-muted text-muted-foreground"}`}>
                    {TIMING_LABELS[tpl.timing]}
                  </span>
                </div>
                <button
                  onClick={() => handleAddTemplate(tpl)}
                  disabled={isPending}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold py-2 hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Rule
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            {hasRules ? `${rules.length} rule${rules.length !== 1 ? "s" : ""}` : "Your rules"}
          </h2>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setEditingId(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Rule
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <RuleForm
            onClose={() => setShowCreateForm(false)}
            onSaved={async () => {
              setShowCreateForm(false);
              await refreshRules();
            }}
            templates={initialTemplates}
          />
        )}

        {/* Empty state (with existing create button) */}
        {!hasRules && !showCreateForm && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No automation rules yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use a template above or create a custom rule.
            </p>
          </div>
        )}

        {/* Rules */}
        {rules.map((rule) => (
          <div key={rule.id} className="space-y-0">
            {editingId === rule.id ? (
              <RuleForm
                rule={rule}
                onClose={() => setEditingId(null)}
                onSaved={async () => {
                  setEditingId(null);
                  await refreshRules();
                }}
                templates={initialTemplates}
              />
            ) : (
              <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-4">
                {/* Active toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={rule.isActive}
                  onClick={() => handleToggle(rule.id)}
                  disabled={togglingId === rule.id}
                  className={`mt-0.5 relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 ${
                    rule.isActive ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      rule.isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {rule.name}
                    </p>
                    {!rule.isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Paused
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${TRIGGER_COLORS[rule.trigger] ?? "bg-muted text-muted-foreground"}`}>
                      {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CHANNEL_COLORS[rule.channel] ?? "bg-muted text-muted-foreground"}`}>
                      {CHANNEL_LABELS[rule.channel] ?? rule.channel}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {TIMING_LABELS[rule.timing] ?? rule.timing}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2 font-mono">
                    {rule.messageTemplate}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditingId(rule.id);
                      setShowCreateForm(false);
                    }}
                    className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Edit rule"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    disabled={deletingId === rule.id}
                    className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    aria-label="Delete rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
