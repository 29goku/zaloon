import { CreditCard, ArrowLeft, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PLAN_FEATURES = [
  "Unlimited appointments",
  "Up to 20 staff members",
  "Client CRM & loyalty program",
  "Online booking widget",
  "SMS & email reminders",
  "Reports & analytics",
  "Multi-location support (Beta)",
  "Priority support",
];

export default function BillingPage() {
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
          <CreditCard className="w-7 h-7 text-primary" />
          Billing
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and payment details
        </p>
      </div>

      <div className="space-y-6">
        {/* Current plan */}
        <Card className="bg-card border-border border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Current Plan
              </CardTitle>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-foreground">$49</span>
              <span className="text-muted-foreground text-sm mb-1">/month</span>
            </div>
            <p className="text-base font-semibold text-foreground">Professional Plan</p>

            <div className="pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-2">
                {PLAN_FEATURES.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next billing */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Next billing date</span>
              <span className="text-sm font-medium text-foreground">Aug 1, 2026</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Amount due</span>
              <span className="text-sm font-medium text-foreground">$49.00</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Payment method</span>
              <span className="text-sm font-medium text-foreground">Visa •••• 4242</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Billing cycle</span>
              <span className="text-sm font-medium text-foreground">Monthly</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="h-9 px-4 rounded-xl text-sm font-medium border border-border bg-secondary hover:bg-muted text-foreground transition-colors"
              >
                Update payment method
              </button>
              <button
                type="button"
                className="h-9 px-4 rounded-xl text-sm font-medium border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
              >
                Download invoice
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade / change plan */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Compare Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Need more features? Upgrade to Enterprise for unlimited staff, white-label branding, and a dedicated account manager.
            </p>
            <button
              type="button"
              className="h-9 px-4 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              View all plans
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
