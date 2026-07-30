"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeOption = {
  value: "light" | "dark" | "system";
  label: string;
  Icon: React.ElementType;
};

const OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle({
  className,
  variant = "sidebar",
}: {
  className?: string;
  variant?: "sidebar" | "header";
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-9 w-24 rounded-full animate-pulse",
          variant === "sidebar" ? "bg-sidebar-accent/40" : "bg-muted/40",
          className
        )}
        aria-hidden="true"
      />
    );
  }

  const active = OPTIONS.find((o) => o.value === (theme ?? "system"))!;
  const ActiveIcon = active.Icon;
  const isSidebar = variant === "sidebar";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch colour mode"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 select-none",
          isSidebar
            ? "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <ActiveIcon className="w-[15px] h-[15px]" />
        <span className="hidden sm:inline">{active.label}</span>
        {/* chevron points up in sidebar (dropdown opens up), down in header (opens down) */}
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            isSidebar ? (open ? "rotate-180" : "") : (open ? "" : "rotate-180")
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Colour mode"
          className={cn(
            "absolute right-0 z-50 min-w-[130px]",
            "rounded-xl shadow-lg overflow-hidden py-1",
            // sidebar: open upward; header: open downward
            isSidebar ? "bottom-full mb-2" : "top-full mt-2",
            isSidebar
              ? "border border-sidebar-border bg-sidebar"
              : "border border-border bg-popover text-popover-foreground"
          )}
        >
          {OPTIONS.map(({ value, label, Icon }) => {
            const isCurrent = theme === value;
            return (
              <button
                key={value}
                role="option"
                aria-selected={isCurrent}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors",
                  isSidebar
                    ? isCurrent
                      ? "text-sidebar-primary bg-sidebar-accent"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    : isCurrent
                      ? "text-primary bg-muted"
                      : "text-popover-foreground hover:bg-muted/60"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {isCurrent && (
                  <span
                    className={cn(
                      "ml-auto w-1.5 h-1.5 rounded-full",
                      isSidebar ? "bg-sidebar-primary" : "bg-primary"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
