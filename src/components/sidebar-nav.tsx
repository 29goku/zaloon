"use client";

import React from "react";
import Link from "next/link";
import type { Features } from "@/lib/feature-flags";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  UserCircle,
  BarChart3,
  BarChart2,
  Settings,
  Settings2,
  Zap,
  BookOpen,
  Receipt,
  Banknote,
  Bell,
  ClipboardList,
  Star,
  DollarSign,
  CalendarOff,
  CalendarRange,
  Umbrella,
  Tag,
  Package,
  Package2,
  CreditCard,
  Gift,
  Code2,
  Megaphone,
  Award,
  Building2,
  Palette,
  TrendingUp,
  Mail,
  MessageSquare,
  Clock,
  Percent,
  Target,
  Activity,
  Monitor,
  XCircle,
  Layers,
  CheckSquare,
  Download,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LocationSwitcher } from "@/components/sidebar/location-switcher";
import type { SalonLocation } from "@/components/sidebar/location-switcher";

type NavItem = { href: string; label: string; icon: React.ElementType; indent?: boolean };

function buildNavItems(f: Features): NavItem[] {
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/activity", label: "Activity Log", icon: Activity },
    { href: "/dashboard/appointments", label: "Appointments", icon: CalendarDays },
    { href: "/dashboard/staff", label: "Staff", icon: Users },
    { href: "/dashboard/staff/schedule", label: "Schedule", icon: CalendarRange, indent: true },
    { href: "/dashboard/staff/time-off", label: "Time Off", icon: Umbrella, indent: true },
    { href: "/dashboard/staff/availability", label: "Availability", icon: CalendarOff, indent: true },
    { href: "/dashboard/staff/performance", label: "Performance", icon: BarChart2, indent: true },
    { href: "/dashboard/staff/payroll", label: "Payroll", icon: Banknote, indent: true },
    { href: "/dashboard/staff/timeclock", label: "Time Clock", icon: Clock, indent: true },
    { href: "/dashboard/staff/leaderboard", label: "Leaderboard", icon: Award, indent: true },
    ...(f.FINANCE ? [
      { href: "/dashboard/finance", label: "Finance", icon: TrendingUp },
      { href: "/dashboard/finance/tips", label: "Tips", icon: DollarSign, indent: true },
      { href: "/dashboard/finance/tax", label: "Tax Report", icon: Receipt, indent: true },
      { href: "/dashboard/payroll", label: "Payroll", icon: Banknote, indent: true },
      { href: "/dashboard/finance/forecast", label: "Forecast", icon: TrendingUp, indent: true },
      { href: "/dashboard/finance/goals", label: "Goals", icon: Target, indent: true },
      { href: "/dashboard/finance/breakeven", label: "Break-even", icon: Activity, indent: true },
      { href: "/dashboard/finance/expenses", label: "Expenses", icon: Receipt, indent: true },
      { href: "/dashboard/finance/budget", label: "Budget", icon: Target, indent: true },
    ] as NavItem[] : []),
    { href: "/dashboard/services", label: "Services", icon: Scissors },
    { href: "/dashboard/services/packages", label: "Packages", icon: Package2, indent: true },
    { href: "/dashboard/services/addons", label: "Add-ons", icon: Layers, indent: true },
    { href: "/dashboard/services/pricing", label: "Dynamic Pricing", icon: Zap, indent: true },
    { href: "/dashboard/clients", label: "Clients", icon: UserCircle },
    { href: "/dashboard/clients/retention", label: "Retention", icon: TrendingUp, indent: true },
    { href: "/dashboard/ledger", label: "Ledger", icon: BookOpen },
    ...(f.OPERATIONS ? [
      { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
      { href: "/dashboard/quick-pay", label: "Quick Pay", icon: Zap },
      { href: "/dashboard/expenses", label: "Expenses", icon: Receipt },
      { href: "/dashboard/coupons", label: "Coupons", icon: Tag },
      { href: "/dashboard/reviews", label: "Reviews", icon: Star },
      { href: "/dashboard/inventory", label: "Inventory", icon: Package },
      { href: "/dashboard/loyalty", label: "Loyalty Program", icon: Award },
      { href: "/dashboard/memberships", label: "Memberships", icon: CreditCard },
      { href: "/dashboard/gift-cards", label: "Gift Cards", icon: Gift },
    ] as NavItem[] : []),
    ...(f.REPORTS ? [
      { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
      { href: "/dashboard/reports/revenue", label: "Revenue", icon: DollarSign, indent: true },
      { href: "/dashboard/reports/services", label: "Services", icon: Scissors, indent: true },
      { href: "/dashboard/reports/staff", label: "Staff", icon: BarChart2, indent: true },
      { href: "/dashboard/reports/clients", label: "Clients", icon: UserCircle, indent: true },
      { href: "/dashboard/reports/appointments", label: "Appointments", icon: CalendarDays, indent: true },
    ] as NavItem[] : []),
    ...(f.OPERATIONS ? [
      { href: "/dashboard/communications", label: "Messages", icon: MessageSquare },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/reminders", label: "Reminders", icon: Bell },
    ] as NavItem[] : []),
    { href: "/dashboard/waitlist", label: "Waitlist", icon: ClipboardList },
    { href: "/dashboard/kiosk", label: "Kiosk View", icon: Monitor },
    { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/settings/notifications", label: "Notifications", icon: Bell, indent: true },
  { href: "/dashboard/settings/loyalty", label: "Loyalty Program", icon: Star, indent: true },
  { href: "/dashboard/settings/booking-widget", label: "Booking Widget", icon: Code2, indent: true },
  { href: "/dashboard/settings/branches", label: "Branches", icon: Building2, indent: true },
  { href: "/dashboard/settings/appearance", label: "Appearance", icon: Palette, indent: true },
  { href: "/dashboard/settings/automations", label: "Automations", icon: Zap, indent: true },
  { href: "/dashboard/settings/booking", label: "Booking Rules", icon: Settings2, indent: true },
  { href: "/dashboard/settings/templates", label: "Message Templates", icon: MessageSquare, indent: true },
  { href: "/dashboard/settings/digest", label: "Digest Reports", icon: Mail, indent: true },
  { href: "/dashboard/settings/tax", label: "Tax Settings", icon: Percent, indent: true },
  { href: "/dashboard/settings/reminders", label: "Reminders", icon: Bell, indent: true },
  { href: "/dashboard/settings/cancellation-policy", label: "Cancellation Policy", icon: XCircle, indent: true },
  { href: "/dashboard/settings/deposit-policy", label: "Deposits", icon: CreditCard, indent: true },
  { href: "/dashboard/settings/blackout-dates", label: "Blackout Dates", icon: CalendarOff, indent: true },
  { href: "/dashboard/settings/booking-confirmations", label: "Confirmation Templates", icon: MessageSquare, indent: true },
  { href: "/dashboard/settings/export", label: "Export Data", icon: Download, indent: true },
  { href: "/dashboard/settings/import", label: "Import Data", icon: Upload, indent: true },
  ];
}

interface SidebarNavProps {
  onClose?: () => void;
  salonName?: string;
  salonLocations?: SalonLocation[];
  pendingReminderCount?: number;
  features?: Features;
}

const DEFAULT_FEATURES: Features = { FINANCE: false, REPORTS: false, OPERATIONS: false };

export function SidebarNav({ onClose, salonName = "My Salon", salonLocations = [], pendingReminderCount = 0, features = DEFAULT_FEATURES }: SidebarNavProps) {
  const pathname = usePathname();
  const navItems = buildNavItems(features);

  return (
    <aside className="flex flex-col h-full w-full bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border flex-shrink-0">
        <span className="text-2xl font-bold tracking-tight flex items-center gap-0">
          <span className="text-primary">zal</span>
          {/* Scissors as the two "o"s */}
          <svg
            viewBox="0 0 28 18"
            width="32"
            height="20"
            fill="none"
            className="inline-block align-middle text-foreground"
            aria-hidden="true"
          >
            {/* Left blade */}
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <line x1="7.5" y1="7" x2="18" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            {/* Right blade */}
            <circle cx="23" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <line x1="20.5" y1="7" x2="10" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            {/* Pivot dot */}
            <circle cx="14" cy="11.5" r="1.2" fill="currentColor" />
          </svg>
          <span className="text-foreground">n</span>
        </span>
      </div>

      {/* Location switcher */}
      <LocationSwitcher locations={salonLocations} />

      {/* Nav */}
      <nav className="flex-1 py-5 px-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, indent }) => {
          let isActive: boolean;
          if (href === "/dashboard") {
            isActive = pathname === "/dashboard";
          } else if (href === "/dashboard/staff") {
            // Staff is active only when on the staff page itself, not payroll sub-pages
            isActive = pathname === "/dashboard/staff";
          } else {
            isActive = pathname === href || pathname.startsWith(href + "/");
          }
          const isReminders = href === "/dashboard/reminders";
          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all",
                indent && "ml-4 py-2 text-xs",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_0_16px_rgba(180,239,165,0.25)]"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("flex-shrink-0", indent ? "w-4 h-4" : "w-[18px] h-[18px]")} />
              {label}
              {isReminders && pendingReminderCount > 0 && (
                <span className={cn(
                  "ml-auto text-[10px] font-bold leading-none rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary text-primary-foreground"
                )}>
                  {pendingReminderCount > 99 ? "99+" : pendingReminderCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
            S
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{salonName}</p>
            <p className="text-xs text-muted-foreground truncate">Owner</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
