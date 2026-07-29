"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, X, CalendarPlus, UserPlus, Zap, FileText } from "lucide-react";

interface FabAction {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Short Tailwind colour class applied to the mini button */
  colour: string;
}

const ACTIONS: FabAction[] = [
  {
    label: "New Appointment",
    href: "/dashboard/appointments?new=1",
    icon: CalendarPlus,
    colour: "bg-primary text-primary-foreground",
  },
  {
    label: "Add Client",
    href: "/dashboard/clients?new=1",
    icon: UserPlus,
    colour: "bg-primary text-primary-foreground",
  },
  {
    label: "Quick Pay",
    href: "/dashboard/quick-pay",
    icon: Zap,
    colour: "bg-primary text-primary-foreground",
  },
  {
    label: "New Invoice",
    href: "/dashboard/invoices",
    icon: FileText,
    colour: "bg-primary text-primary-foreground",
  },
];

export function QuickActionsFab() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    // Use capture so we catch clicks inside portals (modals etc.) too
    document.addEventListener("pointerdown", onPointer, true);
    return () => document.removeEventListener("pointerdown", onPointer, true);
  }, [open]);

  return (
    // Wrapper — fixed position in the bottom-right, above mobile nav (z-40)
    <div
      ref={containerRef}
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col-reverse items-end gap-3"
      role="region"
      aria-label="Quick actions"
    >
      {/* ── Secondary action buttons (fan upward) ─────────────────────── */}
      {ACTIONS.map((action, index) => {
        const Icon = action.icon;
        // Stagger delay: first item appears last visually (index 0 = top)
        const delay = `${index * 50}ms`;

        return (
          <div
            key={action.href}
            className="flex items-center gap-2"
            style={{
              // Enter: slide up + fade in; exit: slide down + fade out
              transitionProperty: "opacity, transform",
              transitionDuration: "200ms",
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: open ? delay : "0ms",
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(12px)",
              pointerEvents: open ? "auto" : "none",
            }}
          >
            {/* Label */}
            <span className="bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1 rounded-full shadow-sm border border-border whitespace-nowrap select-none">
              {action.label}
            </span>

            {/* Mini circular button */}
            <Link
              href={action.href}
              onClick={() => setOpen(false)}
              className={`${action.colour} flex items-center justify-center w-10 h-10 rounded-full shadow-md ring-0 transition-[box-shadow,opacity] duration-150 hover:shadow-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
              aria-label={action.label}
              tabIndex={open ? 0 : -1}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        );
      })}

      {/* ── Main FAB ───────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        className={`
          flex items-center justify-center
          w-14 h-14 rounded-full
          bg-primary text-primary-foreground
          shadow-lg hover:shadow-xl
          transition-[transform,box-shadow,background-color] duration-200
          hover:opacity-90
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          ${open ? "rotate-45 scale-110" : "rotate-0 scale-100"}
        `}
        style={{ transitionProperty: "transform, box-shadow, opacity" }}
      >
        {/* Single icon — rotated 45° becomes an X */}
        <Plus className="w-6 h-6" aria-hidden="true" />
      </button>
    </div>
  );
}
