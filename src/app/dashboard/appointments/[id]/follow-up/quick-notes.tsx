"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  updateAppointmentNotes,
  type AppointmentNotes,
} from "@/app/actions/appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Save, Loader2, Check } from "lucide-react";

interface QuickNotesProps {
  appointmentId: string;
  /** Raw notes JSON string from appointment.notes, or null */
  notesJson: string | null;
}

function parseNotes(raw: string | null): AppointmentNotes {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as AppointmentNotes;
    }
    // Plain string notes — treat as general
    return { general: raw };
  } catch {
    return { general: raw };
  }
}

export function QuickNotes({ appointmentId, notesJson }: QuickNotesProps) {
  const router = useRouter();
  const parsed = React.useMemo(() => parseNotes(notesJson), [notesJson]);

  const [generalNote, setGeneralNote] = React.useState(parsed.general ?? "");
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setError(null);
    setSaved(false);

    const updated: AppointmentNotes = {
      ...parsed,
      general: generalNote.trim() || undefined,
    };

    const result = await updateAppointmentNotes(appointmentId, updated);
    setPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSaved(true);
    router.refresh();

    // Reset saved indicator after 2.5 s
    setTimeout(() => setSaved(false), 2500);
  }

  const hasExistingNotes =
    parsed.formula ||
    parsed.processingTime ||
    parsed.result ||
    parsed.nextVisit ||
    parsed.products;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="w-5 h-5 text-primary" />
          Quick Notes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add a note for this appointment — visible on the client profile.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show existing structured notes read-only */}
        {hasExistingNotes && (
          <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2 text-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Saved details
            </p>
            {parsed.formula && (
              <div>
                <span className="text-muted-foreground font-medium">Formula: </span>
                <span className="text-foreground">{parsed.formula}</span>
              </div>
            )}
            {parsed.processingTime && (
              <div>
                <span className="text-muted-foreground font-medium">Processing time: </span>
                <span className="text-foreground">{parsed.processingTime}</span>
              </div>
            )}
            {parsed.result && (
              <div>
                <span className="text-muted-foreground font-medium">Result: </span>
                <span className="text-foreground">{parsed.result}</span>
              </div>
            )}
            {parsed.products && (
              <div>
                <span className="text-muted-foreground font-medium">Products used: </span>
                <span className="text-foreground">{parsed.products}</span>
              </div>
            )}
            {parsed.nextVisit && (
              <div>
                <span className="text-muted-foreground font-medium">Next visit note: </span>
                <span className="text-foreground">{parsed.nextVisit}</span>
              </div>
            )}
          </div>
        )}

        {/* General note textarea */}
        <div className="space-y-2">
          <Textarea
            id="quick-note"
            placeholder="Add a general note for this appointment…"
            value={generalNote}
            onChange={(e) => {
              setGeneralNote(e.target.value);
              setSaved(false);
            }}
            rows={3}
            className="resize-none text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          className="w-full gap-2"
          onClick={handleSave}
          disabled={pending}
          variant={saved ? "outline" : "default"}
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500">Saved</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Note
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
