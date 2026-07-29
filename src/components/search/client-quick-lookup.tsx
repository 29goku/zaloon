"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, UserCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchClients } from "@/app/actions/search";

type ClientResult = {
  id: string;
  name: string;
  phone: string | null;
};

interface ClientQuickLookupProps {
  /** Placeholder text shown in the input */
  placeholder?: string;
  /** Called when a client is selected — defaults to router.push to client detail */
  onSelect?: (client: ClientResult) => void;
  /** Additional class names on the container */
  className?: string;
  /** Auto-focus the input when mounted */
  autoFocus?: boolean;
}

export function ClientQuickLookup({
  placeholder = "Search clients…",
  onSelect,
  className,
  autoFocus = false,
}: ClientQuickLookupProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchClients(q);
      setResults(data);
      setOpen(true);
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
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // Close on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function handleSelect(client: ClientResult) {
    if (onSelect) {
      onSelect(client);
    } else {
      router.push(`/dashboard/clients/${client.id}`);
    }
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      return;
    }
    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) handleSelect(item);
    }
  }

  // Initial of client name for avatar
  function getInitial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input */}
      <div className="relative flex items-center">
        {loading ? (
          <Loader2 className="absolute left-3 size-4 animate-spin text-muted-foreground pointer-events-none" />
        ) : (
          <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 && query.trim()) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "w-full h-9 pl-9 pr-9 rounded-lg border border-input bg-background text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring",
            "transition-colors"
          )}
          aria-label="Search clients"
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear"
            tabIndex={-1}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute top-full mt-1.5 left-0 right-0 z-50",
            "bg-popover border border-border rounded-xl shadow-lg",
            "overflow-hidden"
          )}
          role="listbox"
          aria-label="Client suggestions"
        >
          {results.length === 0 && !loading && query.trim() && (
            <div className="px-4 py-5 text-center text-sm text-muted-foreground">
              No clients found for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.length > 0 && (
            <div className="max-h-64 overflow-y-auto py-1">
              {results.map((client, i) => {
                const isActive = activeIndex === i;
                return (
                  <button
                    key={client.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(client)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60"
                    )}
                  >
                    {/* Avatar initial */}
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {getInitial(client.name)}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium leading-tight text-foreground">
                        {client.name}
                      </span>
                      {client.phone && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {client.phone}
                        </span>
                      )}
                    </span>

                    <UserCircle className="size-4 shrink-0 text-muted-foreground/40" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
