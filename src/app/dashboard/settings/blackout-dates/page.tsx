import { CalendarOff, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getBlackoutDates } from "@/app/actions/settings";
import { BlackoutDatesClient } from "./blackout-dates-client";

export const dynamic = "force-dynamic";

export default async function BlackoutDatesPage() {
  const blackoutDates = await getBlackoutDates();

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
          <CalendarOff className="w-7 h-7 text-primary" />
          Blackout Dates
        </h1>
        <p className="text-muted-foreground mt-1">
          Block specific dates or date ranges to prevent online bookings (e.g. holidays, renovations).
        </p>
      </div>

      <BlackoutDatesClient initialBlackouts={blackoutDates} />
    </div>
  );
}
