"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { AlertTriangle, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestTimeOff, getConflictingAppointments } from "@/app/actions/timeoff";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayCount(start: string, end: string): number {
  if (!start || !end || end < start) return 0;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: { id: string; name: string }[];
  defaultStaffId?: string;
}

export function RequestTimeOffDialog({
  open,
  onOpenChange,
  staff,
  defaultStaffId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split("T")[0];

  const [staffId, setStaffId] = useState(defaultStaffId ?? staff[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Conflict check
  const [conflictCount, setConflictCount] = useState(0);
  const [conflictDates, setConflictDates] = useState<string[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const days = dayCount(startDate, endDate);

  // Re-check conflicts whenever staffId/start/end change
  useEffect(() => {
    if (!staffId || !startDate || !endDate || endDate < startDate) {
      setConflictCount(0);
      setConflictDates([]);
      return;
    }
    let cancelled = false;
    setCheckingConflicts(true);
    getConflictingAppointments(staffId, startDate, endDate).then((res) => {
      if (!cancelled) {
        setConflictCount(res.count);
        setConflictDates(res.dates);
        setCheckingConflicts(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [staffId, startDate, endDate]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setStaffId(defaultStaffId ?? staff[0]?.id ?? "");
      setStartDate("");
      setEndDate("");
      setReason("");
      setConflictCount(0);
      setConflictDates([]);
    }
  }, [open, defaultStaffId, staff]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId) {
      toast.error("Please select a staff member");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date must be on or after start date");
      return;
    }

    startTransition(async () => {
      const result = await requestTimeOff({ staffId, startDate, endDate, reason: reason || undefined });
      if (!result.success) {
        toast.error(result.error ?? "Failed to submit request");
        return;
      }
      toast.success("Time-off request submitted");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Request Time Off
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Staff selector */}
          <div className="space-y-1.5">
            <Label htmlFor="staffSelect">Staff member</Label>
            <select
              id="staffSelect"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Days calculation */}
          {days > 0 && (
            <p className="text-sm text-muted-foreground">
              Duration:{" "}
              <span className="font-semibold text-foreground">
                {days} day{days !== 1 ? "s" : ""}
              </span>
            </p>
          )}

          {/* Conflict warning */}
          {!checkingConflicts && conflictCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {conflictCount} scheduled appointment
                  {conflictCount !== 1 ? "s" : ""} during this period
                </p>
                {conflictDates.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Conflict dates: {conflictDates.slice(0, 4).join(", ")}
                    {conflictDates.length > 4 ? ` +${conflictDates.length - 4} more` : ""}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  These will need to be reassigned or cancelled if the request is approved.
                </p>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g. Family vacation, personal appointment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !staffId || !startDate || !endDate}>
              {isPending ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
