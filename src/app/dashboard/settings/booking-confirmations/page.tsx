import { MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getConfirmationTemplates } from "@/app/actions/settings";
import { ConfirmationTemplatesClient } from "./confirmation-templates-client";

export const dynamic = "force-dynamic";

export default async function BookingConfirmationsPage() {
  const templates = await getConfirmationTemplates();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-primary" />
          Confirmation Templates
        </h1>
        <p className="text-muted-foreground mt-1">
          Customize the messages sent to clients at each stage of their booking lifecycle.
        </p>
      </div>

      {/* Merge tags reference */}
      <div className="mb-6 p-4 rounded-xl bg-secondary/40 border border-border text-xs space-y-1">
        <p className="font-semibold text-foreground">Available merge tags:</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground font-mono">
          {[
            "{{clientName}}",
            "{{date}}",
            "{{time}}",
            "{{services}}",
            "{{staffName}}",
            "{{salonName}}",
            "{{salonPhone}}",
          ].map((tag) => (
            <span key={tag} className="text-primary">{tag}</span>
          ))}
        </div>
      </div>

      <ConfirmationTemplatesClient initialTemplates={templates} />
    </div>
  );
}
