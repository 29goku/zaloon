"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useCallback } from "react";
import { Search, X } from "lucide-react";
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

  const hasFilters = q || method || range || status;

  return (
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
            // Debounce by 300ms
            const id = setTimeout(() => updateParam("q", val), 300);
            return () => clearTimeout(id);
          }}
        />
      </div>

      {/* Payment method */}
      <select
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={method}
        onChange={(e) => updateParam("method", e.target.value)}
      >
        <option value="">All methods</option>
        <option value="CASH">Cash</option>
        <option value="CARD">Card</option>
        <option value="ONLINE">Online</option>
        <option value="OTHER">Other</option>
      </select>

      {/* Date range */}
      <select
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={range}
        onChange={(e) => updateParam("range", e.target.value)}
      >
        <option value="">All time</option>
        <option value="today">Today</option>
        <option value="week">This week</option>
        <option value="month">This month</option>
        <option value="year">This year</option>
      </select>

      {/* Status */}
      <select
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={status}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="PAID">Paid</option>
        <option value="VOID">Void</option>
        <option value="PENDING">Pending</option>
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
  );
}
