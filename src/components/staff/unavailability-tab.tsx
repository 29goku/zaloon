"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { addUnavailability, removeUnavailability } from "@/app/actions/settings";
import type { StaffUnavailability } from "@/app/actions/settings";
import { PlusCircle, CalendarOff, Trash2, Clock } from "lucide-react";

interface Props {
  staffId: string;
  initialRecords: StaffUnavailability[];
}

// ─── AddUnavailabilityDialog ──────────────────────────────────────────────────

function AddUnavailabilityDialog({
  staffId,
  onSuccess,
}: {
  staffId: string;
  onSuccess: (record: StaffUnavailability) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");

  const today = new Date().toISOString().split("T")[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      toast.error("Date is required");
      return;
    }
    if (!isAllDay && endTime <= startTime) {
      toast.error("End time must be after start time");
      return;
    }

    const record: StaffUnavailability = {
      staffId,
      date,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      reason: reason || undefined,
    };

    startTransition(async () => {
      const result = await addUnavailability(record);
      if (!result.success) {
        toast.error(result.error ?? "Failed to add");
        return;
      }
      toast.success("Unavailability added");
      onSuccess(record);
      setDate("");
      setIsAllDay(true);
      setStartTime("09:00");
      setEndTime("17:00");
      setReason("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusCircle className="w-4 h-4" />
        Add unavailability
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Unavailability</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="unavail-date">Date</Label>
            <Input
              id="unavail-date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">All day</p>
              <p className="text-xs text-muted-foreground">Unavailable the entire day</p>
            </div>
            <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unavail-start">Start time</Label>
                <Input
                  id="unavail-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unavail-end">End time</Label>
                <Input
                  id="unavail-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="unavail-reason">Reason (optional)</Label>
            <Input
              id="unavail-reason"
              placeholder="e.g. Vacation, Sick, Training..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Add block"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── UnavailabilityTab ────────────────────────────────────────────────────────

function formatBlock(record: StaffUnavailability): string {
  if (!record.startTime) return "All day";
  return `${record.startTime} – ${record.endTime ?? "?"}`;
}

export function UnavailabilityTab({ staffId, initialRecords }: Props) {
  const router = useRouter();
  const [records, setRecords] = useState<StaffUnavailability[]>(initialRecords);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const upcoming = records.filter((r) => r.date >= today);
  const past = records.filter((r) => r.date < today);

  function handleAdd(record: StaffUnavailability) {
    setRecords((prev) => [...prev, record]);
  }

  function handleRemove(record: StaffUnavailability) {
    const key = `${record.date}-${record.startTime ?? "allday"}`;
    setRemovingKey(key);
    removeUnavailability(staffId, record.date, record.startTime).then((result) => {
      setRemovingKey(null);
      if (!result.success) {
        toast.error(result.error ?? "Failed to remove");
        return;
      }
      setRecords((prev) =>
        prev.filter(
          (r) =>
            !(
              r.date === record.date &&
              r.staffId === record.staffId &&
              r.startTime === record.startTime
            )
        )
      );
      toast.success("Removed");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Unavailability</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Specific dates or time blocks when this staff member is unavailable
          </p>
        </div>
        <AddUnavailabilityDialog staffId={staffId} onSuccess={handleAdd} />
      </div>

      {/* Upcoming */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
            Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="text-center py-8">
              <CalendarOff className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming unavailability blocks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((record) => {
                  const key = `${record.date}-${record.startTime ?? "allday"}`;
                  const isRemoving = removingKey === key;
                  return (
                    <div
                      key={key}
                      className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{record.date}</p>
                          {record.startTime ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatBlock(record)}
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-xs">
                              All day
                            </Badge>
                          )}
                        </div>
                        {record.reason && (
                          <p className="text-xs text-muted-foreground mt-0.5">{record.reason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(record)}
                        disabled={isRemoving}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past */}
      {past.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground flex-shrink-0" />
              Past
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {past
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 10)
                .map((record) => {
                  const key = `${record.date}-${record.startTime ?? "allday"}`;
                  return (
                    <div
                      key={key}
                      className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border opacity-60"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{record.date}</p>
                          {record.startTime ? (
                            <Badge variant="secondary" className="text-xs border-0 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatBlock(record)}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs border-0">
                              All day
                            </Badge>
                          )}
                        </div>
                        {record.reason && (
                          <p className="text-xs text-muted-foreground mt-0.5">{record.reason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
