import { getBookingRules } from "@/app/actions/settings";
import { BookingRulesForm } from "@/components/settings/booking-rules-form";
import { Settings2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookingRulesPage() {
  const bookingRules = await getBookingRules();

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
          <Settings2 className="w-7 h-7 text-primary" />
          Booking Rules
        </h1>
        <p className="text-muted-foreground mt-1">
          Control how and when clients can book appointments online.
        </p>
      </div>

      <BookingRulesForm initial={bookingRules} />
    </div>
  );
}
