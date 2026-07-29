"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, UserCircle, Users, Scissors, CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { globalSearch, type GlobalSearchResult } from "@/app/actions/search";

type FlatResult =
  | { type: "client"; id: string; label: string; sub: string | null }
  | { type: "staff"; id: string; label: string; sub: string | null }
  | { type: "service"; id: string; label: string; sub: string | null }
  | { type: "appointment"; id: string; label: string; sub: string | null };

function buildFlatResults(data: GlobalSearchResult): FlatResult[] {
  const flat: FlatResult[] = [];
  for (const c of data.clients) {
    flat.push({
      type: "client",
      id: c.id,
      label: c.name,
      sub: c.phone ?? c.email ?? null,
    });
  }
  for (const s of data.staff) {
    flat.push({
      type: "staff",
      id: s.id,
      label: s.name,
      sub: s.phone ?? null,
    });
  }
  for (const svc of data.services) {
    flat.push({
      type: "service",
      id: svc.id,
      label: svc.name,
      sub: `${svc.durationMins} min · $${svc.price.toFixed(2)}`,
    });
  }
  for (const a of data.appointments) {
    flat.push({
      type: "appointment",
      id: a.id,
      label: a.clientName ?? "Walk-in",
      sub: `${a.date} ${a.startTime} · ${a.staffName} · ${a.status}`,
    });
  }
  return flat;
}

const CATEGORY_ORDER: FlatResult["type"][] = ["client", "staff", "service", "appointment"];

const CATEGORY_LABEL: Record<FlatResult["type"], string> = {
  client: "Clients",
  staff: "Staff",
  service: "Services",
  appointment: "Appointments",
};

const CATEGORY_ICON: Record<FlatResult["type"], React.ElementType> = {
  client: UserCircle,
  staff: Users,
  service: Scissors,
  appointment: CalendarDays,
};

function getHref(item: FlatResult): string {
  switch (item.type) {
    case "client":
      return "/dashboard/clients";
    case "staff":
      return "/dashboard/staff";
    case "service":
      return "/dashboard/services";
    case "appointment":
      return "/dashboard/appointments";
  }
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flatResults = results ? buildFlatResults(results) : [];
  const totalResults = flatResults.length;
  const hasResults =
    results &&
    (results.clients.length > 0 ||
      results.staff.length > 0 ||
      results.services.length > 0 ||
      results.appointments.length > 0);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await globalSearch(q);
      setResults(data);
      setOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults(null);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // Close on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;

    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % totalResults);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? totalResults - 1 : prev - 1));
      return;
    }

    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const item = flatResults[activeIndex];
      if (item) {
        navigate(item);
      }
    }
  }

  function navigate(item: FlatResult) {
    router.push(getHref(item));
    setOpen(false);
    setQuery("");
    setResults(null);
    setActiveIndex(-1);
  }

  function clearQuery() {
    setQuery("");
    setResults(null);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  // Group flat results back for rendering
  const grouped: Partial<Record<FlatResult["type"], FlatResult[]>> = {};
  for (const item of flatResults) {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type]!.push(item);
  }

  let currentFlatIndex = 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results && query.trim()) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search clients, staff, services…"
          className={cn(
            "w-full h-9 pl-9 pr-9 rounded-lg border border-input bg-background text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring",
            "transition-colors"
          )}
          aria-label="Global search"
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
        />
        {query && (
          <button
            onClick={clearQuery}
            className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
            tabIndex={-1}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute top-full mt-2 left-0 right-0 z-50",
            "bg-popover border border-border rounded-xl shadow-lg",
            "overflow-hidden"
          )}
          role="listbox"
        >
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
          )}

          {!loading && !hasResults && results && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {!loading && hasResults && (
            <div className="max-h-[400px] overflow-y-auto py-1">
              {CATEGORY_ORDER.map((type) => {
                const items = grouped[type];
                if (!items || items.length === 0) return null;
                const Icon = CATEGORY_ICON[type];

                return (
                  <div key={type}>
                    {/* Category heading */}
                    <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {CATEGORY_LABEL[type]}
                      </span>
                    </div>

                    {/* Items */}
                    {items.map((item) => {
                      const itemIndex = currentFlatIndex++;
                      const isActive = activeIndex === itemIndex;

                      return (
                        <button
                          key={item.id}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => navigate(item)}
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          className={cn(
                            "w-full text-left px-3 py-2 flex flex-col gap-0.5 cursor-pointer transition-colors",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/60"
                          )}
                        >
                          <span className="text-sm font-medium text-foreground leading-tight">
                            {item.label}
                          </span>
                          {item.sub && (
                            <span className="text-xs text-muted-foreground truncate">
                              {item.sub}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
