import { Bell, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { loadNotificationPrefs } from "@/app/actions/reminders";
import { NotificationPrefsForm } from "@/components/settings/notification-prefs-form";

export const dynamic = "force-dynamic";

export default async function ReminderSettingsPage() {
  const prefs = await loadNotificationPrefs();

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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notification Preferences</h1>
            <p className="text-sm text-muted-foreground">
              Configure automatic reminders, follow-ups, and birthday messages
            </p>
          </div>
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

      {/* Form */}
      <NotificationPrefsForm initialPrefs={prefs} />
    </div>
  );
}
