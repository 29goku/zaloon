"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Mail,
  Search,
  X,
  Clock,
  Send,
  ChevronDown,
} from "lucide-react";
import { sendQuickMessage } from "@/app/actions/reminders";

type Client = { id: string; name: string; phone: string | null; email: string | null };

const MESSAGE_TEMPLATES = [
  { label: "Appointment Reminder", text: "Hi {name}! Just a reminder about your upcoming appointment. Please let us know if you need to reschedule." },
  { label: "Follow-up", text: "Hi {name}! Thank you for visiting us. We hope you love the results! Book your next appointment soon." },
  { label: "Special Offer", text: "Hi {name}! We have a special offer just for you. Book this week and enjoy 20% off your next service." },
  { label: "Birthday Wish", text: "Happy Birthday {name}! As a special gift, enjoy a complimentary service upgrade on your next visit." },
];

interface QuickMessageDialogProps {
  children?: React.ReactNode;
}

export function QuickMessageDialog({ children }: QuickMessageDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Client search
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form
  const [channel, setChannel] = useState<"SMS" | "EMAIL">("SMS");
  const [message, setMessage] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const searchClients = useCallback((q: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setClientResults([]);
      return;
    }
    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients/search?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setClientResults(Array.isArray(data) ? data : []);
      } catch {
        setClientResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
  }, []);

  function handleClientInput(val: string) {
    setClientQuery(val);
    if (selectedClient) setSelectedClient(null);
    searchClients(val);
  }

  function handleSelectClient(c: Client) {
    setSelectedClient(c);
    setClientQuery(c.name);
    setClientResults([]);
  }

  function insertTemplate(text: string) {
    const personalised = text.replace("{name}", selectedClient?.name ?? "there");
    setMessage(personalised);
    setShowTemplates(false);
  }

  function resetForm() {
    setClientQuery("");
    setClientResults([]);
    setSelectedClient(null);
    setChannel("SMS");
    setMessage("");
    setScheduleMode(false);
    setScheduledAt("");
    setError("");
    setSuccess(false);
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  function handleSubmit() {
    setError("");
    if (!selectedClient) {
      setError("Please select a client.");
      return;
    }
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }
    if (scheduleMode && !scheduledAt) {
      setError("Please pick a date/time to schedule.");
      return;
    }

    startTransition(async () => {
      const result = await sendQuickMessage({
        clientId: selectedClient.id,
        channel,
        message: message.trim(),
        scheduledAt: scheduleMode ? scheduledAt : undefined,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
          router.refresh();
        }, 1200);
      } else {
        setError(result.error ?? "Failed to send message.");
      }
    });
  }

  const charLimit = channel === "SMS" ? 160 : 2000;
  const charCount = message.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <MessageSquare className="w-4 h-4" />
            {children ?? "Send Message"}
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Quick Message
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <p className="font-semibold text-foreground">
              {scheduleMode ? "Message scheduled!" : "Message sent!"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {scheduleMode
                ? `Scheduled for ${new Date(scheduledAt).toLocaleString()}`
                : "The message has been queued for delivery."}
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {/* Client search */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Client
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-7 pr-8"
                  placeholder="Search by name or phone..."
                  value={clientQuery}
                  onChange={(e) => handleClientInput(e.target.value)}
                  autoComplete="off"
                />
                {selectedClient && (
                  <button
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setSelectedClient(null); setClientQuery(""); }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Dropdown */}
              {clientResults.length > 0 && !selectedClient && (
                <div className="rounded-xl border border-border bg-popover shadow-md overflow-hidden z-50">
                  {clientResults.map((c) => (
                    <button
                      key={c.id}
                      className="w-full flex items-start gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      onClick={() => handleSelectClient(c)}
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.phone ?? c.email ?? "No contact info"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchLoading && (
                <p className="text-xs text-muted-foreground pl-1">Searching...</p>
              )}
            </div>

            {/* Channel */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Channel
              </Label>
              <div className="flex gap-2">
                {(["SMS", "EMAIL"] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                      channel === ch
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {ch === "SMS" ? <MessageSquare className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Message
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={() => setShowTemplates((v) => !v)}
                  >
                    Templates
                    <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
                  </button>
                  <span className={`text-xs tabular-nums ${charCount > charLimit ? "text-destructive" : "text-muted-foreground"}`}>
                    {charCount}/{charLimit}
                  </span>
                </div>
              </div>

              {showTemplates && (
                <div className="rounded-xl border border-border bg-muted/50 p-2 space-y-1">
                  {MESSAGE_TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-background transition-colors"
                      onClick={() => insertTemplate(t.text)}
                    >
                      <span className="font-semibold text-foreground">{t.label}</span>
                      <span className="text-muted-foreground ml-1 line-clamp-1">{t.text}</span>
                    </button>
                  ))}
                </div>
              )}

              <textarea
                className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm resize-none outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground dark:bg-input/30"
                placeholder={`Type your ${channel} message here...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={charLimit + 100}
              />
            </div>

            {/* Schedule toggle */}
            <div className="space-y-2">
              <button
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setScheduleMode((v) => !v)}
              >
                <Clock className="w-3.5 h-3.5" />
                {scheduleMode ? "Cancel scheduling" : "Schedule for later"}
              </button>

              {scheduleMode && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-destructive rounded-lg bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleSubmit}
                disabled={isPending || charCount > charLimit}
              >
                {isPending ? (
                  "Sending..."
                ) : scheduleMode ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    Schedule
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Now
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
