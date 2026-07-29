"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useCallback } from "react";
import { Search, X, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

export function InvoiceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // reset to page 1 on filter change
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push(pathname);
    });
  }, [pathname, router]);

  const q = searchParams.get("q") ?? "";
  const method = searchParams.get("method") ?? "";
  const range = searchParams.get("range") ?? "";
  const status = searchParams.get("status") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const minAmount = searchParams.get("minAmount") ?? "";

  const hasFilters = q || method || range || status || from || to || minAmount;

  const selectClass =
    "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Text search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by client name…"
            className="pl-8"
            defaultValue={q}
            onChange={(e) => {
              const val = e.target.value;
              const id = setTimeout(() => updateParam("q", val), 300);
              return () => clearTimeout(id);
            }}
          />
        </div>

        {/* Payment method */}
        <select
          className={selectClass}
          value={method}
          onChange={(e) => updateParam("method", e.target.value)}
        >
          <option value="">All methods</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="ONLINE">Online</option>
          <option value="OTHER">Other</option>
        </select>

        {/* Date range preset */}
        <select
          className={selectClass}
          value={range}
          onChange={(e) => {
            updateParam("range", e.target.value);
            // Clear custom date range when using preset
            if (e.target.value) {
              const params = new URLSearchParams(searchParams.toString());
              params.set("range", e.target.value);
              params.delete("from");
              params.delete("to");
              params.delete("page");
              startTransition(() => router.push(`${pathname}?${params.toString()}`));
            }
          }}
        >
          <option value="">All time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
        </select>

        {/* Status */}
        <select
          className={selectClass}
          value={status}
          onChange={(e) => updateParam("status", e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="VOID">Void</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Second row: custom date range + min amount */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">From</span>
          <Input
            type="date"
            className="h-8 w-36 text-sm"
            value={from}
            onChange={(e) => {
              updateParam("from", e.target.value);
              // Clear range preset if custom dates used
              if (range) updateParam("range", "");
            }}
          />
          <span className="text-xs text-muted-foreground">To</span>
          <Input
            type="date"
            className="h-8 w-36 text-sm"
            value={to}
            onChange={(e) => {
              updateParam("to", e.target.value);
              if (range) updateParam("range", "");
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Min amount</span>
          <Input
            type="number"
            placeholder="0"
            min="0"
            step="0.01"
            className="h-8 w-24 text-sm"
            defaultValue={minAmount}
            onChange={(e) => {
              const val = e.target.value;
              const id = setTimeout(() => updateParam("minAmount", val), 300);
              return () => clearTimeout(id);
            }}
          />
        </div>
      </div>
    </div>
  );
}
