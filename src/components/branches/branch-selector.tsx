"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Building2, ChevronDown, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Branch } from "@/app/actions/branches";

const STORAGE_KEY = "zaloon-branch-id";

interface BranchSelectorProps {
  branches: Branch[];
}

export function BranchSelector({ branches }: BranchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === "undefined") return branches[0]?.id ?? "";
    return (
      localStorage.getItem(STORAGE_KEY) ??
      branches.find((b) => b.isMain)?.id ??
      branches[0]?.id ??
      ""
    );
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync from storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const valid = stored && branches.some((b) => b.id === stored);
    if (valid) {
      setActiveId(stored!);
    } else {
      const main = branches.find((b) => b.isMain) ?? branches[0];
      if (main) {
        setActiveId(main.id);
        localStorage.setItem(STORAGE_KEY, main.id);
      }
    }
  }, [branches]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Only render when there are multiple branches
  if (branches.length <= 1) return null;

  const active = branches.find((b) => b.id === activeId) ?? branches[0];

  function select(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveId(id);
    setOpen(false);
  }

  return (
    <div ref={dropdownRef} className="relative hidden sm:block flex-shrink-0">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-medium transition-colors border",
          open
            ? "bg-primary/15 text-primary border-primary/30"
            : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch branch"
      >
        <Building2 className="w-3 h-3 flex-shrink-0" />
        <span className="max-w-[140px] truncate">{active?.name ?? "Branch"}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 flex-shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 overflow-hidden"
        >
          <div className="p-1">
            {branches.map((branch) => (
              <button
                key={branch.id}
                role="option"
                aria-selected={branch.id === activeId}
                type="button"
                onClick={() => select(branch.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                  branch.id === activeId
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-accent hover:text-accent-foreground",
                  !branch.isActive && "opacity-50"
                )}
              >
                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium">{branch.name}</p>
                  {branch.isMain && (
                    <p className="text-[10px] text-muted-foreground">Main branch</p>
                  )}
                </div>
                {branch.id === activeId && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* View all link */}
          <div className="border-t border-border p-1">
            <Link
              href="/dashboard/settings/branches"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
              View all branches
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
