"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink } from "lucide-react";

interface IntakeLinkCopyProps {
  intakePath: string;
}

export function IntakeLinkCopy({ intakePath }: IntakeLinkCopyProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${intakePath}`
    : intakePath;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs font-mono text-foreground border border-border">
        {fullUrl}
      </code>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium px-3 py-2 hover:bg-indigo-700 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy link"}
        </button>
        <Link
          href={intakePath}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/30 text-xs font-medium px-3 py-2 text-foreground hover:border-primary/40 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Preview
        </Link>
      </div>
    </div>
  );
}
