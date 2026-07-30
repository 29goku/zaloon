"use client";
import { useEffect } from "react";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
        <button onClick={reset} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Try again
        </button>
      </div>
    </div>
  );
}
