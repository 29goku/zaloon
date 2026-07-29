"use client";

import * as React from "react";
import { Phone, Mail, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Merge tag definitions ─────────────────────────────────────────────────────

const MERGE_TAGS = [
  { tag: "{{clientName}}", label: "Client Name" },
  { tag: "{{salonName}}", label: "Salon Name" },
  { tag: "{{date}}", label: "Date" },
  { tag: "{{time}}", label: "Time" },
  { tag: "{{staffName}}", label: "Staff Name" },
  { tag: "{{services}}", label: "Services" },
] as const;

// ── Preview modals ────────────────────────────────────────────────────────────

function SmsPreview({ message, onClose }: { message: string; onClose: () => void }) {
  // Replace merge tags with placeholder values for preview
  const preview = message
    .replace(/{{clientName}}/g, "Sarah")
    .replace(/{{salonName}}/g, "Zaloon Salon")
    .replace(/{{date}}/g, "Jul 30, 2026")
    .replace(/{{time}}/g, "2:00 PM")
    .replace(/{{staffName}}/g, "Maria")
    .replace(/{{services}}/g, "Haircut, Blowdry");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-xs bg-background rounded-2xl shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close preview"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Phone chrome */}
        <div className="bg-zinc-900 px-4 pt-6 pb-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-400 font-medium">SMS Preview</span>
          </div>
          {/* Phone body */}
          <div className="w-48 rounded-2xl bg-zinc-800 border border-zinc-700 px-3 py-4 space-y-3">
            {/* Status bar stub */}
            <div className="flex justify-between text-[9px] text-zinc-500">
              <span>9:41</span>
              <span>●●●</span>
            </div>
            {/* Sender */}
            <p className="text-center text-[10px] text-zinc-400">Salon</p>
            {/* Bubble */}
            <div className="bg-zinc-700 rounded-2xl rounded-tl-sm px-3 py-2">
              <p className="text-[11px] text-white leading-relaxed whitespace-pre-wrap break-words">
                {preview || "Your message will appear here."}
              </p>
            </div>
          </div>
        </div>

        {/* Character count note */}
        <div className="px-4 py-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            {preview.length} characters
            {preview.length > 160 && (
              <span className="ml-1 text-amber-500 font-medium">
                — will be split into {Math.ceil(preview.length / 160)} SMS parts
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailPreview({ message, onClose }: { message: string; onClose: () => void }) {
  const preview = message
    .replace(/{{clientName}}/g, "Sarah")
    .replace(/{{salonName}}/g, "Zaloon Salon")
    .replace(/{{date}}/g, "Jul 30, 2026")
    .replace(/{{time}}/g, "2:00 PM")
    .replace(/{{staffName}}/g, "Maria")
    .replace(/{{services}}/g, "Haircut, Blowdry");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close preview"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Email client chrome */}
        <div className="bg-blue-950 px-4 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-300" />
            <span className="text-xs text-blue-300 font-medium">Email Preview</span>
          </div>
        </div>

        {/* Email header */}
        <div className="bg-blue-900/40 px-4 py-3 border-b border-blue-800/30 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-8">From:</span>
            <span className="text-foreground">Zaloon Salon &lt;hello@zaloon.com&gt;</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-8">To:</span>
            <span className="text-foreground">Sarah &lt;sarah@example.com&gt;</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-8">Subj:</span>
            <span className="text-foreground font-medium">Appointment Reminder — Zaloon Salon</span>
          </div>
        </div>

        {/* Email body */}
        <div className="px-6 py-5 bg-white text-gray-800 min-h-[120px]">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {preview || "Your message will appear here."}
          </p>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              You received this email because you have an upcoming appointment at Zaloon Salon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Test-send modal ───────────────────────────────────────────────────────────

function TestSendModal({
  message,
  channel,
  onClose,
}: {
  message: string;
  channel: "SMS" | "EMAIL";
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-sm bg-background rounded-2xl shadow-2xl p-6 space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-base font-semibold text-foreground">Test Send Preview</h3>
        <p className="text-sm text-muted-foreground">
          This is a preview only — no message will actually be sent.
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {channel} preview
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {message
              .replace(/{{clientName}}/g, "Sarah")
              .replace(/{{salonName}}/g, "Zaloon Salon")
              .replace(/{{date}}/g, "Jul 30, 2026")
              .replace(/{{time}}/g, "2:00 PM")
              .replace(/{{staffName}}/g, "Maria")
              .replace(/{{services}}/g, "Haircut, Blowdry") || "No message content."}
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ReminderTemplateEditorProps {
  initialValue?: string;
  channel?: "SMS" | "EMAIL";
  onSave?: (message: string) => void;
  className?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReminderTemplateEditor({
  initialValue = "",
  channel = "SMS",
  onSave,
  className,
}: ReminderTemplateEditorProps) {
  const [message, setMessage] = React.useState(initialValue);
  const [activeChannel, setActiveChannel] = React.useState<"SMS" | "EMAIL">(channel);
  const [preview, setPreview] = React.useState<"sms" | "email" | "test" | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const MAX_SMS = 160;
  const charCount = message.length;
  const overLimit = activeChannel === "SMS" && charCount > MAX_SMS;

  // Insert a merge tag at the current cursor position
  function insertTag(tag: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessage((prev) => prev + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = message.slice(0, start) + tag + message.slice(end);
    setMessage(next);
    // Restore cursor position after the inserted tag
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  return (
    <>
      {/* Preview modals */}
      {preview === "sms" && (
        <SmsPreview message={message} onClose={() => setPreview(null)} />
      )}
      {preview === "email" && (
        <EmailPreview message={message} onClose={() => setPreview(null)} />
      )}
      {preview === "test" && (
        <TestSendModal
          message={message}
          channel={activeChannel}
          onClose={() => setPreview(null)}
        />
      )}

      <div className={cn("rounded-xl border border-border bg-card p-4 space-y-4", className)}>
        {/* Channel switcher */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Template Editor</h3>
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            {(["SMS", "EMAIL"] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setActiveChannel(ch)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeChannel === ch
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {ch === "SMS" ? (
                  <Phone className="w-3 h-3" />
                ) : (
                  <Mail className="w-3 h-3" />
                )}
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Merge tag insertion buttons */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Insert merge tag</p>
          <div className="flex flex-wrap gap-1.5">
            {MERGE_TAGS.map(({ tag, label }) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertTag(tag)}
                className="inline-flex items-center h-6 px-2 rounded-md bg-muted hover:bg-muted/80 text-xs text-foreground font-mono transition-colors border border-border"
                title={`Insert ${tag}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div className="space-y-1.5">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={activeChannel === "EMAIL" ? 8 : 4}
            placeholder={
              activeChannel === "SMS"
                ? "Hi {{clientName}}! Reminder for your appointment at {{salonName}} on {{date}} at {{time}}."
                : "Dear {{clientName}},\n\nThis is a reminder for your upcoming appointment at {{salonName}}.\n\nDate: {{date}}\nTime: {{time}}\nStaff: {{staffName}}\nServices: {{services}}\n\nWe look forward to seeing you!"
            }
            className={cn(
              "w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
              overLimit ? "border-red-500 focus:ring-red-500/30" : "border-border"
            )}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {activeChannel === "SMS" && (
                <>
                  {charCount > MAX_SMS ? (
                    <span className="text-red-500 font-medium">
                      {charCount} / {MAX_SMS} — splits into {Math.ceil(charCount / MAX_SMS)} parts
                    </span>
                  ) : (
                    <span className={charCount > MAX_SMS * 0.85 ? "text-amber-500" : ""}>
                      {charCount} / {MAX_SMS} characters
                    </span>
                  )}
                </>
              )}
              {activeChannel === "EMAIL" && (
                <span>{charCount} characters</span>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setPreview(activeChannel === "SMS" ? "sms" : "email")}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview {activeChannel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setPreview("test")}
          >
            Test Send
          </Button>
          {onSave && (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 ml-auto"
              disabled={!message.trim()}
              onClick={() => onSave(message)}
            >
              Save Template
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
