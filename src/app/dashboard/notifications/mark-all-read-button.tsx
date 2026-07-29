"use client";

import { useCallback } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const LAST_SEEN_KEY = "zaloon_notifications_last_seen";

export function MarkAllReadButton() {
  const handleClick = useCallback(() => {
    try {
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
  }, []);

  return (
    <Button variant="outline" size="sm" onClick={handleClick} className="flex items-center gap-2">
      <CheckCheck className="w-4 h-4" />
      Mark all as read
    </Button>
  );
}
