"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

function offsetDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().split("T")[0];
}

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatFull(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

interface DateNavProps {
  currentDate: string; // YYYY-MM-DD or "upcoming"
}

export function DateNav({ currentDate }: DateNavProps) {
  const router = useRouter();

  const isUpcoming = currentDate === "upcoming";
  const today = todayStr();
  const displayDate = isUpcoming ? today : currentDate;
  const isToday = displayDate === today;

  function navigate(date: string) {
    router.push(`/dashboard/appointments?date=${date}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate(offsetDate(displayDate, -1))}
          aria-label="Previous day"
          disabled={isUpcoming}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2 min-w-[220px] justify-center">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          {isUpcoming ? (
            <span className="text-sm font-semibold text-foreground">All upcoming</span>
          ) : (
            <span className="text-sm font-semibold text-foreground">
              {formatFull(currentDate)}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate(offsetDate(displayDate, 1))}
          aria-label="Next day"
          disabled={isUpcoming}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {!isToday && !isUpcoming && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => navigate(today)}
        >
          Today
        </Button>
      )}

      <Button
        variant={isUpcoming ? "secondary" : "ghost"}
        size="sm"
        className="h-8 text-xs"
        onClick={() => navigate("upcoming")}
      >
        All upcoming
      </Button>
    </div>
  );
}
