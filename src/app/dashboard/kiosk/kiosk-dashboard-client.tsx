"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { serveNextWalkIn } from "@/app/actions/kiosk";

interface WaitlistEntry {
  id: string;
  name: string;
  position: number;
  serviceName: string | null;
  serviceDurationMins: number;
  estimatedWaitMins: number;
  createdAt: Date;
  status: string;
  staffPreference: string | null;
}

interface StaffMember {
  id: string;
  name: string;
}

interface Props {
  waitlist: WaitlistEntry[];
  staffList: StaffMember[];
}

function formatWait(mins: number) {
  if (mins === 0) return "Now";
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

function timeAgo(date: Date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff === 1) return "1 min ago";
  return `${diff} min ago`;
}

export function KioskDashboardClient({ waitlist, staffList }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Quick-serve modal state
  const [assignModal, setAssignModal] = useState<WaitlistEntry | null>(null);
  const [assignStaffId, setAssignStaffId] = useState("");
  const [assignTime, setAssignTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  async function handleServeNext(entry: WaitlistEntry) {
    setLoading(entry.id);
    setError("");
    try {
      const result = await serveNextWalkIn(entry.id);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to serve");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function handleQuickServe() {
    if (!assignModal || !assignStaffId) return;
    setLoading(assignModal.id);
    setError("");
    try {
      const result = await serveNextWalkIn(assignModal.id, {
        staffId: assignStaffId,
        startTime: assignTime,
      });
      if (result.success) {
        setAssignModal(null);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to assign");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  if (waitlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5m-2-6.5V20M9.5 9.5l-2.5 4 3 1m5-5.5l2.5 4-3 1" />
            <circle cx="12" cy="4.5" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <p className="text-lg font-medium">Queue is empty</p>
        <p className="text-sm mt-1">Walk-ins will appear here when they check in via the kiosk.</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {waitlist.map((entry, idx) => (
          <div
            key={entry.id}
            className={[
              "flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all",
              entry.status === "NOTIFIED"
                ? "border-amber-200 bg-amber-50/50"
                : idx === 0
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-card",
            ].join(" ")}
          >
            {/* Position badge */}
            <div className={[
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
              idx === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            ].join(" ")}>
              {entry.position}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground text-base">{entry.name}</span>
                {entry.status === "NOTIFIED" && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                    Being served
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {entry.serviceName ?? "No service"} · {entry.serviceDurationMins} min
                {entry.staffPreference ? ` · Prefers ${entry.staffPreference}` : ""}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Joined {timeAgo(entry.createdAt)} · Wait: {formatWait(entry.estimatedWaitMins)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Quick-serve: assign to staff + create appointment */}
              <button
                type="button"
                onClick={() => {
                  setAssignModal(entry);
                  setAssignStaffId(staffList[0]?.id ?? "");
                }}
                disabled={loading === entry.id}
                className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
              >
                Assign & serve
              </button>

              {/* Serve next (no appointment) */}
              <button
                type="button"
                onClick={() => handleServeNext(entry)}
                disabled={loading === entry.id || entry.status === "NOTIFIED"}
                className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-40"
              >
                {loading === entry.id ? "…" : "Serve next"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Assign modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-foreground mb-1">Assign & Serve</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Assign <strong>{assignModal.name}</strong> to a staff member and create an appointment.
            </p>

            {/* Staff select */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Staff member
              </label>
              <select
                value={assignStaffId}
                onChange={(e) => setAssignStaffId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start time */}
            <div className="mb-6">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Start time
              </label>
              <input
                type="time"
                value={assignTime}
                onChange={(e) => setAssignTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAssignModal(null)}
                className="flex-1 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickServe}
                disabled={!assignStaffId || loading === assignModal.id}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {loading === assignModal.id ? "Creating…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
