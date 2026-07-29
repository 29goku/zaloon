"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { rebookAppointment } from "@/app/actions/appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Sparkles, ArrowRight, Clock, Loader2, Check } from "lucide-react";

interface RebookSuggestionProps {
  appointmentId: string;
  services: string[];
  appointmentDate: string;
  staffName: string;
  suggestedDate: string; // ISO YYYY-MM-DD, pre-computed server-side
}

export function RebookSuggestion({
  appointmentId,
  services,
  staffName,
  suggestedDate,
}: RebookSuggestionProps) {
  const router = useRouter();

  const [date, setDate] = React.useState(suggestedDate);
  const [time, setTime] = React.useState("10:00");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [booked, setBooked] = React.useState(false);

  // Format the suggested date nicely for display
  const suggestedDateDisplay = React.useMemo(() => {
    const [y, m, d] = suggestedDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en", { dateStyle: "long" });
  }, [suggestedDate]);

  async function handleBook() {
    if (!date || !time) return;
    setPending(true);
    setError(null);

    const result = await rebookAppointment(appointmentId, date, time);
    setPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setBooked(true);
    router.refresh();
  }

  if (booked) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Follow-up booked!</p>
            <p className="text-sm text-muted-foreground">
              The suggested appointment has been scheduled.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/appointments")}
            >
              View appointments
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-primary" />
          Suggest Next Appointment
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Smart recommendation based on the services performed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recommendation chip */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-primary/5 px-4 py-3">
          <CalendarDays className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Return recommendation
            </p>
            <p className="text-sm font-semibold text-foreground">{suggestedDateDisplay}</p>
          </div>
        </div>

        {/* Services context */}
        <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Estimated services
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

        {/* Editable date/time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="suggest-date" className="flex items-center gap-1.5 text-sm">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              Date
            </Label>
            <Input
              id="suggest-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="suggest-time" className="flex items-center gap-1.5 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Time
            </Label>
            <Input
              id="suggest-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          className="w-full gap-2"
          onClick={handleBook}
          disabled={pending || !date || !time}
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scheduling…
            </>
          ) : (
            <>
              Schedule Follow-up
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
