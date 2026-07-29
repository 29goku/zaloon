"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "@/components/search/command-palette";

interface SearchButtonProps {
  /** Visual variant: "icon" renders only the magnifying-glass icon; "bar" renders a full search bar lookalike. */
  variant?: "icon" | "bar";
  className?: string;
}

export function SearchButton({
  variant = "bar",
  className,
}: SearchButtonProps) {
  const { setOpen } = useCommandPalette();

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open search (⌘K)"
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg",
          "text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          className
        )}
      >
        <Search className="size-4" />
      </button>
    );
  }

  // bar variant — looks like an input, acts as a button
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open search (⌘K)"
      className={cn(
        "group inline-flex h-9 w-full max-w-sm items-center gap-2 rounded-lg",
        "border border-input bg-background px-3",
        "text-sm text-muted-foreground",
        "transition-colors hover:border-ring/50 hover:bg-accent/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    >
      <Search className="size-3.5 shrink-0" />
      <span className="flex-1 text-left">Search…</span>
      {/* Keyboard hint — hidden on very small screens */}
      <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
        <span className="text-[11px]">⌘</span>K
      </kbd>
    </button>
  );
}
