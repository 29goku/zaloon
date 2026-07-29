import { getExtendedBookingRules } from "@/app/actions/settings";
import { BookingSettingsForm } from "@/components/settings/booking-settings-form";
import { CalendarClock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookingSettingsPage() {
  const rules = await getExtendedBookingRules();

  return (
    <div className="p-8">
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
          <CalendarClock className="w-7 h-7 text-primary" />
          Online Booking Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Booking window, client requirements, cancellation policy, and deposit rules
        </p>
      </div>

      <BookingSettingsForm initial={rules} />
    </div>
  );
}
