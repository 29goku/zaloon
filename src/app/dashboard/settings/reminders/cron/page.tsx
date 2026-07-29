"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Clock, Play, Copy, Check, RefreshCw } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type CronResult = {
  processed: number;
  timestamp: string;
};

type Stats = {
  lastRun: string | null;
  processedToday: number;
};

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/cron/reminders/stats", { cache: "no-store" }).catch(() => null);
  if (res?.ok) return res.json();
  // Fallback: hit the reminders list endpoint isn't available, return empty
  return { lastRun: null, processedToday: 0 };
}

export default function CronStatusPage() {
  const [stats, setStats] = useState<Stats>({ lastRun: null, processedToday: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CronResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cronUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/cron/reminders`
      : "/api/cron/reminders";

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoadingStats(true);
    try {
      // Fetch recent SENT reminders to derive "last run" and "today" count
      const res = await fetch("/api/cron/reminders/stats", { cache: "no-store" }).catch(
        () => null
      );
      if (res?.ok) {
        const data = await res.json();
        setStats(data);
      }
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleTrigger() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/cron/reminders");
      if (!res.ok) {
        const text = await res.text();
        setError(`HTTP ${res.status}: ${text}`);
        return;
      }
      const data: CronResult = await res.json();
      setResult(data);
      // Refresh stats after run
      await loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(cronUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function formatTimestamp(iso: string | null) {
    if (!iso) return "Never";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/dashboard/settings/reminders"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Back to Notification Preferences
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-400/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reminder Cron Job</h1>
            <p className="text-sm text-muted-foreground">
              Monitor and manually trigger the reminder scheduler
            </p>
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Run</p>
          {loadingStats ? (
            <div className="h-5 w-24 rounded bg-muted animate-pulse" />
          ) : (
            <p className="text-sm font-medium">{formatTimestamp(stats.lastRun)}</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Next Scheduled</p>
          <p className="text-sm font-medium">Every 5 minutes</p>
          <p className="text-xs text-muted-foreground">via external cron service</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Processed Today</p>
          {loadingStats ? (
            <div className="h-5 w-10 rounded bg-muted animate-pulse" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{stats.processedToday}</p>
          )}
        </div>
      </div>

      {/* Manual trigger */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Manual Trigger</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Run the reminder scheduler now to process any pending reminders due within the next 5
            minutes.
          </p>
        </div>

        <button
          onClick={handleTrigger}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {running ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {running ? "Running..." : "Run Now"}
        </button>

        {result && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm">
            <span className="font-medium text-emerald-400">Success.</span>{" "}
            <span className="text-muted-foreground">
              Processed <span className="text-foreground font-semibold">{result.processed}</span>{" "}
              reminder{result.processed !== 1 ? "s" : ""} at{" "}
              {new Date(result.timestamp).toLocaleTimeString()}.
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Cron URL */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold">External Cron Job</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set up a free cron job at{" "}
            <a
              href="https://cron-job.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline"
            >
              cron-job.org
            </a>{" "}
            to call this URL every 5 minutes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-mono break-all">
            {cronUrl}
          </code>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-medium transition-colors"
            title="Copy URL"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy
              </>
            )}
          </button>
        </div>

        <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm space-y-2">
          <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
            Setup Instructions
          </p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
            <li>
              Go to{" "}
              <a
                href="https://cron-job.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:underline"
              >
                cron-job.org
              </a>{" "}
              and create a free account.
            </li>
            <li>Click &quot;Create cronjob&quot; and paste the URL above.</li>
            <li>Set the schedule to every 5 minutes.</li>
            <li>
              Optionally add an{" "}
              <code className="text-xs bg-muted rounded px-1 py-0.5">Authorization</code> header
              with value{" "}
              <code className="text-xs bg-muted rounded px-1 py-0.5">
                Bearer &lt;CRON_SECRET&gt;
              </code>{" "}
              matching your <code className="text-xs bg-muted rounded px-1 py-0.5">CRON_SECRET</code>{" "}
              environment variable.
            </li>
            <li>Save and enable the cron job.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
