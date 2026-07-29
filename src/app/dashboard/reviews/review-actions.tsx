"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteReview, updateReviewVisibility } from "@/app/actions/reviews";
import { ReviewResponseDialog } from "@/components/reviews/review-response-dialog";
import { Trash2, Copy, Check, MessageSquare, Eye, EyeOff } from "lucide-react";

// ─── Delete button ────────────────────────────────────────────────────────────

interface DeleteReviewButtonProps {
  id: string;
}

export function DeleteReviewButton({ id }: DeleteReviewButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this review? This cannot be undone.")) return;
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
      title="Copy review link to clipboard"
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

// ─── Review response button (opens dialog) ────────────────────────────────────

interface ReviewResponseButtonProps {
  reviewId: string;
  clientName: string;
  rating: number;
  clientComment: string | null;
  staffName: string | null;
  date: string;
  existingResponse: string | null;
}

export function ReviewResponseButton({
  reviewId,
  clientName,
  rating,
  clientComment,
  staffName,
  date,
  existingResponse,
}: ReviewResponseButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 px-2 text-xs gap-1 ${
          existingResponse
            ? "text-primary/70 hover:text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
        }`}
        onClick={() => setOpen(true)}
        title={existingResponse ? "Edit response" : "Write response"}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{existingResponse ? "Edit" : "Respond"}</span>
      </Button>
      <ReviewResponseDialog
        open={open}
        onOpenChange={setOpen}
        review={{
          id: reviewId,
          rating,
          clientComment,
          clientName,
          staffName,
          date,
          existingResponse,
        }}
      />
    </>
  );
}

// ─── Visibility toggle ────────────────────────────────────────────────────────

interface VisibilityToggleProps {
  reviewId: string;
  isPublic: boolean;
}

export function VisibilityToggle({ reviewId, isPublic }: VisibilityToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localPublic, setLocalPublic] = useState(isPublic);

  function handleToggle() {
    startTransition(async () => {
      const next = !localPublic;
      setLocalPublic(next);
      await updateReviewVisibility(reviewId, next);
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
      disabled={isPending}
      onClick={handleToggle}
      title={localPublic ? "Make private" : "Make public"}
    >
      {localPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
    </Button>
  );
}
