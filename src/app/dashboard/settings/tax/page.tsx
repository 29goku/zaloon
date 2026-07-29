import { getTaxSettings } from "@/app/actions/settings";
import { TaxSettingsForm } from "@/components/settings/tax-settings-form";
import { Percent, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TaxSettingsPage() {
  const taxSettings = await getTaxSettings();

  return (
    <div className="p-8">
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
          <Percent className="w-7 h-7 text-primary" />
          Tax Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure tax rates, tax name, and how taxes are applied to invoices.
        </p>
      </div>

      <TaxSettingsForm initial={taxSettings} />
    </div>
  );
}
