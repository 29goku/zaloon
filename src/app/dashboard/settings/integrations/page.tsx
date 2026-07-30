import { Plug, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { IntegrationsClient } from "@/components/settings/integrations-client";

export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  // Resolve server-side env vars; NEXT_PUBLIC_* vars are inlined at build time
  // but can also be read on the server. API_KEY must not be sent to the client
  // as a NEXT_PUBLIC_ var — we pass it as a prop from the server component so
  // it is only available in the rendered HTML for authenticated dashboard users.
  const stripeConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const apiKey = process.env.API_KEY ?? "";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

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

      <IntegrationsClient
        stripeConfigured={stripeConfigured}
        apiKey={apiKey}
        appUrl={appUrl}
      />
    </div>
  );
}
