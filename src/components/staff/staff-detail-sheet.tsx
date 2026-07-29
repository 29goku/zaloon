"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Save, Scissors, Clock } from "lucide-react";

import { updateStaff, deleteStaff, setStaffShifts, setStaffServices } from "@/app/actions/staff";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Shift {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface StaffService {
  serviceId: string;
  Service: { id: string; name: string };
}

interface StaffMember {
  id: string;
  name: string;
  phone: string | null;
  commissionPct: number;
  Shift: Shift[];
  StaffService: StaffService[];
  _count: { Appointment: number };
}

interface Service {
  id: string;
  name: string;
}

interface StaffDetailSheetProps {
  staff: StaffMember;
  allServices: Service[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const DEFAULT_START = "09:00";
const DEFAULT_END = "18:00";

// ─── Shift editor state helpers ───────────────────────────────────────────────

type DayShift = { enabled: boolean; startTime: string; endTime: string };
type WeekShifts = Record<number, DayShift>;

function buildInitialShifts(shifts: Shift[]): WeekShifts {
  const map: WeekShifts = {};
  for (let i = 0; i < 7; i++) {
    const existing = shifts.find((s) => s.dayOfWeek === i);
    map[i] = existing
      ? { enabled: true, startTime: existing.startTime, endTime: existing.endTime }
      : { enabled: false, startTime: DEFAULT_START, endTime: DEFAULT_END };
  }
  return map;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StaffDetailSheet({
  staff,
  allServices,
  open,
  onOpenChange,
}: StaffDetailSheetProps) {
  const router = useRouter();

  // Info edit state
  const [name, setName] = useState(staff.name);
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [commissionPct, setCommissionPct] = useState(staff.commissionPct);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [isPendingInfo, startInfoTransition] = useTransition();

  // Shift editor state
  const [weekShifts, setWeekShifts] = useState<WeekShifts>(() =>
    buildInitialShifts(staff.Shift)
  );
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [isPendingShifts, startShiftsTransition] = useTransition();

  // Service assignment state
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    () => new Set(staff.StaffService.map((ss) => ss.serviceId))
  );
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [isPendingServices, startServicesTransition] = useTransition();

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPendingDelete, startDeleteTransition] = useTransition();

  // ── Info save ──────────────────────────────────────────────────────────────

  function handleSaveInfo() {
    if (!name.trim()) {
      setInfoError("Name is required");
      return;
    }
    setInfoError(null);
    startInfoTransition(async () => {
      const result = await updateStaff(staff.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        commissionPct,
      });
      if (!result.success) {
        setInfoError(result.error);
        return;
      }
      router.refresh();
    });
  }

  // ── Shift toggles ──────────────────────────────────────────────────────────

  function toggleDay(dayIndex: number) {
    setWeekShifts((prev) => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], enabled: !prev[dayIndex].enabled },
    }));
  }

  function updateDayTime(
    dayIndex: number,
    field: "startTime" | "endTime",
    value: string
  ) {
    setWeekShifts((prev) => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value },
    }));
  }

  function handleSaveShifts() {
    setShiftError(null);
    const shifts = Object.entries(weekShifts)
      .filter(([, v]) => v.enabled)
      .map(([day, v]) => ({
        dayOfWeek: Number(day),
        startTime: v.startTime,
        endTime: v.endTime,
      }));

    startShiftsTransition(async () => {
      const result = await setStaffShifts(staff.id, shifts);
      if (!result.success) {
        setShiftError(result.error);
        return;
      }
      router.refresh();
    });
  }

  // ── Services ───────────────────────────────────────────────────────────────

  function toggleService(serviceId: string) {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  }

  function handleSaveServices() {
    setServiceError(null);
    startServicesTransition(async () => {
      const result = await setStaffServices(staff.id, Array.from(selectedServices));
      if (!result.success) {
        setServiceError(result.error);
        return;
      }
      router.refresh();
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  function handleDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteStaff(staff.id);
      if (!result.success) {
        setDeleteError(result.error);
        setDeleteConfirm(false);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {staff.name[0].toUpperCase()}
            </div>
            <div>
              <SheetTitle>{staff.name}</SheetTitle>
              <SheetDescription>
                {staff._count.Appointment} appointment
                {staff._count.Appointment !== 1 ? "s" : ""}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-6">
          {/* ── Info edit ─────────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">Profile</h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-staff-name">Name</Label>
              <Input
                id="edit-staff-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!infoError}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-staff-phone">Phone (optional)</Label>
              <Input
                id="edit-staff-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-staff-commission">Commission %</Label>
              <Input
                id="edit-staff-commission"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={commissionPct}
                onChange={(e) => setCommissionPct(Number(e.target.value))}
              />
            </div>

            {infoError && (
              <p className="text-xs text-destructive">{infoError}</p>
            )}

            <Button
              size="sm"
              onClick={handleSaveInfo}
              disabled={isPendingInfo}
              className="self-end"
            >
              {isPendingInfo ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Profile
            </Button>
          </section>

          <div className="border-t border-border" />

          {/* ── Shift editor ───────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Work Schedule
            </h3>

            <div className="flex flex-col gap-2">
              {DAYS.map((day, i) => {
                const dayShift = weekShifts[i];
                return (
                  <div key={day} className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={dayShift.enabled}
                        onChange={() => toggleDay(i)}
                        className="accent-primary w-4 h-4 rounded"
                      />
                      <span
                        className={`text-sm font-medium ${
                          dayShift.enabled ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {day}
                      </span>
                    </label>

                    {dayShift.enabled && (
                      <div className="ml-6 flex items-center gap-2">
                        <Input
                          type="time"
                          value={dayShift.startTime}
                          onChange={(e) => updateDayTime(i, "startTime", e.target.value)}
                          className="h-7 text-xs w-32"
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={dayShift.endTime}
                          onChange={(e) => updateDayTime(i, "endTime", e.target.value)}
                          className="h-7 text-xs w-32"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {shiftError && (
              <p className="text-xs text-destructive">{shiftError}</p>
            )}

            <Button
              size="sm"
              onClick={handleSaveShifts}
              disabled={isPendingShifts}
              className="self-end"
            >
              {isPendingShifts ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Schedule
            </Button>
          </section>

          <div className="border-t border-border" />

          {/* ── Service assignment ─────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Scissors className="w-4 h-4" />
              Services
            </h3>

            {allServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No services defined yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {allServices.map((svc) => (
                  <label
                    key={svc.id}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.has(svc.id)}
                      onChange={() => toggleService(svc.id)}
                      className="accent-primary w-4 h-4 rounded"
                    />
                    <span className="text-sm text-foreground">{svc.name}</span>
                  </label>
                ))}
              </div>
            )}

            {selectedServices.size > 0 && (
              <div className="flex flex-wrap gap-1">
                {allServices
                  .filter((s) => selectedServices.has(s.id))
                  .map((s) => (
                    <Badge key={s.id} variant="secondary" className="text-xs border-0">
                      {s.name}
                    </Badge>
                  ))}
              </div>
            )}

            {serviceError && (
              <p className="text-xs text-destructive">{serviceError}</p>
            )}

            <Button
              size="sm"
              onClick={handleSaveServices}
              disabled={isPendingServices || allServices.length === 0}
              className="self-end"
            >
              {isPendingServices ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Services
            </Button>
          </section>

          <div className="border-t border-border" />

          {/* ── Delete ─────────────────────────────────────────────── */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>

            {deleteError && (
              <p className="text-xs text-destructive">{deleteError}</p>
            )}

            {!deleteConfirm ? (
              <Button
                variant="destructive"
                size="sm"
                className="self-start"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Staff Member
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  This will permanently remove{" "}
                  <span className="font-semibold text-foreground">{staff.name}</span>{" "}
                  and all their shifts. Appointments will remain. Continue?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isPendingDelete}
                  >
                    {isPendingDelete && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    Yes, delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={isPendingDelete}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
