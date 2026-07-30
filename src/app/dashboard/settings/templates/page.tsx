import * as React from "react";
import { MessageSquare } from "lucide-react";
import { getTemplates } from "@/app/actions/templates";
import { TemplatesManager } from "@/components/settings/templates-manager";

export const metadata = {
  title: "Message Templates — Zaloon",
};

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Message Templates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage reusable SMS, WhatsApp, and Email templates for reminders, campaigns, and automations.
          </p>
        </div>
      </div>

      {/* Client manager (filters, grid, create/edit modal) */}
      <TemplatesManager initialTemplates={templates} />
    </div>
  );
}
