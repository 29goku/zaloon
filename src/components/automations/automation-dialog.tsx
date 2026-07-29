"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus, Zap } from "lucide-react";
import { createRule, updateRule } from "@/app/actions/automations";
import type { AutomationRule } from "@/app/actions/automations";

const TRIGGER_OPTIONS = [
  { value: "appointment_created", label: "After appointment booked" },
  { value: "appointment_24h", label: "24h before appointment" },
  { value: "appointment_completed", label: "After appointment completed" },
  { value: "birthday", label: "Client birthday" },
  { value: "inactive_60d", label: "Inactive 60 days (win-back)" },
  { value: "membership_expiring_7d", label: "Membership expiring in 7 days" },
  { value: "no_show", label: "No-show" },
  { value: "anniversary", label: "Anniversary" },
];

const TIMING_OPTIONS = [
  { value: "immediate", label: "Immediately" },
  { value: "1h_before", label: "1 hour before" },
  { value: "24h_before", label: "24 hours before" },
  { value: "48h_before", label: "48 hours before" },
  { value: "1h_after", label: "1 hour after" },
  { value: "24h_after", label: "24 hours after" },
  { value: "7d_after", label: "7 days after" },
  { value: "30d_after", label: "30 days after" },
];

const MERGE_TAGS = [
  { tag: "{client_name}", desc: "Client's full name" },
  { tag: "{appointment_date}", desc: "Appointment date" },
  { tag: "{appointment_time}", desc: "Appointment time" },
  { tag: "{service_name}", desc: "Service name" },
  { tag: "{staff_name}", desc: "Staff member name" },
  { tag: "{salon_name}", desc: "Salon name" },
];

interface AutomationDialogProps {
  rule?: AutomationRule;
  onSaved?: () => void;
  children?: React.ReactNode;
}

export function AutomationDialog({ rule, onSaved, children }: AutomationDialogProps) {
  const isEditing = Boolean(rule);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName] = useState(rule?.name ?? "");
  const [trigger, setTrigger] = useState(rule?.trigger ?? "appointment_created");
  const [channel, setChannel] = useState<"SMS" | "EMAIL">(
    (rule?.channel as "SMS" | "EMAIL") ?? "SMS"
  );
  const [timing, setTiming] = useState(rule?.timing ?? "immediate");
  const [messageTemplate, setMessageTemplate] = useState(rule?.messageTemplate ?? "");
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);

  function insertTag(tag: string) {
    setMessageTemplate((prev) => prev + tag);
  }

  function handleSubmit() {
    setError("");
    if (!name.trim()) { setError("Name is required."); return; }
    if (!messageTemplate.trim()) { setError("Message template is required."); return; }

    startTransition(async () => {
      let result;
      if (isEditing && rule) {
        result = await updateRule(rule.id, { name, trigger, channel, timing, messageTemplate, isActive });
      } else {
        result = await createRule({ name, trigger, channel, timing, messageTemplate, isActive });
      }

      if (result.success) {
        setOpen(false);
        onSaved?.();
      } else {
        setError(result.error ?? "Failed to save rule");
      }
    });
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) {
      // Reset to rule values when opening
      setName(rule?.name ?? "");
      setTrigger(rule?.trigger ?? "appointment_created");
      setChannel((rule?.channel as "SMS" | "EMAIL") ?? "SMS");
      setTiming(rule?.timing ?? "immediate");
      setMessageTemplate(rule?.messageTemplate ?? "");
      setIsActive(rule?.isActive ?? true);
      setError("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children ? (
        <span onClick={() => handleOpenChange(true)} className="contents cursor-pointer">
          {children}
        </span>
      ) : isEditing ? (
        <DialogTrigger
          render={
            <button
              className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Edit rule"
            />
          }
        >
          <Pencil className="w-4 h-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <Button size="sm" className="gap-1.5" />
          }
        >
          <Plus className="w-3.5 h-3.5" />
          New Rule
        </DialogTrigger>
      )}

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            {isEditing ? "Edit Automation Rule" : "New Automation Rule"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1 max-h-[70vh] overflow-y-auto pr-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Rule Name
            </Label>
            <Input
              placeholder="e.g. 24h Appointment Reminder"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Trigger */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Trigger
            </Label>
            <select
              className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
            >
              {TRIGGER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
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
                  className={`flex-1 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                    channel === ch
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Timing
            </Label>
            <select
              className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
            >
              {TIMING_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Message template */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Message Template
            </Label>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-mono resize-none outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground dark:bg-input/30"
              placeholder="Hi {client_name}! Your appointment is..."
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
            />

            {/* Merge tags */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Insert merge tag
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MERGE_TAGS.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    title={t.desc}
                    onClick={() => insertTag(t.tag)}
                    className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-mono font-semibold hover:bg-primary/20 transition-colors"
                  >
                    {t.tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">Rule fires when enabled</p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v)}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive rounded-lg bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleSubmit}
            disabled={isPending}
          >
            <Zap className="w-3.5 h-3.5" />
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
