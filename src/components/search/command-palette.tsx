"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  UserCircle,
  Users,
  Scissors,
  CalendarDays,
  Clock,
  X,
  Receipt,
  Tag,
  Gift,
  Package,
  Loader2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  globalSearchItems,
  type SearchResultItem,
  type ResultType,
} from "@/app/actions/search";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Recently-viewed item stored in localStorage
// ---------------------------------------------------------------------------
const STORAGE_KEY = "zaloon:recently-viewed";
const RECENT_SEARCHES_KEY = "zaloon:recent-searches";
const MAX_RECENT = 8;
const MAX_RECENT_SEARCHES = 5;

type RecentItem = {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string | null;
  href: string;
  icon: string;
  // Legacy compat
  label: string;
  sublabel: string | null;
};

function loadRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentItem[];
  } catch {
    return [];
  }
}

function saveRecent(item: RecentItem) {
  try {
    const existing = loadRecent().filter((r) => r.id !== item.id);
    const updated = [item, ...existing].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const trimmed = query.trim();
    if (!trimmed) return;
    const existing = loadRecentSearches().filter(
      (s) => s.toLowerCase() !== trimmed.toLowerCase()
    );
    const updated = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Context — lets SearchButton open/close the palette without prop drilling
// ---------------------------------------------------------------------------
type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  open: false,
  setOpen: () => {},
});

export function useCommandPalette() {
  return useContext(CommandPaletteContext);
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // ⌘K / Ctrl+K global listener
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <CommandPalette />
    </CommandPaletteContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------
const ALL_TYPES: ResultType[] = [
  "client",
  "staff",
  "service",
  "appointment",
  "invoice",
  "coupon",
  "giftCard",
  "inventory",
];

type FilterOption = "all" | ResultType;

const FILTER_TABS: { key: FilterOption; label: string }[] = [
  { key: "all", label: "All" },
  { key: "client", label: "Clients" },
  { key: "appointment", label: "Appointments" },
  { key: "invoice", label: "Invoices" },
  { key: "service", label: "Services" },
];

const CATEGORY_LABEL: Record<ResultType, string> = {
  client: "Clients",
  staff: "Staff",
  service: "Services",
  appointment: "Appointments",
  invoice: "Invoices",
  coupon: "Coupons",
  giftCard: "Gift Cards",
  inventory: "Inventory",
};

// Map string icon names to Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  UserCircle,
  Users,
  Scissors,
  CalendarDays,
  Receipt,
  Tag,
  Gift,
  Package,
};

function getIcon(name: string): React.ElementType {
  return ICON_MAP[name] ?? Search;
}

// ---------------------------------------------------------------------------
// Quick actions / keyboard shortcuts shown when palette opens with no query
// ---------------------------------------------------------------------------
type QuickAction = {
  keys: string[];
  label: string;
  href: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { keys: ["N", "A"], label: "New appointment", href: "/dashboard/appointments/new" },
  { keys: ["N", "C"], label: "New client", href: "/dashboard/clients/new" },
  { keys: ["Q", "P"], label: "Quick pay", href: "/dashboard/quick-pay" },
  { keys: ["G", "D"], label: "Go to dashboard", href: "/dashboard" },
  { keys: ["G", "C"], label: "Go to clients", href: "/dashboard/clients" },
  { keys: ["G", "S"], label: "Go to services", href: "/dashboard/services" },
  { keys: ["G", "I"], label: "Go to invoices", href: "/dashboard/invoices" },
];

