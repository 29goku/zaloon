"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CalendarPlus,
  Bell,
  Star,
  Save,
  Check,
  Loader2,
  Plus,
  Minus,
  Pin,
  X,
  Crown,
  PhoneOff,
  Trash2,
  MessageSquare,
  Mail,
  Send,
} from "lucide-react";
import Link from "next/link";
import {
  updateClientNotes,
  addClientNote,
  deleteClientNote,
  toggleClientNotePin,
  addLoyaltyPoints,
  redeemLoyaltyPoints,
  updateClientTags,
  updateClientPreferences,
  updateClientFlags,
  type ClientPreferences,
} from "@/app/actions/clients";
import type { ClientNote, NoteType } from "@/app/actions/clients-constants";
import { scheduleReminder } from "@/app/actions/reminders";
import { SendMessageModal } from "@/components/clients/send-message-modal";

// ─── Notes helpers ────────────────────────────────────────────────────────────

const NOTE_TYPE_META: Record<
  NoteType,
  { label: string; icon: string; badge: string }
> = {
  general: {
    label: "General",
    icon: "",
    badge: "bg-secondary text-foreground border-border",
  },
  allergy: {
    label: "Allergy",
    icon: "⚠️",
    badge:
      "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  },
  preference: {
    label: "Preference",
    icon: "⭐",
    badge:
      "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  },
  service: {
    label: "Service",
    icon: "💈",
    badge:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  medical: {
    label: "Medical",
    icon: "🏥",
    badge:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
};

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

// ─── Notes Editor ────────────────────────────────────────────────────────────

interface NotesEditorProps {
  clientId: string;
  initialNotes: ClientNote[];
}

export function NotesEditor({ clientId, initialNotes }: NotesEditorProps) {
  const [notes, setNotes] = useState<ClientNote[]>(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("general");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();
  const router = useRouter();

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const regularNotes = notes.filter((n) => !n.isPinned);

  function handleAddNote() {
    if (!newNote.trim()) return;
    setError(null);
    startAdding(async () => {
      const res = await addClientNote(clientId, newNote.trim(), noteType, false);
      if (res.success) {
        const optimistic: ClientNote = {
          id: `optimistic-${Date.now()}`,
          text: newNote.trim(),
          type: noteType,
          isPinned: false,
          createdAt: new Date().toISOString(),
        };
        setNotes((prev) => [optimistic, ...prev]);
        setNewNote("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleDelete(noteId: string) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    startAdding(async () => {
      const res = await deleteClientNote(clientId, noteId);
      if (!res.success) {
        setError(res.error);
        router.refresh(); // revert
      }
    });
  }

  function handleTogglePin(noteId: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n))
    );
    startAdding(async () => {
      const res = await toggleClientNotePin(clientId, noteId);
      if (!res.success) {
        setError(res.error);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Add new note */}
      <div className="space-y-2">
        {/* Note type selector */}
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(NOTE_TYPE_META) as NoteType[]).map((t) => {
            const meta = NOTE_TYPE_META[t];
            return (
              <button
                key={t}
                onClick={() => setNoteType(t)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                  noteType === t
                    ? meta.badge
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {meta.icon && <span>{meta.icon}</span>}
                {meta.label}
              </button>
            );
          })}
        </div>

        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleAddNote();
            }
          }}
          placeholder="Add a note… (Ctrl+Enter to submit)"
          className="min-h-20 resize-y text-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={handleAddNote}
            disabled={isAdding || !newNote.trim()}
            size="sm"
            className="gap-1.5"
          >
            {isAdding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Add Note
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-[#F41666]">{error}</p>}

      {/* Pinned notes */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Star className="size-3 fill-[#F48E16] text-[#F48E16]" />
            Pinned
          </p>
          {pinnedNotes.map((note) => (
            <NoteEntryCard
              key={note.id}
              note={note}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {/* Regular notes */}
      {regularNotes.length > 0 && (
        <div className="space-y-2">
          {pinnedNotes.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">
              All Notes
            </p>
          )}
          {regularNotes.map((note) => (
            <NoteEntryCard
              key={note.id}
              note={note}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {notes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No notes yet. Add the first note above.
        </p>
      )}
    </div>
  );
}

function NoteEntryCard({
  note,
  onDelete,
  onTogglePin,
}: {
  note: ClientNote;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const meta = NOTE_TYPE_META[note.type] ?? NOTE_TYPE_META.general;
  const isLegacy = note.id.startsWith("legacy-");

  return (
    <div
      className={`rounded-lg p-3 border group ${
        note.isPinned
          ? "bg-[#F48E16]/5 border-[#F48E16]/20"
          : "bg-secondary/30 border-border"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {/* Type badge + timestamps */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {note.type !== "general" && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.badge}`}
              >
                {meta.icon && <span>{meta.icon}</span>}
                {meta.label}
              </span>
            )}
            <span
              className="text-xs text-muted-foreground"
              title={absoluteTime(note.createdAt)}
            >
              {relativeTime(note.createdAt)}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              · {absoluteTime(note.createdAt)}
            </span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {note.text}
          </p>
        </div>

        {/* Actions */}
        {!isLegacy && (
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onTogglePin(note.id)}
              title={note.isPinned ? "Unpin" : "Pin"}
              className={`p-1 rounded hover:bg-muted transition-colors ${
                note.isPinned
                  ? "text-[#F48E16]"
                  : "text-muted-foreground hover:text-[#F48E16]"
              }`}
            >
              <Star
                className={`size-3.5 ${note.isPinned ? "fill-[#F48E16]" : ""}`}
              />
            </button>
            <button
              onClick={() => onDelete(note.id)}
              title="Delete note"
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-[#F41666] transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Communication Tab ────────────────────────────────────────────────────────

type CommunicationEntry = {
  id: string;
  type: string;
  status: string;
  message: string;
  scheduledAt: Date;
  sentAt: Date | null;
  createdAt: Date;
};

interface CommunicationTabProps {
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  communications: CommunicationEntry[];
}

const STATUS_COLORS: Record<string, string> = {
  SENT: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  PENDING: "bg-[#F48E16]/15 text-[#F48E16] border-[#F48E16]/30",
  FAILED: "bg-[#F41666]/15 text-[#F41666] border-[#F41666]/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export function CommunicationTab({
  clientId,
  clientName,
  clientPhone,
  communications,
}: CommunicationTabProps) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {communications.length} message{communications.length !== 1 ? "s" : ""} sent
        </p>
        <Button
          size="sm"
          onClick={() => setShowModal(true)}
          className="gap-1.5"
        >
          <Send className="size-3.5" />
          Send Message
        </Button>
      </div>

      {/* Timeline */}
      {communications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No messages sent to this client yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {communications.map((comm) => (
            <div
              key={comm.id}
              className="flex gap-4 p-4 rounded-xl bg-card border border-border"
            >
              {/* Channel icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                {comm.type === "EMAIL" ? (
                  <Mail className="w-4 h-4 text-primary" />
                ) : (
                  <MessageSquare className="w-4 h-4 text-primary" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">
                    {comm.type}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      STATUS_COLORS[comm.status] ?? STATUS_COLORS.CANCELLED
                    }`}
                  >
                    {comm.status}
                  </span>
                  <span
                    className="text-xs text-muted-foreground ml-auto"
                    title={absoluteTime(comm.createdAt.toISOString())}
                  >
                    {relativeTime(comm.createdAt.toISOString())}
                    <span className="hidden sm:inline">
                      {" "}
                      · {absoluteTime(comm.createdAt.toISOString())}
                    </span>
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {comm.message}
                </p>
                {comm.sentAt && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Sent {absoluteTime(comm.sentAt.toISOString())}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compose modal */}
      {showModal && (
        <SendMessageModal
          clientId={clientId}
          clientName={clientName}
          clientPhone={clientPhone}
          onClose={() => {
            setShowModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Tags Editor ─────────────────────────────────────────────────────────────

const PREDEFINED_TAGS = [
  "VIP",
  "Regular",
  "First-timer",
  "Sensitive skin",
  "Allergic",
  "Birthday special",
  "Referral",
];

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  Regular:
    "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "First-timer":
    "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  "Sensitive skin":
    "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30",
  Allergic:
    "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  "Birthday special":
    "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  Referral:
    "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
};

function tagColor(tag: string) {
  return (
    TAG_COLORS[tag] ??
    "bg-secondary text-foreground border-border"
  );
}

interface TagsEditorProps {
  clientId: string;
  initialTags: string[];
}

export function TagsEditor({ clientId, initialTags }: TagsEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [customTag, setCustomTag] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function saveTags(newTags: string[]) {
    setError(null);
    startTransition(async () => {
      const res = await updateClientTags(clientId, newTags);
      if (res.success) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(res.error);
      }
    });
  }

  function toggleTag(tag: string) {
    const next = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];
    setTags(next);
    saveTags(next);
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setCustomTag("");
    saveTags(next);
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    saveTags(next);
  }

  return (
    <div className="space-y-4">
      {/* Current tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${tagColor(tag)}`}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:opacity-70 transition-opacity"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {tags.length === 0 && (
        <p className="text-sm text-muted-foreground">No tags yet.</p>
      )}

      {/* Predefined tags */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Quick Add
        </p>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                disabled={isPending}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  active
                    ? `${tagColor(tag)} opacity-50`
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {active ? <Check className="size-3 mr-1" /> : <Plus className="size-3 mr-1" />}
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom tag */}
      <div className="flex gap-2">
        <Input
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
          placeholder="Custom tag…"
          className="flex-1 text-sm h-8"
        />
        <Button
          onClick={addCustomTag}
          disabled={isPending || !customTag.trim()}
          size="sm"
          variant="outline"
          className="h-8"
        >
          Add
        </Button>
      </div>

      {error && <p className="text-xs text-[#F41666]">{error}</p>}
      {isPending && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" /> Saving…
        </p>
      )}
      {saved && (
        <p className="text-xs text-primary flex items-center gap-1">
          <Check className="size-3" /> Saved
        </p>
      )}
    </div>
  );
}

// ─── Preferences Editor ───────────────────────────────────────────────────────

interface PreferencesEditorProps {
  clientId: string;
  initialPreferences: ClientPreferences;
}

export function PreferencesEditor({
  clientId,
  initialPreferences,
}: PreferencesEditorProps) {
  const [prefs, setPrefs] = useState<ClientPreferences>(initialPreferences);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function setField<K extends keyof ClientPreferences>(
    key: K,
    value: ClientPreferences[K]
  ) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateClientPreferences(clientId, prefs);
      if (res.success) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Preferred time */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
          Preferred Time
        </label>
        <div className="flex gap-2">
          {(["morning", "afternoon", "evening"] as const).map((t) => (
            <button
              key={t}
              onClick={() =>
                setField("preferredTime", prefs.preferredTime === t ? "" : t)
              }
              className={`flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all ${
                prefs.preferredTime === t
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Communication preference */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
          Communication Preference
        </label>
        <div className="flex flex-wrap gap-2">
          {(["sms", "email", "whatsapp", "none"] as const).map((c) => (
            <button
              key={c}
              onClick={() =>
                setField(
                  "communicationPref",
                  prefs.communicationPref === c ? "" : c
                )
              }
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all ${
                prefs.communicationPref === c
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Hair type */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
          Hair Type
        </label>
        <div className="flex flex-wrap gap-2">
          {(["straight", "wavy", "curly", "coily"] as const).map((h) => (
            <button
              key={h}
              onClick={() =>
                setField("hairType", prefs.hairType === h ? "" : h)
              }
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all ${
                prefs.hairType === h
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
          Allergies / Sensitivities
        </label>
        <Textarea
          value={prefs.allergies ?? ""}
          onChange={(e) => setField("allergies", e.target.value)}
          placeholder="e.g. PPD, ammonia, latex…"
          className="min-h-16 text-sm resize-y"
        />
      </div>

      {/* Color history */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
          Color History
        </label>
        <Textarea
          value={prefs.colorHistory ?? ""}
          onChange={(e) => setField("colorHistory", e.target.value)}
          placeholder="Previous color treatments, brand preferences…"
          className="min-h-16 text-sm resize-y"
        />
      </div>

      {error && <p className="text-xs text-[#F41666]">{error}</p>}

      <Button
        onClick={handleSave}
        disabled={isPending}
        size="sm"
        variant={saved ? "outline" : "default"}
        className="gap-1.5"
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : saved ? (
          <Check className="size-3.5 text-primary" />
        ) : (
          <Save className="size-3.5" />
        )}
        {isPending ? "Saving…" : saved ? "Saved" : "Save Preferences"}
      </Button>
    </div>
  );
}

// ─── Client Flags Toggle ──────────────────────────────────────────────────────

interface ClientFlagsProps {
  clientId: string;
  isVip: boolean;
  doNotContact: boolean;
}

export function ClientFlagsToggle({
  clientId,
  isVip,
  doNotContact,
}: ClientFlagsProps) {
  const [vip, setVip] = useState(isVip);
  const [dnc, setDnc] = useState(doNotContact);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggleFlag(flag: "isVip" | "doNotContact") {
    setError(null);
    const newVip = flag === "isVip" ? !vip : vip;
    const newDnc = flag === "doNotContact" ? !dnc : dnc;
    if (flag === "isVip") setVip(newVip);
    else setDnc(newDnc);

    startTransition(async () => {
      const res = await updateClientFlags(clientId, {
        isVip: newVip,
        doNotContact: newDnc,
      });
      if (res.success) {
        router.refresh();
      } else {
        // Revert
        if (flag === "isVip") setVip(vip);
        else setDnc(dnc);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => toggleFlag("isVip")}
        disabled={isPending}
        className={`flex items-center gap-2 w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
          vip
            ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-600 dark:text-yellow-400"
            : "bg-card border-border text-muted-foreground hover:border-yellow-500/30"
        }`}
      >
        <Crown className="w-4 h-4 flex-shrink-0" />
        VIP Client
        <span className="ml-auto text-xs opacity-70">{vip ? "On" : "Off"}</span>
      </button>

      <button
        onClick={() => toggleFlag("doNotContact")}
        disabled={isPending}
        className={`flex items-center gap-2 w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
          dnc
            ? "bg-[#F41666]/10 border-[#F41666]/40 text-[#F41666]"
            : "bg-card border-border text-muted-foreground hover:border-[#F41666]/30"
        }`}
      >
        <PhoneOff className="w-4 h-4 flex-shrink-0" />
        Do Not Contact
        <span className="ml-auto text-xs opacity-70">{dnc ? "On" : "Off"}</span>
      </button>

      {error && <p className="text-xs text-[#F41666]">{error}</p>}
      {isPending && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" /> Saving…
        </p>
      )}
    </div>
  );
}

// ─── Quick Actions Sidebar ────────────────────────────────────────────────────

interface QuickActionsProps {
  clientId: string;
  /** ID of the nearest upcoming appointment, if any */
  upcomingAppointmentId: string | null;
  currentPoints: number;
}

export function QuickActions({
  clientId,
  upcomingAppointmentId,
  currentPoints,
}: QuickActionsProps) {
  return (
    <div className="space-y-3">
      {/* Schedule appointment */}
      <Link
        href={`/dashboard/appointments?new=1&clientId=${clientId}`}
        className="flex items-center gap-2.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
      >
        <CalendarPlus className="w-4 h-4 text-primary flex-shrink-0" />
        Schedule Appointment
      </Link>

      {/* Send reminder */}
      {upcomingAppointmentId ? (
        <SendReminderButton appointmentId={upcomingAppointmentId} />
      ) : (
        <button
          disabled
          className="flex items-center gap-2.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
        >
          <Bell className="w-4 h-4 flex-shrink-0" />
          Send Reminder
          <span className="ml-auto text-xs">(no upcoming)</span>
        </button>
      )}

      {/* Adjust points */}
      <AdjustPointsPanel clientId={clientId} currentPoints={currentPoints} />
    </div>
  );
}

// ─── Send Reminder Button ────────────────────────────────────────────────────

interface SendReminderButtonProps {
  appointmentId: string;
}

function SendReminderButton({ appointmentId }: SendReminderButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSend() {
    startTransition(async () => {
      const res = await scheduleReminder(appointmentId, "SMS", 24);
      if (res.success) {
        setDone(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleSend}
        disabled={isPending || done}
        className="flex items-center gap-2.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
        ) : done ? (
          <Check className="w-4 h-4 text-primary flex-shrink-0" />
        ) : (
          <Bell className="w-4 h-4 text-primary flex-shrink-0" />
        )}
        {done ? "Reminder Scheduled" : isPending ? "Scheduling…" : "Send Reminder"}
      </button>
      {error && <p className="text-xs text-[#F41666] px-1">{error}</p>}
    </div>
  );
}

// ─── Adjust Points Panel ─────────────────────────────────────────────────────

interface AdjustPointsPanelProps {
  clientId: string;
  currentPoints: number;
}

function AdjustPointsPanel({ clientId, currentPoints }: AdjustPointsPanelProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"add" | "subtract">("add");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const router = useRouter();

  function handleAdjust() {
    const pts = parseInt(amount, 10);
    if (!pts || pts <= 0) {
      setFeedback({ type: "error", message: "Enter a positive number" });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res =
        mode === "add"
          ? await addLoyaltyPoints(clientId, pts, "Manual adjustment")
          : await redeemLoyaltyPoints(clientId, pts);

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Points updated. New total: ${"newTotal" in res ? res.newTotal : ""} pts`,
        });
        setAmount("");
        router.refresh();
        setTimeout(() => {
          setOpen(false);
          setFeedback(null);
        }, 2000);
      } else {
        setFeedback({ type: "error", message: res.error });
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
      >
        <Star className="w-4 h-4 text-[#F48E16] flex-shrink-0" />
        Adjust Points
        <span className="ml-auto text-xs text-muted-foreground">
          {currentPoints} pts
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("add")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                mode === "add"
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <Plus className="size-3" /> Add
            </button>
            <button
              onClick={() => setMode("subtract")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                mode === "subtract"
                  ? "bg-[#F41666]/15 border-[#F41666]/40 text-[#F41666]"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <Minus className="size-3" /> Subtract
            </button>
          </div>

          {/* Amount input */}
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Points"
              className="flex-1 text-sm"
            />
            <Button
              onClick={handleAdjust}
              disabled={isPending || !amount}
              size="sm"
              variant={mode === "subtract" ? "destructive" : "default"}
              className="shrink-0"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
          </div>

          {feedback && (
            <p
              className={`text-xs ${
                feedback.type === "success" ? "text-primary" : "text-[#F41666]"
              }`}
            >
              {feedback.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
