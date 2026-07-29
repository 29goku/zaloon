"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { CalendarRange } from "lucide-react";

interface DateRangePickerProps {
  from: string;
  to: string;
}

export function DateRangePicker({ from, to }: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.push(pathname + "?" + params.toString());
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5">
      <CalendarRange className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex items-center gap-2 text-sm">
        <label className="text-muted-foreground">From</label>
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => updateParam("from", e.target.value)}
          className="bg-transparent text-foreground border-none outline-none cursor-pointer [color-scheme:dark] text-sm"
        />
        <span className="text-muted-foreground">to</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => updateParam("to", e.target.value)}
          className="bg-transparent text-foreground border-none outline-none cursor-pointer [color-scheme:dark] text-sm"
        />
      </div>
    </div>
  );
}
