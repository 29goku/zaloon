"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "birthday", label: "Birthdays" },
] as const;

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "visits", label: "Most Visits" },
  { value: "balance", label: "Balance" },
  { value: "lastVisit", label: "Last Visit" },
] as const;

type FilterValue = (typeof FILTER_OPTIONS)[number]["value"];
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function ClientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") ?? "";
  const currentFilter = (searchParams.get("filter") ?? "all") as FilterValue;
  const currentSort = (searchParams.get("sortBy") ?? "name") as SortValue;

  const [searchValue, setSearchValue] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync when URL changes externally
  useEffect(() => {
    setSearchValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  const pushParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === "" || value === "all" || value === "name") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Always remove defaults to keep URLs clean
      if (params.get("filter") === "all") params.delete("filter");
      if (params.get("sortBy") === "name") params.delete("sortBy");

      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [router, pathname, searchParams]
  );

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams({ search: value });
    }, 300);
  }

  function handleFilterChange(value: FilterValue) {
    pushParams({ filter: value });
  }

  function handleSortChange(value: SortValue | null) {
    if (!value) return;
    pushParams({ sortBy: value });
  }

  // Count active (non-default) filters for the badge
  const activeFilterCount = [
    currentFilter !== "all",
    currentSort !== "name",
    currentSearch !== "",
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search clients…"
          value={searchValue}
          onChange={handleSearchChange}
          className="pl-8 w-48"
        />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleFilterChange(opt.value)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
              currentFilter === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-36 gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Sort:</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active filter badge indicator */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="icon"
          title={`${activeFilterCount} active filter${activeFilterCount > 1 ? "s" : ""}`}
          onClick={() => router.push(pathname)}
          className="relative"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {activeFilterCount}
          </span>
        </Button>
      )}
    </div>
  );
}
