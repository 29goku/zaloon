"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  UserCircle,
  BarChart3,
  Settings,
  Zap,
  BookOpen,
  Receipt,
  Banknote,
  Bell,
  ClipboardList,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/dashboard/staff", label: "Staff", icon: Users },
  { href: "/dashboard/staff/payroll", label: "Payroll", icon: Banknote, indent: true },
  { href: "/dashboard/services", label: "Services", icon: Scissors },
  { href: "/dashboard/clients", label: "Clients", icon: UserCircle },
  { href: "/dashboard/ledger", label: "Ledger", icon: BookOpen },
  { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
  { href: "/dashboard/quick-pay", label: "Quick Pay", icon: Zap },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/reminders", label: "Reminders", icon: Bell },
  { href: "/dashboard/waitlist", label: "Waitlist", icon: ClipboardList },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarNavProps {
  onClose?: () => void;
  salonName?: string;
  pendingReminderCount?: number;
}

export function SidebarNav({ onClose, salonName = "My Salon", pendingReminderCount = 0 }: SidebarNavProps) {
  const pathname = usePathname();

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
              key={href}
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
