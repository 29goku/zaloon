"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  X,
  Send,
  Loader2,
  MessageSquare,
  Mail,
  Phone,
  Check,
} from "lucide-react";
import { sendDirectMessage } from "@/app/actions/reminders";

export interface SendMessageModalProps {
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  onClose: () => void;
}

type Channel = "SMS" | "WHATSAPP" | "EMAIL";

const MESSAGE_TEMPLATES: Record<string, string> = {
  "Birthday wish": "Happy Birthday {{name}}! We hope you have a wonderful day. As a special gift, enjoy 15% off your next appointment. Book online or call us.",
  "Win-back": "Hi {{name}}, we miss you! It's been a while since your last visit. Come back and treat yourself – we'd love to see you again. Book anytime!",
  "Appointment reminder": "Hi {{name}}, this is a reminder about your upcoming appointment. Please let us know if you need to reschedule. Looking forward to seeing you!",
  Custom: "",
};

export function SendMessageModal({
  clientId,
  clientName,
  clientPhone,
  onClose,
}: SendMessageModalProps) {
  const [channel, setChannel] = useState<Channel>("WHATSAPP");
  const [template, setTemplate] = useState<string>("Custom");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function applyTemplate(name: string) {
    setTemplate(name);
    const tpl = MESSAGE_TEMPLATES[name] ?? "";
    setMessage(tpl.replace(/{{name}}/g, clientName));
  }

  function handleSend() {
    if (!message.trim()) {
      setError("Message cannot be empty");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await sendDirectMessage({
        clientId,
        message: message.trim(),
        type: channel,
      });
      if (res.success) {
        setSent(true);
        setTimeout(() => onClose(), 1500);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-base">
            Send Message
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Recipient */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold flex-shrink-0">
              {clientName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {clientName}
              </p>
              {clientPhone ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {clientPhone}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No phone on file</p>
              )}
            </div>
          </div>

          {/* Channel selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Channel
            </label>
            <div className="flex gap-2">
              {(["SMS", "WHATSAPP", "EMAIL"] as Channel[]).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                    channel === ch
                      ? "bg-primary/15 border-primary/50 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {ch === "EMAIL" ? (
                    <Mail className="w-3.5 h-3.5" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5" />
                  )}
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Template picker */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Template
            </label>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(MESSAGE_TEMPLATES).map((name) => (
                <button
                  key={name}
                  onClick={() => applyTemplate(name)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    template === name
                      ? "bg-primary/15 border-primary/50 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Message textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Message
              </label>
              <span className="text-xs text-muted-foreground">
                {message.length} chars
              </span>
            </div>
            <Textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setTemplate("Custom");
              }}
              placeholder="Type your message…"
              className="min-h-24 resize-y text-sm"
            />
          </div>

          {error && <p className="text-xs text-[#F41666]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isPending || !message.trim() || sent}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : sent ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {sent ? "Sent!" : isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
