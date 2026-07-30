import { getBusinessHours } from "@/app/actions/settings";
import { Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BusinessHoursEnhancedForm } from "@/components/settings/business-hours-enhanced-form";

export const dynamic = "force-dynamic";

export default async function BusinessHoursPage() {
  const businessHours = await getBusinessHours();

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Clock className="w-7 h-7 text-primary" />
          Business Hours
        </h1>
        <p className="text-muted-foreground mt-1">
          Set your weekly schedule and add special dates like holidays or modified hours
        </p>
      </div>

      <BusinessHoursEnhancedForm initial={businessHours} />
    </div>
  );
}
