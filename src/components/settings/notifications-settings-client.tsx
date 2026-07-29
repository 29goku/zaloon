"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, Star, DollarSign } from "lucide-react";

type NotificationItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  enabled: boolean;
};

const INITIAL: NotificationItem[] = [
  {
    id: "appt_reminders",
    icon: Bell,
    label: "Appointment Reminders",
    description: "Send clients a reminder 24 hours before their appointment",
    enabled: true,
  },
  {
    id: "appt_confirmations",
    icon: MessageSquare,
    label: "Booking Confirmations",
    description: "Notify clients immediately when a booking is confirmed",
    enabled: true,
  },
  {
    id: "staff_notifications",
    icon: Bell,
    label: "Staff Notifications",
    description: "Notify staff when assigned to new appointments",
    enabled: false,
  },
  {
    id: "payment_receipts",
    icon: DollarSign,
    label: "Payment Receipts",
    description: "Send payment receipts to clients after checkout",
    enabled: true,
  },
  {
    id: "review_requests",
    icon: Star,
    label: "Review Requests",
    description: "Ask clients to leave a review 2 hours after their appointment",
    enabled: false,
  },
  {
    id: "cancellation_alerts",
    icon: Bell,
    label: "Cancellation Alerts",
    description: "Alert staff when a client cancels an appointment",
    enabled: true,
  },
];

export function NotificationsSettingsClient() {
  const [items, setItems] = useState<NotificationItem[]>(INITIAL);
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  }

  async function handleSave() {
    setSaving(true);
    // Mock save — configuration persistence coming soon
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success("Preferences saved", "Notification settings updated.");
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
            {items.map((item) => {
              const Icon = item.icon;
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
                    aria-checked={item.enabled}
                    onClick={() => toggle(item.id)}
                    aria-label={`Toggle ${item.label}`}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary mt-0.5 ${
                      item.enabled ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${
                        item.enabled ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Channel configuration (SMS, email, push) coming soon.
      </p>

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
