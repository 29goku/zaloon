"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  MessageSquare,
  Mail,
  MessageCircle,
  Star,
  Info,
} from "lucide-react";
import { saveReminderSettings, type ReminderSettings } from "@/app/actions/settings";

const HOURS_OPTIONS = [
  { label: "1 hour before", value: 1 },
  { label: "2 hours before", value: 2 },
  { label: "4 hours before", value: 4 },
  { label: "24 hours before", value: 24 },
  { label: "48 hours before", value: 48 },
];

const POST_VISIT_DELAY_OPTIONS = [
  { label: "2 hours after", value: 2 },
  { label: "4 hours after", value: 4 },
  { label: "1 day after", value: 24 },
];

const MERGE_TAGS = [
  "{{clientName}}",
  "{{date}}",
  "{{time}}",
  "{{staffName}}",
  "{{services}}",
  "{{salonName}}",
];

function MergeTagHelper({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {tags.map((tag) => (
        <code
          key={tag}
          className="text-[11px] bg-muted/70 border border-border/60 rounded px-1.5 py-0.5 text-muted-foreground font-mono select-all cursor-pointer"
          title="Click to copy"
          onClick={() => navigator.clipboard?.writeText(tag).catch(() => {})}
        >
          {tag}
        </code>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  note,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  note?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5 flex-shrink-0" style={{ width: 40, height: 22 }}>
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          style={{ width: 40, height: 22, borderRadius: 11 }}
          className={`transition-colors ${checked ? "bg-violet-500" : "bg-muted"}`}
        />
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,.3)",
            transition: "transform 150ms",
            transform: checked ? "translateX(18px)" : "translateX(0)",
          }}
        />
      </div>
      <div className="min-w-0">
        <span className="text-sm font-medium leading-5">{label}</span>
        {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
      </div>
    </label>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-400/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-violet-400" />
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

interface ReminderConfigFormProps {
  initialSettings: ReminderSettings;
}

export function ReminderConfigForm({ initialSettings }: ReminderConfigFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [settings, setSettings] = useState<ReminderSettings>(initialSettings);
  const [customMinutes, setCustomMinutes] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  function toggleHoursBefore(h: number, checked: boolean) {
    setSettings((prev) => ({
      ...prev,
      hoursBefore: checked
        ? [...prev.hoursBefore.filter((x) => x !== h), h].sort((a, b) => b - a)
        : prev.hoursBefore.filter((x) => x !== h),
    }));
  }

  function handleAddCustom() {
    const mins = parseInt(customMinutes, 10);
    if (!isNaN(mins) && mins > 0) {
      const hours = mins / 60;
      setSettings((prev) => ({
        ...prev,
        hoursBefore: [...prev.hoursBefore.filter((x) => x !== hours), hours].sort(
          (a, b) => b - a
        ),
      }));
      setCustomMinutes("");
      setShowCustomInput(false);
    }
  }

  function handleSave() {
    setSaved(false);
    setSaveError(null);
    startTransition(async () => {
      const result = await saveReminderSettings(settings);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      } else {
        setSaveError(result.error);
      }
    });
  }

  const customHours = settings.hoursBefore.filter(
    (h) => !HOURS_OPTIONS.find((o) => o.value === h)
  );

  return (
    <div className="space-y-4">
      {/* 1. Appointment Reminder Timing */}
      <SectionCard title="Appointment Reminder Timing" icon={Clock}>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Select when to send reminders before the appointment. Multiple windows can be active
            simultaneously.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HOURS_OPTIONS.map(({ label, value }) => {
              const checked = settings.hoursBefore.includes(value);
              return (
                <label
                  key={value}
                  className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 cursor-pointer transition-colors ${
                    checked
                      ? "border-violet-500/50 bg-violet-500/5"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => toggleHoursBefore(value, e.target.checked)}
                  />
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      checked ? "bg-violet-500 border-violet-500" : "border-muted-foreground/40"
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white" aria-hidden="true">
                        <path
                          d="M1 4l2.5 2.5L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm">{label}</span>
                </label>
              );
            })}

            {/* Custom timing */}
            <div className="flex items-center rounded-lg border border-border px-3.5 py-2.5 min-h-[46px]">
              {showCustomInput ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="number"
                    min={1}
                    placeholder="Minutes"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                    className="flex-1 min-w-0 bg-muted rounded px-2 py-1 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-violet-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  + Custom (enter minutes)
                </button>
              )}
            </div>
          </div>

          {customHours.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Custom intervals:{" "}
              {customHours
                .map((h) => (h < 1 ? `${Math.round(h * 60)} min` : `${h}h`))
                .join(", ")}{" "}
              before
            </p>
          )}
        </div>

        <div className="border-t border-border/50 pt-4 space-y-3">
          <Toggle
            checked={settings.dayBeforeAt5pm}
            onChange={(v) => setSettings((prev) => ({ ...prev, dayBeforeAt5pm: v }))}
            label="Send day-before reminder at 5 PM"
            note="Always sends at 5:00 PM the evening before the appointment"
          />
        </div>
      </SectionCard>

      {/* 2. Channels */}
      <SectionCard title="Channels" icon={Bell}>
        <div className="space-y-4">
          <Toggle
            checked={settings.smsEnabled}
            onChange={(v) => setSettings((prev) => ({ ...prev, smsEnabled: v }))}
            label="WhatsApp"
            note="Via WhatsApp Business API"
          />
          <Toggle
            checked={settings.emailEnabled}
            onChange={(v) => setSettings((prev) => ({ ...prev, emailEnabled: v }))}
            label="Email"
            note="Requires SMTP configuration"
          />
          <Toggle
            checked={settings.whatsappEnabled}
            onChange={(v) => setSettings((prev) => ({ ...prev, whatsappEnabled: v }))}
            label="WhatsApp"
            note="Via WhatsApp Business API"
          />
        </div>

        {!settings.smsEnabled && !settings.emailEnabled && !settings.whatsappEnabled && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-400">
            <Info className="size-4 mt-0.5 flex-shrink-0" />
            <span>No channels are enabled. Reminders will be saved but not delivered.</span>
          </div>
        )}
      </SectionCard>

      {/* 3. Message Templates */}
      <SectionCard title="Message Templates" icon={Mail}>
        <div className="space-y-6">
          {/* WhatsApp */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              WhatsApp Reminder Template
            </label>
            <textarea
              value={settings.smsTemplate}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, smsTemplate: e.target.value }))
              }
              rows={3}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-muted-foreground/50"
              placeholder="Hi {{clientName}}, reminder for your appointment…"
            />
            <MergeTagHelper tags={MERGE_TAGS} />
          </div>

          {/* Email Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              Email Subject
            </label>
            <input
              type="text"
              value={settings.emailSubject}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, emailSubject: e.target.value }))
              }
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Appointment Reminder – {{salonName}}"
            />
            <MergeTagHelper tags={MERGE_TAGS} />
          </div>

          {/* Email Body */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              Email Body
            </label>
            <textarea
              value={settings.emailBody}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, emailBody: e.target.value }))
              }
              rows={8}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-muted-foreground/50"
              placeholder="Hi {{clientName}},&#10;&#10;This is a reminder for your appointment…"
            />
            <MergeTagHelper tags={MERGE_TAGS} />
            <p className="text-xs text-muted-foreground">
              Supports Markdown: **bold**, *italic*. Use blank lines for paragraph breaks.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* 4. Post-visit / Follow-up */}
      <SectionCard title="Follow-up & Post-visit" icon={Star}>
        <div className="space-y-4">
          <Toggle
            checked={settings.postVisitReviewEnabled}
            onChange={(v) =>
              setSettings((prev) => ({ ...prev, postVisitReviewEnabled: v }))
            }
            label="Send review request after appointment"
            note="Automatically message clients after their visit to request a review"
          />

          {settings.postVisitReviewEnabled && (
            <div className="pl-4 border-l-2 border-violet-500/20 space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Send delay
                </p>
                <div className="flex flex-wrap gap-2">
                  {POST_VISIT_DELAY_OPTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, postVisitDelayHours: value }))
                      }
                      className={`text-sm rounded-lg px-3.5 py-1.5 border transition-colors ${
                        settings.postVisitDelayHours === value
                          ? "bg-violet-500 border-violet-500 text-white"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="size-4 text-muted-foreground" />
                  Review Request Template
                </label>
                <textarea
                  value={settings.postVisitTemplate}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, postVisitTemplate: e.target.value }))
                  }
                  rows={3}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-muted-foreground/50"
                  placeholder="Hi {{clientName}}, thank you for visiting {{salonName}}! …"
                />
                <MergeTagHelper tags={[...MERGE_TAGS, "{{reviewLink}}"]} />
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Save bar */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 transition-colors"
        >
          {isPending ? "Saving…" : "Save Reminder Settings"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-400 font-medium">Settings saved.</span>
        )}
        {saveError && <span className="text-sm text-red-400">{saveError}</span>}
      </div>
    </div>
  );
}
