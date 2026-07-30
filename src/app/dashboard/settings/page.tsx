import Link from "next/link";
import {
  Building2,
  Clock,
  Scissors,
  Users,
  Bell,
  Star,
  Code2,
  Building,
  CreditCard,
  Plug,
  Palette,
  Tablet,
  ArrowRight,
  ExternalLink,
  HardDrive,
  Zap,
  CalendarClock,
  Brush,
  ClipboardList,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { IntakeLinkCopy } from "./intake-link-copy";

export const dynamic = "force-dynamic";

const SETTINGS_CATEGORIES = [
  {
    href: "/dashboard/settings/general",
    icon: Building2,
    label: "General",
    description: "Salon info, timezone, currency, invoice settings",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    href: "/dashboard/settings/branding",
    icon: Brush,
    label: "Branding",
    description: "Logo, tagline, social links, business hours, and invoice settings",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  {
    href: "/dashboard/settings/booking",
    icon: CalendarClock,
    label: "Online Booking",
    description: "Booking window, slot intervals, cancellation policy, and deposits",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    href: "/dashboard/settings/profile",
    icon: Building2,
    label: "Salon Profile",
    description: "Name, address, contact info, logo",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  {
    href: "/dashboard/settings/hours",
    icon: Clock,
    label: "Business Hours",
    description: "Weekly schedule with open/close times",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    href: "/dashboard/services",
    icon: Scissors,
    label: "Services",
    description: "Manage your service catalog",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    href: "/dashboard/staff",
    icon: Users,
    label: "Staff",
    description: "Staff members and permissions",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  {
    href: "/dashboard/settings/users",
    icon: Users,
    label: "Team & Users",
    description: "Dashboard access, roles, and invites",
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-400/10",
  },
  {
    href: "/dashboard/settings/notifications",
    icon: Bell,
    label: "Notifications",
    description: "Reminder and confirmation preferences",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    href: "/dashboard/loyalty",
    icon: Star,
    label: "Loyalty Program",
    description: "Points, tiers, and rewards config",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    href: "/dashboard/settings/booking-widget",
    icon: Code2,
    label: "Booking Widget",
    description: "Embed configuration and QR code",
    color: "text-green-400",
    bg: "bg-green-400/10",
  },
  {
    href: "/dashboard/settings/branches",
    icon: Building,
    label: "Branches",
    description: "Multi-location management",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    href: "/dashboard/settings/billing",
    icon: CreditCard,
    label: "Billing",
    description: "Subscription and payment info",
    color: "text-teal-400",
    bg: "bg-teal-400/10",
  },
  {
    href: "/dashboard/settings/integrations",
    icon: Plug,
    label: "Integrations",
    description: "Google Calendar, WhatsApp, Stripe, Zapier",
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
  },
  {
    href: "/dashboard/settings/appearance",
    icon: Palette,
    label: "Appearance",
    description: "Brand colours, dark mode, and compact layout",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    href: "/dashboard/settings/data",
    icon: HardDrive,
    label: "Data & Privacy",
    description: "Export data, backups, and cleanup tools",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
  },
  {
    href: "/dashboard/settings/automations",
    icon: Zap,
    label: "Automations",
    description: "Rules engine for appointment reminders and follow-ups",
    color: "text-lime-400",
    bg: "bg-lime-400/10",
  },
];

export default async function SettingsHubPage() {
  // Fetch the first salon slug for the kiosk link
  const salon = await prisma.salon.findFirst({
    select: { slug: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const kioskUrl = salon ? `/kiosk/${salon.slug}` : null;
  const intakeUrl = salon ? `/intake/${salon.slug}` : null;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure every aspect of your salon
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SETTINGS_CATEGORIES.map(({ href, icon: Icon, label, description, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-card/80 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {description}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              Configure
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Intake Form Card ─────────────────────────────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">Booking &amp; Intake</h2>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-400/10 flex items-center justify-center shrink-0">
              <ClipboardList className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">Client Intake Form</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Share this link with new clients before their first visit. They fill out a short form so you have their details on file.
              </p>

              {intakeUrl ? (
                <div className="mt-4 space-y-3">
                  <IntakeLinkCopy intakePath={intakeUrl} />
                  <Link
                    href="/dashboard/settings/intake-form"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-secondary/60 transition-colors"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Edit form fields
                  </Link>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground italic">
                  No salon found — complete onboarding to enable the intake form.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Kiosk Mode Card ──────────────────────────────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">Kiosk Mode</h2>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-400/10 flex items-center justify-center shrink-0">
              <Tablet className="w-6 h-6 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">Client Check-In Kiosk</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Set up a tablet at your front desk so clients can self check-in for appointments
                or add themselves to the walk-in waitlist — no staff needed.
              </p>

              {kioskUrl ? (
                <>
                  {/* Kiosk URL display + open link */}
                  <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs font-mono text-foreground border border-border">
                      {typeof window === "undefined"
                        ? kioskUrl
                        : `${window.location.origin}${kioskUrl}`}
                    </code>
                    <Link
                      href={kioskUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 shrink-0 rounded-lg bg-rose-600 text-white text-sm font-medium px-4 py-2 hover:bg-rose-700 transition-colors"
                    >
                      Open Kiosk
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Setup instructions */}
                  <div className="mt-4 rounded-xl bg-muted/50 border border-border p-4">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
                      Tablet setup tips
                    </p>
                    <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                      <li>Open the kiosk URL in your tablet browser and bookmark it</li>
                      <li>Enable <strong>Guided Access</strong> (iOS) or <strong>Screen Pinning</strong> (Android) to lock the browser</li>
                      <li>Set the screen to stay awake in display settings</li>
                      <li>For iPad: add to Home Screen via Share → "Add to Home Screen" for a full-screen experience</li>
                    </ul>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground italic">
                  No salon found — complete onboarding to enable kiosk mode.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
