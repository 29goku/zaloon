"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Loader2, CalendarDays, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  launchCampaign,
  deleteCampaign,
  updateCampaign,
} from "@/app/actions/campaigns";

// ── Edit form (DRAFT only) ─────────────────────────────────────────────────────

interface EditFormProps {
  id: string;
  name: string;
  message: string;
  subject: string | null;
  scheduledAt: string | null;
}

export function CampaignEditForm({
  id,
  name,
  message,
  subject,
  scheduledAt,
}: EditFormProps) {
  const router = useRouter();
  const [formName, setFormName] = React.useState(name);
  const [formMessage, setFormMessage] = React.useState(message);
  const [formSubject, setFormSubject] = React.useState(subject ?? "");
  const [formScheduledAt, setFormScheduledAt] = React.useState(
    scheduledAt ? scheduledAt.slice(0, 16) : ""
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await updateCampaign(id, {
        name: formName,
        message: formMessage,
        subject: formSubject || null,
        scheduledAt: formScheduledAt ? new Date(formScheduledAt) : null,
      });
      if (!result.success) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-name">Campaign name</Label>
        <Input
          id="edit-name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          required
        />
      </div>

      {subject !== null && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-subject">Email subject</Label>
          <Input
            id="edit-subject"
            value={formSubject}
            onChange={(e) => setFormSubject(e.target.value)}
            placeholder="e.g. A special offer just for you!"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-message">Message</Label>
        <Textarea
          id="edit-message"
          value={formMessage}
          onChange={(e) => setFormMessage(e.target.value)}
          className="resize-none min-h-[120px]"
          required
        />
        <p className="text-xs text-muted-foreground text-right tabular-nums">
          {formMessage.length} / 1600
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-scheduled">Schedule (optional)</Label>
        <Input
          id="edit-scheduled"
          type="datetime-local"
          value={formScheduledAt}
          onChange={(e) => setFormScheduledAt(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Changes saved.
        </p>
      )}

      <Button type="submit" disabled={saving} className="gap-2">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Pencil className="w-4 h-4" />
            Save Changes
          </>
        )}
      </Button>
    </form>
  );
}

// ── Send / Schedule buttons ───────────────────────────────────────────────────

interface SendButtonsProps {
  id: string;
  name: string;
  scheduledAt: string | null;
}

export function CampaignSendButtons({ id, name, scheduledAt }: SendButtonsProps) {
  const router = useRouter();
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSendNow() {
    if (
      !confirm(
        `Send campaign "${name}" now? This will simulate delivery to all recipients.`
      )
    )
      return;
    setSending(true);
    setError(null);
    try {
      const result = await launchCampaign(id);
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={handleSendNow}
        disabled={sending}
        className="gap-2"
      >
        {sending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send Now
          </>
        )}
      </Button>

      {scheduledAt && (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
          <CalendarDays className="w-4 h-4" />
          Scheduled:{" "}
          {new Date(scheduledAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-1 w-full">{error}</p>}
    </div>
  );
}

// ── Delete button ─────────────────────────────────────────────────────────────

interface DeleteButtonProps {
  id: string;
  name: string;
}

export function CampaignDeleteButton({ id, name }: DeleteButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteCampaign(id);
      if (!result.success) {
        setError(result.error);
        setDeleting(false);
      } else {
        router.push("/dashboard/campaigns");
      }
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={deleting}
        className="gap-2"
      >
        {deleting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Deleting…
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4" />
            Delete Campaign
          </>
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
