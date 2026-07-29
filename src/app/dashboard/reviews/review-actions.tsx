"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteReview } from "@/app/actions/reviews";
import { Trash2, Copy, Check } from "lucide-react";

// ─── Delete button ────────────────────────────────────────────────────────────

interface DeleteReviewButtonProps {
  id: string;
}

export function DeleteReviewButton({ id }: DeleteReviewButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteReview(id);
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      disabled={isPending}
      onClick={handleDelete}
      title="Delete review"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  );
}

// ─── Copy review link button ──────────────────────────────────────────────────

interface CopyReviewLinkProps {
  href: string;
  label?: string;
}

export function CopyReviewLink({ href, label = "Copy link" }: CopyReviewLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const url = `${window.location.origin}${href}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard without user gesture
      const url = `${window.location.origin}${href}`;
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 text-primary text-xs font-medium transition-colors border border-primary/20"
      title={`Copy review link to clipboard`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          {label}
        </>
      )}
    </button>
  );
}
