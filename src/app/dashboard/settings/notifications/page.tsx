import { Bell, ArrowLeft, CalendarClock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { NotificationsSettingsClient } from "@/components/settings/notifications-settings-client";
import { getNotificationPrefs } from "@/app/actions/settings";

export default async function NotificationsSettingsPage() {
  const savedPrefs = await getNotificationPrefs();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-7 h-7 text-primary" />
          Notifications
        </h1>
        <p className="text-muted-foreground mt-1">
          Control which automated messages are sent to clients and staff
        </p>
      </div>

      <NotificationsSettingsClient savedPrefs={savedPrefs} />

      {/* Link to advanced reminder scheduling */}
      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CalendarClock className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Reminder Scheduling &amp; Templates</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure timing windows, per-channel defaults, follow-ups, and birthday messages
              — all saved to your salon profile.
            </p>
          </div>
          <Link
            href="/dashboard/settings/reminders"
            className="inline-flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Configure
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
