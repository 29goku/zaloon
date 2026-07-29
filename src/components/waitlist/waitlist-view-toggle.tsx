"use client";

import * as React from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WaitlistKanban } from "./waitlist-kanban";
import type { KanbanEntry } from "./waitlist-kanban";

export type { KanbanEntry };

interface WaitlistViewToggleProps {
  entries: KanbanEntry[];
  totalWaiting: number;
  tableContent: React.ReactNode;
  services?: { id: string; name: string }[];
  staff?: { id: string; name: string }[];
  bookingLink?: string;
}

export function WaitlistViewToggle({
  entries,
  totalWaiting,
  tableContent,
  services,
  staff,
  bookingLink,
}: WaitlistViewToggleProps) {
  const [view, setView] = React.useState<"table" | "kanban">("table");

  return (
    <div className="space-y-4">
      {/* Toggle buttons */}
      <div className="flex items-center gap-1 self-end">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0",
            view === "table"
              ? "bg-muted text-foreground"
              : "text-muted-foreground"
          )}
          onClick={() => setView("table")}
          title="Table view"
        >
          <Table2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0",
            view === "kanban"
              ? "bg-muted text-foreground"
              : "text-muted-foreground"
          )}
          onClick={() => setView("kanban")}
          title="Kanban view"
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>
      </div>

      {view === "table" ? (
        tableContent
      ) : (
        <WaitlistKanban
          entries={entries}
          totalWaiting={totalWaiting}
          services={services}
          staff={staff}
          bookingLink={bookingLink}
        />
      )}
    </div>
  );
}
