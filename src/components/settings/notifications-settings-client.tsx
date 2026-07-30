"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, Star, DollarSign } from "lucide-react";
import { saveNotificationPrefs, type NotificationPrefs } from "@/app/actions/settings";

type NotificationItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  defaultEnabled: boolean;
};

const ITEMS: NotificationItem[] = [
  {
    id: "appt_reminders",
    icon: Bell,
    label: "Appointment Reminders",
    description: "Send clients a reminder 24 hours before their appointment",
    defaultEnabled: true,
  },
  {
    id: "appt_confirmations",
    icon: MessageSquare,
    label: "Booking Confirmations",
    description: "Notify clients immediately when a booking is confirmed",
    defaultEnabled: true,
  },
  {
    id: "staff_notifications",
    icon: Bell,
    label: "Staff Notifications",
    description: "Notify staff when assigned to new appointments",
    defaultEnabled: false,
  },
  {
    id: "payment_receipts",
    icon: DollarSign,
    label: "Payment Receipts",
    description: "Send payment receipts to clients after checkout",
    defaultEnabled: true,
  },
  {
    id: "review_requests",
    icon: Star,
    label: "Review Requests",
    description: "Ask clients to leave a review 2 hours after their appointment",
    defaultEnabled: false,
  },
  {
    id: "cancellation_alerts",
    icon: Bell,
    label: "Cancellation Alerts",
    description: "Alert staff when a client cancels an appointment",
    defaultEnabled: true,
  },
];

interface Props {
  savedPrefs: NotificationPrefs;
}

export function NotificationsSettingsClient({ savedPrefs }: Props) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const item of ITEMS) {
      init[item.id] = item.id in savedPrefs ? savedPrefs[item.id] : item.defaultEnabled;
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveNotificationPrefs(enabled);
    setSaving(false);
    if (result.success) {
      toast.success("Preferences saved", "Notification settings updated.");
    } else {
      toast.error("Save failed", result.error ?? "Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              const isEnabled = enabled[item.id] ?? item.defaultEnabled;
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={() => toggle(item.id)}
                    aria-label={`Toggle ${item.label}`}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary mt-0.5 ${
                      isEnabled ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${
                        isEnabled ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="pb-8">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground px-6 py-3 h-auto rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
