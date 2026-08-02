"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConfirmationTemplates, ConfirmationTemplate } from "@/app/actions/settings";
import { saveConfirmationTemplates } from "@/app/actions/settings";

const SMS_MAX = 4096;

const EVENT_LABELS: Array<{ key: keyof ConfirmationTemplates; label: string; description: string; hasEmail: boolean }> = [
  {
    key: "bookingConfirmed",
    label: "Booking Confirmed",
    description: "Sent immediately when a booking is successfully placed.",
    hasEmail: true,
  },
  {
    key: "bookingCancelled",
    label: "Booking Cancelled",
    description: "Sent when a booking is cancelled by client or salon.",
    hasEmail: true,
  },
  {
    key: "reminder24h",
    label: "Reminder — 24 hours before",
    description: "Sent the day before the appointment.",
    hasEmail: true,
  },
  {
    key: "reminder2h",
    label: "Reminder — 2 hours before",
    description: "Sent 2 hours before the appointment.",
    hasEmail: true,
  },
  {
    key: "followUp",
    label: "Follow-up after visit",
    description: "Sent a few hours after the appointment concludes.",
    hasEmail: true,
  },
];

interface Props {
  initialTemplates: ConfirmationTemplates;
}

export function ConfirmationTemplatesClient({ initialTemplates }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState<ConfirmationTemplates>(initialTemplates);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof ConfirmationTemplates>("bookingConfirmed");

  function update(key: keyof ConfirmationTemplates, patch: Partial<ConfirmationTemplate>) {
    setTemplates((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
    setSaveSuccess(false);
  }

  function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);
    startTransition(async () => {
      const res = await saveConfirmationTemplates(templates);
      if (res.success) {
        setSaveSuccess(true);
        router.refresh();
      } else {
        setSaveError(res.error ?? "Failed to save");
      }
    });
  }

  const currentEvent = EVENT_LABELS.find((e) => e.key === activeTab)!;
  const tpl = templates[activeTab];
  const smsLen = tpl.smsBody?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Event tabs */}
      <div className="flex gap-2 flex-wrap">
        {EVENT_LABELS.map((ev) => (
          <button
            key={ev.key}
            type="button"
            onClick={() => setActiveTab(ev.key)}
            className={[
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
              activeTab === ev.key
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            ].join(" ")}
          >
            {ev.label}
          </button>
        ))}
      </div>

      {/* Editor panel */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">{currentEvent.label}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{currentEvent.description}</p>
        </div>

        {/* WhatsApp body */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              WhatsApp Body
            </label>
            <span
              className={[
                "text-xs font-mono",
                smsLen > SMS_MAX ? "text-destructive font-semibold" : smsLen > SMS_MAX * 0.85 ? "text-amber-500" : "text-muted-foreground",
              ].join(" ")}
            >
              {smsLen} / {SMS_MAX}
              {smsLen > SMS_MAX && " — exceeds WhatsApp limit"}
            </span>
          </div>
          <textarea
            rows={4}
            value={tpl.smsBody ?? ""}
            onChange={(e) => update(activeTab, { smsBody: e.target.value })}
            placeholder="WhatsApp message body…"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
          />
          {smsLen > SMS_MAX && (
            <p className="text-xs text-destructive mt-1">
              Message exceeds WhatsApp 4096 character limit.
            </p>
          )}
        </div>

        {/* Email subject */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Email Subject
          </label>
          <input
            type="text"
            value={tpl.emailSubject ?? ""}
            onChange={(e) => update(activeTab, { emailSubject: e.target.value })}
            placeholder="Email subject line…"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Email body */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Email Body <span className="font-normal normal-case tracking-normal text-muted-foreground">(Markdown supported)</span>
          </label>
          <textarea
            rows={8}
            value={tpl.emailBody ?? ""}
            onChange={(e) => update(activeTab, { emailBody: e.target.value })}
            placeholder="Email message body…"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
          />
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          {saveSuccess && <p className="text-sm text-green-700 dark:text-green-400">Templates saved successfully.</p>}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save All Templates"}
        </button>
      </div>
    </div>
  );
}
