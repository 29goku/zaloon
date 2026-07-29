"use client";

import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

interface BookingLinkProps {
  slug: string;
}

export function BookingLink({ slug }: BookingLinkProps) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const bookingUrl = origin ? `${origin}/book/${slug}` : `/book/${slug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("input");
      el.value = bookingUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-3">
      {/* URL display */}
      <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl border border-border/50">
        <span className="flex-1 text-sm font-mono text-foreground truncate select-all">
          {bookingUrl}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium transition-all border border-border bg-background hover:bg-muted text-foreground"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Link
            </>
          )}
        </button>

        <a
          href={`/book/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <ExternalLink className="w-4 h-4" />
          Preview Page
        </a>
      </div>
    </div>
  );
}