// ---------------------------------------------------------------------------
// Command palette component
// ---------------------------------------------------------------------------
export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recently viewed and recent searches when palette opens
  useEffect(() => {
    if (open) {
      setRecent(loadRecent());
      setRecentSearches(loadRecentSearches());
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
      setLoading(false);
      setActiveFilter("all");
    }
  }, [open]);

  // Debounced search (300ms)
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const items = await globalSearchItems(q);
      setResults(items);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const showSearch = query.trim().length > 0;

  // Apply client-side type filter to search results
  const filteredResults =
    activeFilter === "all"
      ? results
      : results.filter((r) => r.type === activeFilter);

  // Display items for keyboard nav
  const displayItems: SearchResultItem[] = showSearch
    ? filteredResults
    : recent.map((r) => ({ ...r }));

  // Flat indexed list for keyboard nav (grouped order when in search mode)
  const flatItems = showSearch
    ? ALL_TYPES.flatMap((type) => displayItems.filter((i) => i.type === type))
    : displayItems;

  function navigate(item: SearchResultItem) {
    saveRecent({
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      icon: item.icon,
      label: item.label,
      sublabel: item.sublabel,
    });
    if (showSearch) saveRecentSearch(query);
    router.push(item.href);
    setOpen(false);
  }

  function navigateToSearchPage() {
    if (!query.trim()) return;
    saveRecentSearch(query);
    router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  }

  function applyRecentSearch(q: string) {
    setQuery(q);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        flatItems.length === 0 ? -1 : (prev + 1) % flatItems.length
      );
      scrollActiveIntoView();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        flatItems.length === 0
          ? -1
          : prev <= 0
          ? flatItems.length - 1
          : prev - 1
      );
      scrollActiveIntoView();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        const item = flatItems[activeIndex];
        if (item) navigate(item);
      } else if (showSearch) {
        navigateToSearchPage();
      }
    }
  }

  function scrollActiveIntoView() {
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(
        `[data-active="true"]`
      ) as HTMLElement | null;
      el?.scrollIntoView({ block: "nearest" });
    });
  }

  // Group search results by category for display
  const grouped = ALL_TYPES.map((type) => ({
    type,
    items: filteredResults.filter((i) => i.type === type),
  })).filter((g) => g.items.length > 0);

  const hasResults = filteredResults.length > 0;
  const noResults = showSearch && !loading && filteredResults.length === 0;

  // Build a map from item id → flat index for highlighting
  const indexMap = new Map(flatItems.map((item, i) => [item.id, i]));

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-[15vh] translate-y-0 max-w-xl w-full p-0 gap-0 shadow-2xl ring-1 ring-foreground/5",
          "overflow-hidden rounded-xl"
        )}
        onKeyDown={handleKeyDown}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-popover">
          {/* Search input row */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            {loading ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Search className="size-4 shrink-0 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients, invoices, services…"
              className={cn(
                "min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground",
                "outline-none"
              )}
              aria-label="Command palette search"
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Clear"
                tabIndex={-1}
              >
                <X className="size-3.5" />
              </button>
            )}
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
              Esc
            </kbd>
          </div>

          {/* Filter tabs — only when there are results */}
          {showSearch && (results.length > 0 || loading) && (
            <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-1.5 scrollbar-none">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveFilter(tab.key);
                    setActiveIndex(-1);
                  }}
                  className={cn(
                    "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    activeFilter === tab.key
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Results list */}
          <div
            ref={listRef}
            className="max-h-[min(400px,62vh)] overflow-y-auto overscroll-contain py-2"
            role="listbox"
            aria-label="Search results"
          >
            {/* Loading spinner */}
            {loading && (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>Searching…</span>
              </div>
            )}

            {/* No results */}
            {noResults && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  No results for &ldquo;{query}&rdquo;
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try searching by name, code, phone, or invoice ID
                </p>
              </div>
            )}

            {/* ── No-query state ────────────────────────────────────────── */}
            {!showSearch && !loading && (
              <>
                {/* Recent searches chips */}
                {recentSearches.length > 0 && (
                  <div className="px-4 pb-2">
                    <div className="mb-1.5 flex items-center gap-1.5 pt-1">
                      <Clock className="size-3 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Recent searches
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => applyRecentSearch(s)}
                          className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick actions panel */}
                <div className="px-4 pb-2">
                  <div className="mb-1 flex items-center gap-1.5 pt-1">
                    <Zap className="size-3 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Quick actions
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-px">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.href}
                        type="button"
                        onClick={() => {
                          router.push(action.href);
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                      >
                        <span className="flex items-center gap-0.5">
                          {action.keys.map((k) => (
                            <kbd
                              key={k}
                              className="inline-flex h-5 w-5 items-center justify-center rounded border border-border bg-muted font-mono text-[10px] text-muted-foreground"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {action.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recently viewed */}
                {recent.length > 0 && (
                  <>
                    <div className="mb-0.5 flex items-center gap-1.5 px-4 pt-1 pb-0.5">
                      <Clock className="size-3 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Recently viewed
                      </span>
                    </div>
                    {recent.map((item, i) => (
                      <ResultRow
                        key={item.id}
                        item={item}
                        isActive={i === activeIndex}
                        onSelect={() => navigate(item)}
                        onHover={() => setActiveIndex(i)}
                      />
                    ))}
                  </>
                )}

                {/* Empty state when nothing at all */}
                {recent.length === 0 && recentSearches.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Start typing to search across Zaloon…
                  </div>
                )}
              </>
            )}

            {/* ── Search results (grouped by type) ──────────────────────── */}
            {!loading && hasResults && showSearch && (
              <>
                {grouped.map(({ type, items }) => {
                  const Icon = getIcon(items[0]?.icon ?? "Search");
                  return (
                    <div key={type} role="group" aria-label={CATEGORY_LABEL[type]}>
                      <div className="mb-0.5 mt-1 flex items-center gap-1.5 px-4 py-0.5">
                        <Icon className="size-3 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {CATEGORY_LABEL[type]}
                        </span>
                      </div>
                      {items.map((item) => (
                        <ResultRow
                          key={item.id}
                          item={item}
                          isActive={indexMap.get(item.id) === activeIndex}
                          onSelect={() => navigate(item)}
                          onHover={() =>
                            setActiveIndex(indexMap.get(item.id) ?? -1)
                          }
                          query={query}
                        />
                      ))}
                    </div>
                  );
                })}

                {/* "See all results" link */}
                {results.length > 0 && (
                  <button
                    type="button"
                    onClick={navigateToSearchPage}
                    className="mx-4 mt-1 flex w-[calc(100%-2rem)] items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Search className="size-3" />
                    See all results for &ldquo;{query}&rdquo;
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-3 border-t border-border px-4 py-2">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px]">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px]">
                ↵
              </kbd>
              open
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px]">
                Esc
              </kbd>
              close
            </span>
            {showSearch && (
              <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px]">
                  ↵
                </kbd>
                full results
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Highlight matching query text
// ---------------------------------------------------------------------------
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/20 text-primary not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Single result row
// ---------------------------------------------------------------------------
function ResultRow({
  item,
  isActive,
  onSelect,
  onHover,
  query,
}: {
  item: SearchResultItem;
  isActive: boolean;
  onSelect: () => void;
  onHover: () => void;
  query?: string;
}) {
  const Icon = getIcon(item.icon);
  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      data-active={isActive}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          isActive ? "text-accent-foreground" : "text-muted-foreground"
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight text-foreground">
          {query ? (
            <HighlightMatch text={item.title} query={query} />
          ) : (
            item.title
          )}
        </span>
        {item.subtitle && (
          <span className="block truncate text-xs text-muted-foreground">
            {item.subtitle}
          </span>
        )}
      </span>
    </button>
  );
}
