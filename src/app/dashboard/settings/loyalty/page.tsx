import { getLoyaltySettings } from "@/app/actions/settings";
import { LoyaltySettingsForm } from "@/components/settings/loyalty-settings-form";
import { Award, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoyaltySettingsPage() {
  const loyaltySettings = await getLoyaltySettings();

  return (
    <div className="p-4 md:p-8">
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
          <Award className="w-7 h-7 text-primary" />
          Loyalty Program Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure tiers, earning rules, and redemption rules for your loyalty program.
        </p>
      </div>

      <LoyaltySettingsForm initial={loyaltySettings} />
    </div>
  );
}
