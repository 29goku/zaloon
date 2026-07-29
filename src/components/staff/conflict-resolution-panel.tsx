"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { AlertTriangle, UserCheck, XCircle, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getConflictingAppointmentDetails,
  reassignAppointment,
  cancelAppointmentForLeave,
  approveTimeOff,
} from "@/app/actions/timeoff";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConflictAppt = {
  id: string;
  date: string;
  startTime: string;
  clientName: string;
  staffId: string;
  salonId: string;
};

type Resolution = "reassign" | "cancel" | "pending";

// ─── ConflictResolutionDialog ─────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeOffId: string;
  staffId: string;
  staffName: string;
  startDate: string;
  endDate: string;
  onApproveAnyway: () => void;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  timeOffId,
  staffId,
  staffName,
  startDate,
  endDate,
  onApproveAnyway,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [appointments, setAppointments] = useState<ConflictAppt[]>([]);
  const [otherStaff, setOtherStaff] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Per-appointment resolution: "reassign" | "cancel" | "pending"
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [reassignTargets, setReassignTargets] = useState<Record<string, string>>({});

  // Bulk reassign target
  const [bulkTarget, setBulkTarget] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    Promise.all([
      getConflictingAppointmentDetails(staffId, startDate, endDate),
      // Fetch other staff via the action — we pass through a fetch to the page
      fetch(`/api/staff?excludeId=${staffId}`)
        .then((r) => r.json())
        .catch(() => [] as { id: string; name: string }[]),
    ]).then(([appts, staff]) => {
      setAppointments(appts);
      // staff list fallback: if API doesn't exist we handle in render
      if (Array.isArray(staff)) setOtherStaff(staff as { id: string; name: string }[]);
      setResolutions({});
      setReassignTargets({});
      setLoading(false);
    });
  }, [open, staffId, startDate, endDate]);

  const allResolved = appointments.every(
    (a) => resolutions[a.id] === "reassign" || resolutions[a.id] === "cancel"
  );

  function setResolution(apptId: string, res: Resolution) {
    setResolutions((prev) => ({ ...prev, [apptId]: res }));
  }

  function setTarget(apptId: string, targetStaffId: string) {
    setReassignTargets((prev) => ({ ...prev, [apptId]: targetStaffId }));
  }

  function applyBulkReassign() {
    if (!bulkTarget) return;
    const updates: Record<string, Resolution> = {};
    const targets: Record<string, string> = {};
    for (const a of appointments) {
      updates[a.id] = "reassign";
      targets[a.id] = bulkTarget;
    }
    setResolutions((prev) => ({ ...prev, ...updates }));
    setReassignTargets((prev) => ({ ...prev, ...targets }));
  }

  function handleResolveAndApprove() {
    startTransition(async () => {
      // Apply all resolutions
      for (const appt of appointments) {
        const res = resolutions[appt.id];
        if (res === "reassign") {
          const target = reassignTargets[appt.id];
          if (!target) {
            toast.error(`Please select a staff member to reassign appointment on ${appt.date}`);
            return;
          }
          const r = await reassignAppointment(appt.id, target);
          if (!r.success) {
            toast.error(r.error ?? "Failed to reassign appointment");
            return;
          }
        } else if (res === "cancel") {
          const r = await cancelAppointmentForLeave(appt.id);
          if (!r.success) {
            toast.error(r.error ?? "Failed to cancel appointment");
            return;
          }
        }
        // "pending" means unresolved — shouldn't reach here if allResolved
      }

      // Now approve the time-off
      const result = await approveTimeOff(timeOffId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to approve time off");
        return;
      }

      toast.success(`Leave for ${staffName} approved and conflicts resolved`);
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleApproveAnyway() {
    onOpenChange(false);
    onApproveAnyway();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Resolve Conflicts Before Approving
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{staffName}</span> has{" "}
            {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} scheduled
            during this leave period. Resolve each before approving, or approve anyway.
          </p>

          {/* Bulk reassign */}
          {otherStaff.length > 0 && appointments.length > 1 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
              <CheckCheck className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs font-medium text-foreground flex-shrink-0">
                Reassign all to:
              </span>
              <select
                className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                value={bulkTarget}
                onChange={(e) => setBulkTarget(e.target.value)}
              >
                <option value="">Select staff...</option>
                {otherStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 h-8 text-xs"
                onClick={applyBulkReassign}
                disabled={!bulkTarget}
              >
                Apply
              </Button>
            </div>
          )}

          {/* Appointment list */}
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading appointments...
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.map((appt) => {
                const res = resolutions[appt.id] ?? "pending";
                return (
                  <div
                    key={appt.id}
                    className={`rounded-xl border px-4 py-3 transition-colors ${
                      res === "reassign"
                        ? "border-green-500/30 bg-green-500/5"
                        : res === "cancel"
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {appt.clientName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {appt.date} at {appt.startTime}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setResolution(appt.id, "reassign")}
                          className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 border transition-colors ${
                            res === "reassign"
                              ? "bg-green-600 text-white border-green-600"
                              : "text-muted-foreground border-border hover:border-green-500 hover:text-green-600"
                          }`}
                        >
                          <UserCheck className="w-3 h-3" />
                          Reassign
                        </button>
                        <button
                          type="button"
                          onClick={() => setResolution(appt.id, "cancel")}
                          className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 border transition-colors ${
                            res === "cancel"
                              ? "bg-red-600 text-white border-red-600"
                              : "text-muted-foreground border-border hover:border-red-500 hover:text-red-600"
                          }`}
                        >
                          <XCircle className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>

                    {/* Reassign target selector */}
                    {res === "reassign" && otherStaff.length > 0 && (
                      <div className="mt-2">
                        <select
                          className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                          value={reassignTargets[appt.id] ?? ""}
                          onChange={(e) => setTarget(appt.id, e.target.value)}
                        >
                          <option value="">Select replacement staff...</option>
                          {otherStaff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="sm:mr-auto"
            onClick={handleApproveAnyway}
            disabled={isPending}
          >
            Approve anyway
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleResolveAndApprove}
            disabled={isPending || loading || !allResolved}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPending
              ? "Saving..."
              : allResolved
              ? "Resolve & Approve"
              : `Resolve ${
                  appointments.filter(
                    (a) =>
                      resolutions[a.id] !== "reassign" && resolutions[a.id] !== "cancel"
                  ).length
                } remaining`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
