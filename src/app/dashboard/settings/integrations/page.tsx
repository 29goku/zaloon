import { Plug, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { IntegrationsClient } from "@/components/settings/integrations-client";

export default function IntegrationsPage() {
  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Plug className="w-7 h-7 text-primary" />
          Integrations
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect your favorite tools to automate your workflow
        </p>
      </div>

      <IntegrationsClient />
    </div>
  );
}
