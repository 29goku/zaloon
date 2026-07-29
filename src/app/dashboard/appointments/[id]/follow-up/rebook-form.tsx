"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { rebookAppointment } from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock, Loader2, Check } from "lucide-react";

interface RebookFormProps {
  appointmentId: string;
  services: string[];
  staffName: string;
}

export function RebookForm({ appointmentId, services, staffName }: RebookFormProps) {
  const router = useRouter();
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [newId, setNewId] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    setPending(true);
    setError(null);

    const result = await rebookAppointment(appointmentId, date, time);
    setPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setNewId(result.appointmentId);
    router.refresh();
  }

  if (newId) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Check className="w-6 h-6 text-primary" />
        </div>
        <p className="font-semibold text-foreground">Appointment booked!</p>
        <p className="text-sm text-muted-foreground">
          The follow-up appointment has been created successfully.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/appointments")}
        >
          View appointments
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Pre-selected context */}
      <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Same as original
        </p>
        <p className="text-sm text-foreground">
          <span className="font-medium">Staff:</span> {staffName}
        </p>
        {services.length > 0 && (
          <p className="text-sm text-foreground">
            <span className="font-medium">Services:</span> {services.join(", ")}
          </p>
        )}
      </div>

      {/* Date picker */}
      <div className="space-y-1.5">
        <Label htmlFor="rebook-date" className="flex items-center gap-1.5 text-sm">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          New date
        </Label>
        <Input
          id="rebook-date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full"
        />
      </div>

      {/* Time select */}
      <div className="space-y-1.5">
        <Label htmlFor="rebook-time" className="flex items-center gap-1.5 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Start time
        </Label>
        <Input
          id="rebook-time"
          type="time"
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full gap-2" disabled={pending || !date || !time}>
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Booking…
          </>
        ) : (
          <>
            <CalendarDays className="w-4 h-4" />
            Book Follow-Up Appointment
          </>
        )}
      </Button>
    </form>
  );
}
