"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  UserCircle,
  MoreHorizontal,
  Receipt,
  BarChart3,
  Settings,
  Users,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCommandPalette } from "@/components/search/command-palette";

const primaryNavItems = [
  { href: "/dashboard/today", label: "Today", icon: CalendarCheck },
  { href: "/dashboard/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/dashboard/clients", label: "Clients", icon: UserCircle },
];

const moreNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/staff", label: "Staff", icon: Users },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { setOpen: openSearch } = useCommandPalette();

  // Check if the current path matches any "more" item so we can highlight the More tab.
  // For "/dashboard" we require an exact match — otherwise every route would match
  // because all paths start with "/dashboard".
  const isMoreActive = moreNavItems.some(({ href }) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)
  );

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-sidebar border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch h-16">
          {primaryNavItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-sidebar-foreground hover:text-primary"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive && "drop-shadow-[0_0_6px_rgba(244,142,22,0.5)]"
                  )}
                />
                <span className="leading-none">{label}</span>
              </Link>
            );
          })}

          {/* Search tab */}
          <button
            type="button"
            onClick={() => openSearch(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors text-sidebar-foreground hover:text-primary"
            aria-label="Search (⌘K)"
          >
            <Search className="w-5 h-5 flex-shrink-0" />
            <span className="leading-none">Search</span>
          </button>

          {/* More tab */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              isMoreActive
                ? "text-primary"
                : "text-sidebar-foreground hover:text-primary"
            )}
            aria-label="More navigation options"
          >
            <MoreHorizontal
              className={cn(
                "w-5 h-5 flex-shrink-0",
                isMoreActive && "drop-shadow-[0_0_6px_rgba(244,142,22,0.5)]"
              )}
            />
            <span className="leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="mb-4 p-0">
            <SheetTitle className="text-base">More</SheetTitle>
          </SheetHeader>
          <nav className="grid grid-cols-2 gap-3">
            {moreNavItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors border",
                    isActive
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/50 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
