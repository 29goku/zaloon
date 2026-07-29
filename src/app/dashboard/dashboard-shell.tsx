"use client";

import { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Toaster } from "@/components/ui/toast";
import { GlobalSearch } from "@/components/search/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

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
  pendingReminderCount = 0,
}: {
  children: React.ReactNode;
  salonName: string;
  pendingReminderCount?: number;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:z-20">
        <SidebarNav salonName={salonName} pendingReminderCount={pendingReminderCount} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen ml-0 md:ml-64">
        {/* Top header */}
        <header className="sticky top-0 z-10 flex items-center gap-2 md:gap-3 h-16 px-3 md:px-6 bg-background/95 backdrop-blur-sm border-b border-border">
          {/* Mobile hamburger */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              className="md:hidden flex-shrink-0 inline-flex items-center justify-center rounded-md w-9 h-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64" showCloseButton={false}>
              <SidebarNav salonName={salonName} pendingReminderCount={pendingReminderCount} onClose={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Search — takes remaining space, max-width on larger screens */}
          <div className="flex-1 min-w-0 max-w-md">
            <GlobalSearch />
          </div>

          {/* Date — hidden on very small screens to give search room */}
          <TodayDate />

          {/* Notification bell — always visible */}
          <div className="flex-shrink-0">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 pb-16 md:pb-0">
          {children}
        </main>
      </div>

      <MobileNav />
      <Toaster />
    </div>
  );
}
