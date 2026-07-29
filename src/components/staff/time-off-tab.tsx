"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/sonner";
import { PlusCircle, CalendarOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { requestTimeOff } from "@/app/actions/time-off";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimeOffRecord = {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  approved: boolean;
  createdAt: Date;
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const requestFormSchema = z
  .object({
    startDate: z
      .string()
      .min(1, "Start date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    endDate: z
      .string()
      .min(1, "End date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    reason: z.string().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

type RequestFormValues = z.infer<typeof requestFormSchema>;

// ─── RequestTimeOffDialog ─────────────────────────────────────────────────────

function RequestTimeOffDialog({
  staffId,
  onSuccess,
}: {
  staffId: string;
  onSuccess: (record: TimeOffRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
  });

  const today = new Date().toISOString().split("T")[0];

  function onSubmit(values: RequestFormValues) {
    startTransition(async () => {
      const result = await requestTimeOff(
        staffId,
        values.startDate,
        values.endDate,
        values.reason
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Time-off request submitted");
      onSuccess({
        id: result.id,
        staffId,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason ?? null,
        approved: false,
        createdAt: new Date(),
      });
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" />}
      >
        <PlusCircle className="w-4 h-4" />
        Request Time Off
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                min={today}
                {...register("startDate")}
                aria-invalid={!!errors.startDate}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                min={today}
                {...register("endDate")}
                aria-invalid={!!errors.endDate}
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g. Family vacation, personal appointment..."
              {...register("reason")}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── TimeOffTab ───────────────────────────────────────────────────────────────

function formatDateRange(start: string, end: string): string {
  if (start === end) return start;
  return `${start} – ${end}`;
}

function dayCount(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function TimeOffTab({
  staffId,
  initialRecords,
}: {
  staffId: string;
  initialRecords: TimeOffRecord[];
}) {
  const [records, setRecords] = useState<TimeOffRecord[]>(initialRecords);

  const approved = records.filter((r) => r.approved);
  const pending = records.filter((r) => !r.approved);

  function handleNewRecord(record: TimeOffRecord) {
    setRecords((prev) => [...prev, record]);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Time Off</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage approved leave and pending requests
          </p>
        </div>
        <RequestTimeOffDialog staffId={staffId} onSuccess={handleNewRecord} />
      </div>

      {/* Approved */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
            Approved
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approved.length === 0 ? (
            <div className="text-center py-8">
              <CalendarOff className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No approved time off</p>
            </div>
          ) : (
            <div className="space-y-2">
              {approved.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-green-500/8 border border-green-500/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatDateRange(r.startDate, r.endDate)}
                    </p>
                    {r.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {r.reason}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-0 flex-shrink-0">
                    {dayCount(r.startDate, r.endDate)}d
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
            Pending requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending requests
            </p>
          ) : (
            <div className="space-y-2">
              {pending.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatDateRange(r.startDate, r.endDate)}
                    </p>
                    {r.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {r.reason}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 flex-shrink-0">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
