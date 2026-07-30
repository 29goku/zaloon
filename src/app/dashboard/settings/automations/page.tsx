import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { getRules } from "@/app/actions/automations";
import { getTemplates } from "@/app/actions/templates";
import { RulesList } from "@/components/automations/rules-list";
import { AutomationDialog } from "@/components/automations/automation-dialog";

export const dynamic = "force-dynamic";

const TRIGGER_DESCRIPTIONS = [
  {
    trigger: "appointment_created",
    label: "Appointment Booked",
    desc: "Send a confirmation as soon as a new appointment is created.",
    icon: "📅",
    timing: "immediate",
    channel: "SMS",
    template:
      "Hi {client_name}! Your appointment at {salon_name} is confirmed for {appointment_date} at {appointment_time}. See you soon!",
  },
  {
    trigger: "appointment_24h",
    label: "24h Reminder",
    desc: "Remind clients the day before their appointment to reduce no-shows.",
    icon: "⏰",
    timing: "24h_before",
    channel: "SMS",
    template:
      "Hi {client_name}! Reminder: your appointment at {salon_name} is tomorrow at {appointment_time}. Reply STOP to unsubscribe.",
  },
  {
    trigger: "appointment_completed",
    label: "Thank You / Review",
    desc: "Send a thank-you message after a completed appointment and request a review.",
    icon: "🙏",
    timing: "1h_after",
    channel: "SMS",
    template:
      "Thank you for visiting {salon_name}, {client_name}! We hope you love your {service_name}. Leave us a review — we'd love to hear from you!",
  },
  {
    trigger: "birthday",
    label: "Birthday Wish",
    desc: "Automatically wish clients a happy birthday with a special offer.",
    icon: "🎂",
    timing: "immediate",
    channel: "SMS",
    template:
      "Happy Birthday, {client_name}! 🎂 The team at {salon_name} wishes you a wonderful day. Treat yourself — book a special appointment today!",
  },
  {
    trigger: "inactive_60d",
    label: "Win-back (60 Days)",
    desc: "Re-engage clients who haven't visited in 60 days.",
    icon: "🔄",
    timing: "30d_after",
    channel: "SMS",
    template:
      "Hi {client_name}! We miss you at {salon_name}! It's been a while — book your next appointment and enjoy a special welcome-back offer.",
  },
  {
    trigger: "membership_expiring_7d",
    label: "Membership Renewal",
    desc: "Remind clients 7 days before their membership expires.",
    icon: "💳",
    timing: "7d_after",
    channel: "SMS",
    template:
      "Hi {client_name}! Your {salon_name} membership expires soon. Renew now to keep enjoying your exclusive benefits and discounts.",
  },
];

export default async function AutomationsPage() {
  const [rules, templates] = await Promise.all([getRules(), getTemplates()]);

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-7 h-7 text-primary" />
              Automations
            </h1>
            <p className="text-muted-foreground mt-1">
              Set up rules to automatically send appointment reminders, follow-ups, and birthday messages.
            </p>
          </div>
          <AutomationDialog>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0">
              <Zap className="w-4 h-4" />
              New Rule
            </button>
          </AutomationDialog>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">How it works:</span>{" "}
          When a trigger fires (e.g., appointment booked), matching active rules create Reminder
          records. Use variables like{" "}
          <code className="font-mono bg-muted px-1 rounded text-foreground">{"{client_name}"}</code>{" "}
          in your templates — they are replaced with real data when the message is sent.
        </div>
      </div>

      {/* Common automation trigger cards */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Automation Triggers</h2>
          <span className="text-xs text-muted-foreground">— click Edit to create a rule for any trigger</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TRIGGER_DESCRIPTIONS.map((td) => {
            const existingRules = rules.filter((r) => r.trigger === td.trigger);
            const hasRules = existingRules.length > 0;
            const activeCount = existingRules.filter((r) => r.isActive).length;
            return (
              <div
                key={td.trigger}
                className={`rounded-2xl border bg-card p-4 flex flex-col gap-3 transition-all ${
                  hasRules ? "border-primary/30 bg-primary/3" : "border-border"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl leading-none mt-0.5">{td.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug flex items-center gap-1.5">
                      {td.label}
                      {hasRules && (
                        <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 leading-none">
                          {activeCount}/{existingRules.length} active
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{td.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-auto">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {td.timing.replace("_", " ")}
                  </span>
                  <span className="rounded-md bg-blue-400/10 text-blue-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {td.channel}
                  </span>
                </div>

                <AutomationDialog>
                  <button className="flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold py-2 hover:bg-primary/20 transition-colors w-full">
                    <Zap className="w-3.5 h-3.5" />
                    {hasRules ? "Add Another Rule" : "Create Rule"}
                  </button>
                </AutomationDialog>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules list (client component handles interactivity) */}
      <RulesList initialRules={rules} initialTemplates={templates} />
    </div>
  );
}
