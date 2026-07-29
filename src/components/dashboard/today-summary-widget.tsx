"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { relativeTime, activityLabel, activityLink, type ActivityItem } from "@/lib/activity-feed-utils";

interface TodaySummaryWidgetProps {
  items: ActivityItem[];
}

export function TodaySummaryWidget({ items }: TodaySummaryWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const displayItems = items.slice(0, 5);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Recent Activity
          </span>
          {items.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {items.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Collapsed preview — always show last 2 */}
      {!expanded && displayItems.length > 0 && (
        <div className="border-t border-border divide-y divide-border">
          {displayItems.slice(0, 2).map((item) => (
            <MiniActivityRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Expanded list */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {displayItems.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              No recent activity.
            </p>
          ) : (
            displayItems.map((item) => (
              <MiniActivityRow key={item.id} item={item} />
            ))
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border px-5 py-3">
        <Link
          href="/dashboard/activity"
          className="text-xs text-primary font-medium hover:underline"
        >
          View all activity →
        </Link>
      </div>
    </div>
  );
}

// ── Mini row ──────────────────────────────────────────────────────────────────

function MiniActivityRow({ item }: { item: ActivityItem }) {
  const label = activityLabel(item);
  const href = activityLink(item);
  const rel = relativeTime(item.timestamp);

  const content = (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
      <span className="text-base flex-shrink-0" aria-hidden="true">
        {item.icon ?? "•"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        {item.detail && (
          <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
        {rel}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
