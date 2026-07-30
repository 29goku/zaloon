"use client";
import Link from "next/link";
import { useEffect } from "react";
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-sm">{error.message || "An unexpected error occurred while loading this page."}</p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Try again
        </button>
        <Link href="/dashboard" className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
