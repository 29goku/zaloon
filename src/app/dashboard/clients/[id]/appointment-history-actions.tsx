"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Save,
  Star,
  CalendarPlus,
  Receipt,
  Pencil,
  ImagePlus,
  Trash2,
  X,
} from "lucide-react";
import { updateAppointmentNotes, type AppointmentNotes } from "@/app/actions/appointments";
import { addClientPhoto, removeClientPhoto } from "@/app/actions/clients";
import { ImageUpload } from "@/components/ui/image-upload";
import Link from "next/link";

// ─── Formula Notes Box ────────────────────────────────────────────────────────

interface FormulaNoteBoxProps {
  appointmentId: string;
  initialNotes: AppointmentNotes;
}

export function FormulaNoteBox({ appointmentId, initialNotes }: FormulaNoteBoxProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<AppointmentNotes>(initialNotes);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function setField(key: keyof AppointmentNotes, value: string) {
    setNotes((n) => ({ ...n, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateAppointmentNotes(appointmentId, notes);
      if (res.success) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(res.error);
      }
    });
  }

  const hasContent =
    notes.general ||
    notes.formula ||
    notes.processingTime ||
    notes.result ||
    notes.nextVisit ||
    notes.products;

  return (
    <div className="mt-3 rounded-lg border border-border bg-secondary/20 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Pencil className="size-3 text-primary" />
          Formula &amp; Service Notes
          {hasContent && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          )}
        </span>
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                General Notes
              </label>
              <Textarea
                value={notes.general ?? ""}
                onChange={(e) => setField("general", e.target.value)}
                placeholder="General appointment notes…"
                className="min-h-16 resize-none text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                Color Formula
              </label>
              <Textarea
                value={notes.formula ?? ""}
                onChange={(e) => setField("formula", e.target.value)}
                placeholder="e.g. 10vol, Wella 6/0 + 20g 7/3…"
                className="min-h-16 resize-none text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                Processing Time
              </label>
              <Input
                value={notes.processingTime ?? ""}
                onChange={(e) => setField("processingTime", e.target.value)}
                placeholder="e.g. 35 minutes"
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                Result
              </label>
              <Input
                value={notes.result ?? ""}
                onChange={(e) => setField("result", e.target.value)}
                placeholder="e.g. Beautiful warm brown"
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                Next Visit Recommendation
              </label>
              <Input
                value={notes.nextVisit ?? ""}
                onChange={(e) => setField("nextVisit", e.target.value)}
                placeholder="e.g. 8 weeks"
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                Products Used
              </label>
              <Input
                value={notes.products ?? ""}
                onChange={(e) => setField("products", e.target.value)}
                placeholder="e.g. Olaplex No.1, Wella Color Touch"
                className="text-xs h-8"
              />
            </div>
          </div>

          {error && <p className="text-xs text-[#F41666]">{error}</p>}

          <Button
            onClick={handleSave}
            disabled={isPending}
            size="sm"
            variant={saved ? "outline" : "default"}
            className="gap-1.5 h-7 text-xs"
          >
            {isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : saved ? (
              <Check className="size-3 text-primary" />
            ) : (
              <Save className="size-3" />
            )}
            {isPending ? "Saving…" : saved ? "Saved" : "Save Notes"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Rebook Button ────────────────────────────────────────────────────────────

interface RebookButtonProps {
  clientId: string;
  appointmentId: string;
}

export function RebookButton({ clientId, appointmentId }: RebookButtonProps) {
  return (
    <Link
      href={`/dashboard/appointments?new=1&clientId=${clientId}&rebookFrom=${appointmentId}`}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
    >
      <CalendarPlus className="size-3 text-primary" />
      Rebook
    </Link>
  );
}

// ─── Add Note Button (inline note on appointment) ─────────────────────────────

interface AddAppointmentNoteButtonProps {
  appointmentId: string;
  currentNotes: AppointmentNotes;
}

export function AddAppointmentNoteButton({
  appointmentId,
  currentNotes,
}: AddAppointmentNoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(currentNotes.general ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateAppointmentNotes(appointmentId, {
        ...currentNotes,
        general: text,
      });
      if (res.success) {
        setSaved(true);
        router.refresh();
        setTimeout(() => {
          setSaved(false);
          setOpen(false);
        }, 1500);
      } else {
        setError(res.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
      >
        <Pencil className="size-3 text-muted-foreground" />
        Add Note
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a note for this appointment…"
        className="min-h-16 resize-none text-xs"
        autoFocus
      />
      {error && <p className="text-xs text-[#F41666]">{error}</p>}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isPending}
          size="sm"
          className="h-7 text-xs gap-1.5"
        >
          {isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : saved ? (
            <Check className="size-3" />
          ) : (
            <Save className="size-3" />
          )}
          {saved ? "Saved" : "Save"}
        </Button>
        <Button
          onClick={() => setOpen(false)}
          disabled={isPending}
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Star Rating Display ──────────────────────────────────────────────────────

export function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`size-3 ${
            i < rating ? "fill-[#F48E16] text-[#F48E16]" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </span>
  );
}

// ─── Photo Gallery Tab ────────────────────────────────────────────────────────

interface PhotoGalleryProps {
  clientId: string;
  initialPhotos: string[];
}

export function PhotoGallery({ clientId, initialPhotos }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const router = useRouter();

  function handleAdd(base64: string | null) {
    if (!base64) return;
    setError(null);
    startTransition(async () => {
      const res = await addClientPhoto(clientId, base64);
      if (res.success) {
        setPhotos((p) => [...p, base64]);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleRemove(url: string) {
    setRemoving(url);
    setError(null);
    startTransition(async () => {
      const res = await removeClientPhoto(clientId, url);
      if (res.success) {
        setPhotos((p) => p.filter((ph) => ph !== url));
        router.refresh();
      } else {
        setError(res.error);
      }
      setRemoving(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Add photo */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ImagePlus className="size-4 text-primary" />
          Add Photo
        </p>
        <div className="flex flex-col items-center gap-2">
          <ImageUpload
            value={null}
            onChange={handleAdd}
            size="lg"
            shape="square"
            placeholder={
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImagePlus className="size-8 opacity-40" />
                <span className="text-xs">Upload or take photo</span>
              </div>
            }
          />
          <p className="text-xs text-muted-foreground">Hover to upload from file or use camera</p>
        </div>
        {error && <p className="text-xs text-[#F41666]">{error}</p>}
        {isPending && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Saving…</p>}
      </div>

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImagePlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No photos yet. Add the first one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((url) => (
            <div
              key={url}
              className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-secondary/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Client photo"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleRemove(url)}
                disabled={removing === url || isPending}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#F41666] disabled:opacity-50"
                aria-label="Remove photo"
              >
                {removing === url ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <X className="size-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
