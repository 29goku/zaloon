import Link from "next/link";
import {
  DollarSign,
  Scissors,
  Users,
  UserCircle,
  CalendarDays,
  Receipt,
  ArrowRight,
  BarChart3,
  Building2,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ── report card definitions ───────────────────────────────────────────────

const REPORT_CARDS = [
  {
    title: "Revenue Report",
    description: "Revenue trends, payment methods, top services by revenue",
    href: "/dashboard/reports/revenue",
    icon: DollarSign,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-500",
    accent: "border-emerald-500/20",
  },
  {
    title: "Service Performance",
    description: "Service stats, category comparison, service trends",
    href: "/dashboard/reports/services",
    icon: Scissors,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-500",
    accent: "border-amber-500/20",
  },
  {
    title: "Staff Performance",
    description: "Staff metrics, utilization, revenue per staff",
    href: "/dashboard/reports/staff",
    icon: Users,
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    accent: "border-blue-500/20",
  },
  {
    title: "Client Analytics",
    description: "Acquisition, retention, lifetime value, demographics",
    href: "/dashboard/reports/clients",
    icon: UserCircle,
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-400",
    accent: "border-purple-500/20",
  },
  {
    title: "Appointment Analytics",
    description: "Status breakdown, hourly patterns, no-show analysis",
    href: "/dashboard/reports/appointments",
    icon: CalendarDays,
    iconBg: "bg-[#F48E16]/15",
    iconColor: "text-[#F48E16]",
    accent: "border-[#F48E16]/20",
  },
  {
    title: "Expense Report",
    description: "Full expense breakdown — see Finance dashboard",
    href: "/dashboard/finance",
    icon: Receipt,
    iconBg: "bg-[#F41666]/15",
    iconColor: "text-[#F41666]",
    accent: "border-[#F41666]/20",
  },
  {
    title: "Branch Overview",
    description: "Compare appointments, revenue, and staff across all branches",
    href: "/dashboard/reports/branches",
    icon: Building2,
    iconBg: "bg-teal-500/15",
    iconColor: "text-teal-500",
    accent: "border-teal-500/20",
  },
] as const;

// ── page ─────────────────────────────────────────────────────────────────────

export default function ReportsHubPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Reports &amp; Analytics</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Explore detailed reports across revenue, services, staff, clients, appointments, and expenses.
          </p>
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="rounded-xl border border-border bg-card px-6 py-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">
          Quick navigation
        </p>
        <p className="text-sm text-muted-foreground">
          Select a report below to drill into specific business metrics. Each report supports period
          filtering and exports.
        </p>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORT_CARDS.map(({ title, description, href, icon: Icon, iconBg, iconColor, accent }) => (
          <Link
            key={href}
            href={href}
            className={`group relative flex flex-col gap-4 rounded-xl border bg-card p-5 transition-all hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 ${accent}`}
          >
            {/* Icon */}
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1">
              <h2 className="text-base font-semibold text-foreground leading-snug">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
              View Report
              <ArrowRight className="h-3.5 w-3.5" />
            </div>

            {/* Subtle gradient overlay on hover */}
            <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/[0.02] to-transparent" />
          </Link>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        All reports reflect your salon&apos;s live data. Use the period filters within each report to
        narrow date ranges.
      </p>
    </div>
  );
}
