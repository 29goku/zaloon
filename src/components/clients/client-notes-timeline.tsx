"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Loader2, StickyNote, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addClientNote, deleteClientNote } from "@/app/actions/clients";
import type { ClientNote } from "@/app/actions/clients-constants";

// ─── helpers ─────────────────────────────────────────────────────────────────

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function absoluteTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ClientNotesTimelineProps {
  clientId: string;
  initialNotes: ClientNote[];
  /** Staff name shown as author on new notes */
  authorName?: string;
}

export function ClientNotesTimeline({
  clientId,
  initialNotes,
  authorName = "Staff",
}: ClientNotesTimelineProps) {
  const [notes, setNotes] = useState<ClientNote[]>(initialNotes);
  const [newText, setNewText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // newest-first display order
  const sorted = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    setError(null);
    startTransition(async () => {
      const res = await addClientNote(clientId, text, "general", false);
      if (res.success) {
        // Optimistic update
        const optimistic: ClientNote = {
          id: `optimistic-${Date.now()}`,
          text,
          type: "general",
          isPinned: false,
          createdAt: new Date().toISOString(),
        };
        setNotes((prev) => [optimistic, ...prev]);
        setNewText("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleDelete(noteId: string) {
    setConfirmDeleteId(null);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    startTransition(async () => {
      const res = await deleteClientNote(clientId, noteId);
      if (!res.success) {
        setError(res.error);
        router.refresh(); // revert optimistic removal
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Add note form */}
      <div className="space-y-2">
        <Textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a note… (Ctrl+Enter to submit)"
          className="min-h-[80px] resize-y text-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={handleAdd}
            disabled={isPending || !newText.trim()}
            size="sm"
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Add Note
          </Button>
          {isPending && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[#F41666]/30 bg-[#F41666]/10 px-3 py-2 text-xs text-[#F41666]">
          <AlertCircle className="size-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Timeline */}
      {sorted.length === 0 ? (
        <div className="text-center py-10">
          <StickyNote className="w-9 h-9 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* vertical guide line */}
          <div className="absolute left-3.5 top-4 bottom-4 w-px bg-border" aria-hidden />

          {sorted.map((note) => {
            const isLegacy = note.id.startsWith("legacy-");
            const isOptimistic = note.id.startsWith("optimistic-");

            return (
              <div key={note.id} className="relative flex gap-3 pb-4 last:pb-0">
                {/* Timeline dot */}
                <div className="relative z-10 mt-1 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-primary/40 border-2 border-primary" />
                </div>

                {/* Note card */}
                <div
                  className={`flex-1 min-w-0 rounded-lg border p-3 group ${
                    isOptimistic
                      ? "border-border bg-secondary/20 opacity-70"
                      : "border-border bg-secondary/30"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">
                        {authorName}
                      </span>
                      <span
                        className="text-xs text-muted-foreground cursor-default"
                        title={absoluteTime(note.createdAt)}
                      >
                        {relativeTime(note.createdAt)}
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        · {absoluteTime(note.createdAt)}
                      </span>
                    </div>

                    {/* Delete */}
                    {!isLegacy && !isOptimistic && (
                      <div className="flex-shrink-0">
                        {confirmDeleteId === note.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(note.id)}
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[#F41666]/15 text-[#F41666] hover:bg-[#F41666]/30 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(note.id)}
                            className="p-1 rounded text-muted-foreground hover:text-[#F41666] hover:bg-[#F41666]/10 opacity-0 group-hover:opacity-100 transition-all"
                            aria-label="Delete note"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {note.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
