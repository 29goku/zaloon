import { CreditCard, ArrowLeft, CheckCircle2, Zap, ExternalLink, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBillingInfo } from "@/app/actions/billing";

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

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const billing = await getBillingInfo();
  const stripeConfigured = !billing.isMock;
  const currencySymbol = billing.currency === "usd" ? "$" : billing.currency.toUpperCase() + " ";

  return (
    <div className="p-4 md:p-8 max-w-2xl">
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
                {stripeConfigured ? "Active" : "Self-hosted"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {stripeConfigured ? (
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {currencySymbol}{billing.amount.toFixed(0)}
                </span>
                <span className="text-muted-foreground text-sm mb-1">/month</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No subscription configured — this is a self-hosted instance.
              </p>
            )}
            <p className="text-base font-semibold text-foreground">{billing.plan}</p>

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

        {/* Payment details */}
        {stripeConfigured ? (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {billing.nextBillingDate && (
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Next billing date</span>
                  <span className="text-sm font-medium text-foreground">{billing.nextBillingDate}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Amount due</span>
                <span className="text-sm font-medium text-foreground">
                  {currencySymbol}{billing.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Payment method</span>
                <span className="text-sm font-medium text-foreground">
                  {billing.paymentMethodDisplay ?? "No payment method on file"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Billing cycle</span>
                <span className="text-sm font-medium text-foreground">{billing.billingCycle}</span>
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
        ) : (
          <Card className="bg-card border-border border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Set Up Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Stripe is not yet configured for this instance. To enable subscription billing
                and online payments, add your Stripe API keys to your environment variables.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Create a Stripe account at{" "}
                  <a
                    href="https://stripe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    stripe.com
                  </a>
                </li>
                <li>
                  Copy your API keys from the{" "}
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    Stripe Dashboard
                  </a>
                </li>
                <li>
                  Add{" "}
                  <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">
                    STRIPE_SECRET_KEY
                  </code>{" "}
                  and{" "}
                  <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">
                    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                  </code>{" "}
                  to your environment variables
                </li>
              </ol>
              <a
                href="https://vercel.com/docs/projects/environment-variables"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Vercel environment variables docs
              </a>
            </CardContent>
          </Card>
        )}

        {/* Recent invoices — shown only when Stripe is live */}
        {stripeConfigured && billing.invoices.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {billing.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.date}</p>
                    <p className="text-xs text-muted-foreground capitalize">{inv.status}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {inv.currency === "usd" ? "$" : inv.currency.toUpperCase() + " "}
                      {inv.amount.toFixed(2)}
                    </span>
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:text-primary/80 transition-colors"
                        title="Download PDF"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
