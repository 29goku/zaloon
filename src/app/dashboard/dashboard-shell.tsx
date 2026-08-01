"use client";

import { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Toaster } from "@/components/ui/toast";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPaletteProvider } from "@/components/search/command-palette";
import { SearchButton } from "@/components/search/search-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { QuickActionsFab } from "@/components/dashboard/quick-actions-fab";
import { BranchSelector } from "@/components/branches/branch-selector";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import type { SalonLocation } from "@/components/sidebar/location-switcher";
import type { Branch } from "@/app/actions/branches";
import type { Features } from "@/lib/feature-flags";

function TodayDate() {
  const now = new Date();
  const shortFormatted = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const longFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <>
      {/* Short date on small-to-medium screens, hidden when search is active */}
      <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:block md:hidden" aria-hidden="true">
        {shortFormatted}
      </span>
      {/* Full date on large screens */}
      <span className="text-sm text-muted-foreground whitespace-nowrap hidden md:block">
        {longFormatted}
      </span>
    </>
  );
}

export function DashboardShell({
  children,
  salonName,
  salonLocations = [],
  pendingReminderCount = 0,
  branches = [],
  features,
}: {
  children: React.ReactNode;
  salonName: string;
  salonLocations?: SalonLocation[];
  pendingReminderCount?: number;
  branches?: Branch[];
  features?: Features;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar — visible at lg+ */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:z-20">
          <SidebarNav
            salonName={salonName}
            salonLocations={salonLocations}
            pendingReminderCount={pendingReminderCount}
            features={features}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-screen ml-0 lg:ml-64">
          {/* Top header */}
          <header className="sticky top-0 z-10 flex items-center gap-2 lg:gap-3 h-16 px-3 lg:px-6 bg-background/95 backdrop-blur-sm border-b border-border">
            {/* Mobile hamburger — visible until lg */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger
                className="lg:hidden flex-shrink-0 inline-flex items-center justify-center rounded-md w-9 h-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64" showCloseButton={false}>
                <SidebarNav
                  salonName={salonName}
                  salonLocations={salonLocations}
                  pendingReminderCount={pendingReminderCount}
                  onClose={() => setSheetOpen(false)}
                  features={features}
                />
              </SheetContent>
            </Sheet>

            {/* Search button — opens command palette on click or ⌘K */}
            <div className="flex-1 min-w-0 max-w-md">
              <SearchButton />
            </div>

            {/* Right-side controls pushed to the far edge */}
            <div className="ml-auto flex items-center gap-2 lg:gap-3 flex-shrink-0">
              {/* Branch selector — only shown when 2+ branches configured */}
              <BranchSelector branches={branches} />

              {/* Date — hidden on very small screens */}
              <TodayDate />

              {/* Notification bell — always visible */}
              <NotificationBell />

              {/* Theme toggle — hidden on mobile */}
              <div className="hidden lg:block">
                <ThemeToggle variant="header" />
              </div>
            </div>
          </header>

          <main className="flex-1 pb-16 lg:pb-0">
            {children}
          </main>
        </div>

        <MobileNav features={features} />
        <QuickActionsFab />
        <Toaster />
      </div>
    </CommandPaletteProvider>
  );
}
