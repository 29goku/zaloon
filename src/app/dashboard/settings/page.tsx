import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Bell, Link2 } from "lucide-react";
import { SettingsForm } from "@/components/settings/settings-form";
import { BookingLink } from "@/components/settings/booking-link";

export const dynamic = "force-dynamic";

const NOTIFICATION_SETTINGS = [
  {
    id: "appt_reminders",
    label: "Appointment Reminders",
    description: "Send clients a reminder 24h before their appointment",
    enabled: true,
  },
  {
    id: "appt_confirmations",
    label: "Booking Confirmations",
    description: "Notify clients when a booking is confirmed",
    enabled: true,
  },
  {
    id: "staff_notifications",
    label: "Staff Notifications",
    description: "Notify staff when assigned to new appointments",
    enabled: false,
  },
  {
    id: "payment_receipts",
    label: "Payment Receipts",
    description: "Send payment receipts to clients after checkout",
    enabled: true,
  },
];

export default async function SettingsPage() {
  const salon = await prisma.salon.findFirst();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-7 h-7 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Configure your salon preferences</p>
      </div>

      <div className="space-y-6">
        {/* Salon Settings Form */}
        <SettingsForm
          salon={{
            name: salon?.name ?? "",
            address: salon?.address ?? null,
            city: salon?.city ?? null,
            country: salon?.country ?? "US",
            timezone: salon?.timezone ?? "UTC",
            currency: salon?.currency ?? "USD",
            phone: salon?.phone ?? null,
            email: salon?.email ?? null,
            taxRate: salon?.taxRate ?? 0,
            invoicePrefix: salon?.invoicePrefix ?? "INV",
            invoiceFooter: salon?.invoiceFooter ?? null,
            businessHours: salon?.businessHours ?? null,
          }}
        />

        {/* Online Booking Link */}
        {salon?.slug && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                Online Booking Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Share this link with clients so they can request appointments online.
              </p>
              <BookingLink slug={salon.slug} />
            </CardContent>
          </Card>
        )}

        {/* Notifications — UI only */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {NOTIFICATION_SETTINGS.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  {/* Toggle UI — read-only for now */}
                  <button
                    type="button"
                    aria-label={`Toggle ${item.label}`}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
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
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Notification configuration coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
