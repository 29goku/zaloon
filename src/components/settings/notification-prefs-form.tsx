"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Save, Bell, RefreshCw, Gift } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { saveNotificationPrefs } from "@/app/actions/reminders";
import type { NotificationPrefs } from "@/app/actions/reminders";
import { cn } from "@/lib/utils";

type Channel = "SMS" | "EMAIL" | "WHATSAPP";

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "SMS", label: "SMS" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
];

function ChannelRadio({
  name,
  value,
  selected,
  onChange,
}: {
  name: string;
  value: Channel;
  selected: Channel;
  onChange: (v: Channel) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected === value}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
          selected === value
            ? "bg-primary text-primary-foreground border-transparent"
            : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
        )}
      >
        {value === "WHATSAPP" ? "WhatsApp" : value}
      </span>
    </label>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-border">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  channel,
  currentChannel,
  onChannelChange,
  channelKey,
  extra,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  channel?: Channel;
  currentChannel?: Channel;
  onChannelChange?: (v: Channel) => void;
  channelKey?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {checked && channel && currentChannel && onChannelChange && channelKey && (
        <div className="flex items-center gap-2 ml-0 pl-0">
          <span className="text-xs text-muted-foreground">Default channel:</span>
          <div className="flex gap-1.5">
            {CHANNELS.map((ch) => (
              <ChannelRadio
                key={ch.value}
                name={channelKey}
                value={ch.value}
                selected={currentChannel}
                onChange={onChannelChange}
              />
            ))}
          </div>
        </div>
      )}
      {checked && extra}
    </div>
  );
}

// ── main form ─────────────────────────────────────────────────────────────────

interface NotificationPrefsFormProps {
  initialPrefs: NotificationPrefs;
}

export function NotificationPrefsForm({ initialPrefs }: NotificationPrefsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(initialPrefs);

  function update<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveNotificationPrefs(prefs);
      if (res.success) {
        toast.success("Notification preferences saved");
        router.refresh();
      } else {
        toast.error("Save failed", res.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* ── Appointment Reminders ─────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
        <SectionHeader
          icon={Bell}
          title="Appointment Reminders"
          description="Automatically remind clients before their appointments"
        />
        <div className="divide-y divide-border">
          <ToggleRow
            label="24 hours before"
            description="Send a reminder the day before the appointment"
            checked={prefs.remind24h}
            onCheckedChange={(v) => update("remind24h", v)}
            channel={prefs.remind24hChannel}
            currentChannel={prefs.remind24hChannel}
            onChannelChange={(v) => update("remind24hChannel", v)}
            channelKey="remind24h_channel"
          />
          <ToggleRow
            label="2 hours before"
            description="Send a reminder 2 hours before the appointment"
            checked={prefs.remind2h}
            onCheckedChange={(v) => update("remind2h", v)}
            channel={prefs.remind2hChannel}
            currentChannel={prefs.remind2hChannel}
            onChannelChange={(v) => update("remind2hChannel", v)}
            channelKey="remind2h_channel"
          />
          <ToggleRow
            label="1 hour before"
            description="Send a last-minute reminder 1 hour before"
            checked={prefs.remind1h}
            onCheckedChange={(v) => update("remind1h", v)}
            channel={prefs.remind1hChannel}
            currentChannel={prefs.remind1hChannel}
            onChannelChange={(v) => update("remind1hChannel", v)}
            channelKey="remind1h_channel"
          />
        </div>
      </div>

      {/* ── Follow-up Reminders ───────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
        <SectionHeader
          icon={RefreshCw}
          title="Follow-up Reminders"
          description="Keep clients coming back after their visit"
        />
        <div className="divide-y divide-border">
          <ToggleRow
            label="Thank-you after visit"
            description="Send a thank-you message after appointment completion"
            checked={prefs.followUpAfterVisit}
            onCheckedChange={(v) => update("followUpAfterVisit", v)}
          />
          <ToggleRow
            label="Rebooking reminder"
            description="Prompt clients to rebook after their last visit"
            checked={prefs.rebookingReminder}
            onCheckedChange={(v) => update("rebookingReminder", v)}
            extra={
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Send after</span>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={prefs.rebookingDays}
                  onChange={(e) => update("rebookingDays", Math.max(1, parseInt(e.target.value) || 30))}
                  className="w-16 h-7 text-xs text-center"
                />
                <span className="text-xs text-muted-foreground">days since last visit</span>
              </div>
            }
          />
        </div>
      </div>

      {/* ── Birthday Messages ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
        <SectionHeader
          icon={Gift}
          title="Birthday Messages"
          description="Delight clients on their birthday with a personal message"
        />
        <div className="divide-y divide-border">
          <ToggleRow
            label="Send birthday message"
            description="Automatically message clients on their birthday (requires birthday in client profile)"
            checked={prefs.birthdayMessage}
            onCheckedChange={(v) => update("birthdayMessage", v)}
            extra={
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">
                  Message template{" "}
                  <span className="text-primary/80">{"{name}"} = client name</span>
                </label>
                <Textarea
                  value={prefs.birthdayTemplate}
                  onChange={(e) => update("birthdayTemplate", e.target.value)}
                  rows={3}
                  placeholder="Happy Birthday {name}! ..."
                  className="text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Preview:{" "}
                  <span className="italic text-foreground/70">
                    {prefs.birthdayTemplate.replace("{name}", "Sarah")}
                  </span>
                </p>
              </div>
            }
          />
        </div>
      </div>

      {/* ── Save ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isPending ? "Saving…" : "Save Preferences"}
        </Button>
      </div>
    </form>
  );
}
