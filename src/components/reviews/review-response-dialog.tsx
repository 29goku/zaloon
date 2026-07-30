"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { respondToReview } from "@/app/actions/reviews";
import { Star, MessageSquare } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: {
    id: string;
    rating: number;
    clientComment: string | null;
    clientName: string;
    staffName: string | null;
    date: string;
    existingResponse: string | null;
  };
}

// ─── Quick-response templates ─────────────────────────────────────────────────

const TEMPLATES = [
  {
    label: "Positive",
    text: "Thank you so much for the wonderful review! We're thrilled to hear you had a great experience at our salon. We look forward to seeing you again soon!",
  },
  {
    label: "Negative",
    text: "We sincerely apologize for the experience you had. Your feedback is important to us and we'd love the opportunity to make things right. Please reach out to us directly so we can address your concerns.",
  },
  {
    label: "Neutral",
    text: "Thank you for taking the time to leave us a review! We appreciate your feedback and are always looking for ways to improve. We hope to see you again soon!",
  },
];

const MAX_CHARS = 600;

// ─── StarDisplay ──────────────────────────────────────────────────────────────

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`w-4 h-4 ${
            i <= rating
              ? "text-amber-400 fill-amber-400"
              : "text-muted-foreground/20 fill-muted-foreground/20"
          }`}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewResponseDialog({
  open,
  onOpenChange,
  review,
}: ReviewResponseDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [response, setResponse] = useState(review.existingResponse ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const remaining = MAX_CHARS - response.length;

  function handleSave() {
    if (!response.trim()) {
      setError("Response cannot be empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await respondToReview(review.id, response.trim());
      if (result.success) {
        setSaved(true);
        router.refresh();
        setTimeout(() => {
          setSaved(false);
          onOpenChange(false);
        }, 1200);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            {review.existingResponse ? "Edit Response" : "Write Response"}
          </DialogTitle>
        </DialogHeader>

        {/* Review preview */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              {review.clientName}
            </span>
            <span className="text-xs text-muted-foreground">{review.date}</span>
          </div>
          <StarDisplay rating={review.rating} />
          {review.clientComment && (
            <p className="text-sm text-foreground/80 leading-relaxed">
              &ldquo;{review.clientComment}&rdquo;
            </p>
          )}
          {review.staffName && (
            <p className="text-xs text-muted-foreground">
              Staff: <span className="font-medium">{review.staffName}</span>
            </p>
          )}
        </div>

        {/* Template buttons */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Quick templates</p>
          <div className="flex gap-2 flex-wrap">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => setResponse(tpl.text)}
                className="px-3 py-1 text-xs rounded-full border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div className="space-y-1">
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Write your response to the client..."
            rows={4}
            maxLength={MAX_CHARS}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : (
              <span />
            )}
            <span
              className={`text-xs ${
                remaining < 50 ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {remaining} chars remaining
            </span>
          </div>
        </div>

        {/* Preview */}
        {response.trim() && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary mb-1">Preview</p>
            <p className="text-xs text-foreground/80 leading-relaxed">
              <span className="font-semibold">You:</span> {response.trim()}
            </p>
          </div>
        )}

        <DialogFooter showCloseButton>
          <Button
            onClick={handleSave}
            disabled={isPending || saved || !response.trim()}
          >
            {saved ? "Saved!" : isPending ? "Saving…" : "Save Response"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
