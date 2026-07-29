import { Bell, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { loadNotificationPrefs } from "@/app/actions/reminders";
import { getReminderSettings } from "@/app/actions/settings";
import { NotificationPrefsForm } from "@/components/settings/notification-prefs-form";
import { ReminderConfigForm } from "@/components/settings/reminder-config-form";

export const dynamic = "force-dynamic";

export default async function ReminderSettingsPage() {
  const [prefs, reminderSettings] = await Promise.all([
    loadNotificationPrefs(),
    getReminderSettings(),
  ]);

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Reminders & Notifications</h1>
              <p className="text-sm text-muted-foreground">
                Configure SMS, email and WhatsApp reminders for appointments
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings/reminders/cron"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors"
          >
            Cron Status →
          </Link>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
        These settings define the <strong className="text-foreground">rules</strong> for
        auto-scheduling. Use the{" "}
        <Link href="/dashboard/reminders" className="text-primary hover:underline">
          Reminders hub
        </Link>{" "}
        to bulk-schedule reminders for a specific date or send messages manually.
      </div>

      {/* Comprehensive reminder config (SMS/email/channels/templates) */}
      <ReminderConfigForm initialSettings={reminderSettings} />

      {/* Legacy notification preferences (birthday, rebooking, etc.) */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold mb-4">Additional Notification Rules</h2>
        <NotificationPrefsForm initialPrefs={prefs} />
      </div>
    </div>
  );
}
