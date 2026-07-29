"use client";

import * as React from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { scheduleReminder } from "@/app/actions/reminders";

const CHANNELS = [
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
] as const;

const HOURS_OPTIONS = [
  { value: "1", label: "1 hour before" },
  { value: "2", label: "2 hours before" },
  { value: "4", label: "4 hours before" },
  { value: "12", label: "12 hours before" },
  { value: "24", label: "24 hours before (1 day)" },
  { value: "48", label: "48 hours before (2 days)" },
] as const;

interface ScheduleReminderFormProps {
  /** Pre-fill the appointment ID (e.g. when embedded on an appointment page). */
  appointmentId?: string;
  /** Called after a reminder is successfully scheduled. */
  onSuccess?: (reminderId: string) => void;
}

export function ScheduleReminderForm({
  appointmentId: initialAppointmentId,
  onSuccess,
}: ScheduleReminderFormProps) {
  const [apptId, setApptId] = React.useState(initialAppointmentId ?? "");
  const [channel, setChannel] = React.useState<string>("SMS");
  const [hours, setHours] = React.useState<string>("24");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedId = apptId.trim();
    if (!trimmedId) {
      toast.error("Appointment ID is required");
      return;
    }

    setSubmitting(true);
    try {
      const result = await scheduleReminder(trimmedId, channel, Number(hours));
      if (result.success) {
        toast.success("Reminder scheduled!", `Will send via ${channel} ${hours}h before the appointment.`);
        if (!initialAppointmentId) setApptId("");
        setChannel("SMS");
        setHours("24");
        onSuccess?.(result.id);
      } else {
        toast.error("Failed to schedule", result.error);
      }
    } catch {
      toast.error("Unexpected error", "Could not schedule the reminder.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-4 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-primary" />
        <h3 className="font-semibold text-sm">Schedule a Reminder</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Appointment ID */}
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="srf-appt-id" className="text-xs font-medium">
            Appointment ID
          </Label>
          <Input
            id="srf-appt-id"
            placeholder="e.g. clxxx123…"
            value={apptId}
            onChange={(e) => setApptId(e.target.value)}
            disabled={!!initialAppointmentId || submitting}
            className="h-9"
          />
        </div>

        {/* Channel */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Channel</Label>
          <Select value={channel} onValueChange={(v) => { if (v) setChannel(v); }} disabled={submitting}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Hours before */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-medium">Send</Label>
          <Select value={hours} onValueChange={(v) => { if (v) setHours(v); }} disabled={submitting}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select timing" />
            </SelectTrigger>
            <SelectContent>
              {HOURS_OPTIONS.map((h) => (
                <SelectItem key={h.value} value={h.value}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full gap-1.5">
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Scheduling…
          </>
        ) : (
          <>
            <Bell className="size-4" />
            Schedule Reminder
          </>
        )}
      </Button>
    </form>
  );
}
