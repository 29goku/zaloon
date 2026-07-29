"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: React.ReactNode;
  className?: string;
}

const THRESHOLD = 80;

export function PullToRefresh({ children, className }: PullToRefreshProps) {
  const router = useRouter();
  const touchStartYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Only track if we are scrolled to the very top
    if (window.scrollY === 0) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (touchStartYRef.current === null || refreshing) return;
      if (window.scrollY !== 0) {
        touchStartYRef.current = null;
        setPullDistance(0);
        return;
      }

      const delta = e.touches[0].clientY - touchStartYRef.current;
      if (delta > 10) {
        // Apply a dampening factor so the indicator doesn't fly too far
        setPullDistance(Math.min(delta * 0.5, THRESHOLD * 1.2));
      }
    },
    [refreshing]
  );

  const handleTouchEnd = useCallback(() => {
    if (touchStartYRef.current === null) return;
    touchStartYRef.current = null;

    if (pullDistance * 2 >= THRESHOLD && !refreshing) {
      // pullDistance is halved (0.5 dampening), so compare to THRESHOLD/2
      setRefreshing(true);
      setPullDistance(0);
      router.refresh();
      setTimeout(() => {
        setRefreshing(false);
      }, 1500);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, router]);

  // Spinner visible when pulling far enough or actively refreshing
  const spinnerVisible = refreshing || pullDistance > 10;
  // Progress for opacity: 0–1 based on pull distance relative to threshold
  const progress = Math.min(pullDistance / (THRESHOLD * 0.5), 1);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-center pointer-events-none z-50"
        style={{
          height: 40,
          opacity: spinnerVisible ? (refreshing ? 1 : progress) : 0,
          transform: spinnerVisible
            ? `translateY(${refreshing ? 8 : Math.min(pullDistance - 4, 8)}px)`
            : "translateY(-40px)",
          transition: refreshing || pullDistance === 0 ? "opacity 200ms, transform 200ms" : "none",
        }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-2 bg-popover border border-border text-popover-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
          <RefreshCw
            className={cn("w-3.5 h-3.5", refreshing && "animate-spin")}
          />
          <span>{refreshing ? "Refreshing…" : "Release to refresh"}</span>
        </div>
      </div>

      {children}
    </div>
  );
}
