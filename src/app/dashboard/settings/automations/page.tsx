import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { getRules } from "@/app/actions/automations";
import { getTemplates } from "@/app/actions/templates";
import { RulesList } from "@/components/automations/rules-list";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const [rules, templates] = await Promise.all([getRules(), getTemplates()]);

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-7 h-7 text-primary" />
          Automations
        </h1>
        <p className="text-muted-foreground mt-1">
          Set up rules to automatically send appointment reminders, follow-ups, and birthday messages.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">How it works:</span>{" "}
          When a trigger fires (e.g., appointment booked), matching active rules create Reminder
          records. Use variables like{" "}
          <code className="font-mono bg-muted px-1 rounded text-foreground">{"{client_name}"}</code>{" "}
          in your templates — they are replaced with real data when the message is sent.
        </div>
      </div>

      {/* Rules list (client component handles interactivity) */}
      <RulesList initialRules={rules} initialTemplates={templates} />
    </div>
  );
}
