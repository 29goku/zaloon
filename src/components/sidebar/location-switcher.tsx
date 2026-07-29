"use client";

import { useState, useEffect } from "react";
import { Building2, ChevronDown, CheckCircle2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SalonLocation {
  id: string;
  name: string;
  city: string | null;
  slug: string;
}

interface LocationSwitcherProps {
  locations: SalonLocation[];
  currentSalonId?: string;
}

const STORAGE_KEY = "zaloon_active_location";

export function LocationSwitcher({ locations, currentSalonId }: LocationSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(
    () =>
      (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null) ??
      currentSalonId ??
      locations[0]?.id ??
      ""
  );

  // Sync from storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && locations.some((l) => l.id === stored)) {
      setActiveId(stored);
    } else if (currentSalonId) {
      setActiveId(currentSalonId);
    }
  }, [currentSalonId, locations]);

  const activeLocation = locations.find((l) => l.id === activeId) ?? locations[0];

  function switchLocation(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveId(id);
    setOpen(false);
    // Reload so all server components re-fetch data for the new active salon
    window.location.reload();
  }

  if (locations.length <= 1) {
    // Single location: just show name with building icon, no switcher
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border">
        <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-semibold text-foreground truncate">
          {activeLocation?.name ?? "My Salon"}
        </span>
      </div>
    );
  }

  return (
    <div className="relative border-b border-sidebar-border">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-3 text-left transition-colors",
          open
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "hover:bg-sidebar-accent/60 text-foreground"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{activeLocation?.name ?? "My Salon"}</p>
          {activeLocation?.city && (
            <p className="text-xs text-muted-foreground truncate">{activeLocation.city}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute left-2 right-2 top-full mt-1 z-20 rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 overflow-hidden"
          >
            <div className="p-1">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  role="option"
                  aria-selected={loc.id === activeId}
                  type="button"
                  onClick={() => switchLocation(loc.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors",
                    loc.id === activeId
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{loc.name}</p>
                    {loc.city && (
                      <p className="text-xs text-muted-foreground truncate">{loc.city}</p>
                    )}
                  </div>
                  {loc.id === activeId && (
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-border p-1">
              <Link
                href="/dashboard/settings/branches"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <PlusCircle className="w-4 h-4 flex-shrink-0" />
                Add New Location
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
