"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  User,
  Calendar,
  Scissors,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
} from "lucide-react";
import { createStaffMember } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceData {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName: string;
}

interface StaffForCopy {
  id: string;
  name: string;
  services: string[]; // serviceIds
}

interface Props {
  services: ServiceData[];
  existingStaff: StaffForCopy[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// dayOfWeek mapping: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
const DAYS_DOW = [1, 2, 3, 4, 5, 6, 0];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const AVATAR_COLORS = [
  { key: "violet", label: "Violet", bg: "bg-violet-500/30", text: "text-violet-500", solid: "#8b5cf6" },
  { key: "blue", label: "Blue", bg: "bg-blue-500/30", text: "text-blue-500", solid: "#3b82f6" },
  { key: "emerald", label: "Emerald", bg: "bg-emerald-500/30", text: "text-emerald-500", solid: "#10b981" },
  { key: "rose", label: "Rose", bg: "bg-rose-500/30", text: "text-rose-500", solid: "#f43f5e" },
  { key: "amber", label: "Amber", bg: "bg-amber-500/30", text: "text-amber-500", solid: "#f59e0b" },
  { key: "cyan", label: "Cyan", bg: "bg-cyan-500/30", text: "text-cyan-500", solid: "#06b6d4" },
] as const;

type ColorKey = (typeof AVATAR_COLORS)[number]["key"];

function getColorClasses(key: ColorKey) {
  return AVATAR_COLORS.find((c) => c.key === key) ?? AVATAR_COLORS[0];
}

function generateTimeslots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m === 30) break;
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeslots();

function formatTime(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

// ─── Step components ──────────────────────────────────────────────────────────

// Step 1 — Basic Info
interface BasicInfoData {
  name: string;
  phone: string;
  role: string;
  commissionPct: number;
  avatarColor: ColorKey;
  photo: string | null;
}

function StepBasicInfo({
  data,
  onChange,
}: {
  data: BasicInfoData;
  onChange: (d: BasicInfoData) => void;
}) {
  const colorDef = getColorClasses(data.avatarColor);
  const initials = data.name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="space-y-6">
      {/* Avatar / photo */}
      <div className="flex flex-col items-center gap-2 py-4">
        <ImageUpload
          value={data.photo}
          onChange={(v) => onChange({ ...data, photo: v })}
          size="lg"
          shape="circle"
          placeholder={
            <div className={cn("w-full h-full rounded-full flex items-center justify-center font-bold text-3xl", colorDef.bg, colorDef.text)}>
              {initials}
            </div>
          }
        />
        <p className="text-xs text-muted-foreground">Hover to upload or take photo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-name">Name <span className="text-destructive">*</span></Label>
          <Input
            id="staff-name"
            placeholder="e.g. Priya Sharma"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-phone">Phone</Label>
          <Input
            id="staff-phone"
            type="tel"
            placeholder="e.g. +91 98765 43210"
            value={data.phone}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-role">Role / Title</Label>
          <Input
            id="staff-role"
            placeholder="e.g. Senior Stylist"
            value={data.role}
            onChange={(e) => onChange({ ...data, role: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-commission">Commission Rate</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">0%</span>
              <span className="text-sm font-semibold text-foreground">{data.commissionPct}%</span>
              <span className="text-sm text-muted-foreground">100%</span>
            </div>
            <input
              id="staff-commission"
              type="range"
              min={0}
              max={100}
              step={1}
              value={data.commissionPct}
              onChange={(e) => onChange({ ...data, commissionPct: parseInt(e.target.value, 10) })}
              className="w-full accent-primary cursor-pointer h-2"
            />
          </div>
        </div>
      </div>

      {/* Color picker */}
      <div className="flex flex-col gap-2">
        <Label>Avatar Color</Label>
        <div className="flex gap-3 flex-wrap">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange({ ...data, avatarColor: c.key })}
              className={cn(
                "w-10 h-10 rounded-full transition-all border-2",
                data.avatarColor === c.key
                  ? "border-foreground scale-110 shadow-md"
                  : "border-transparent hover:border-foreground/30"
              )}
              style={{ backgroundColor: c.solid }}
              title={c.label}
            >
              {data.avatarColor === c.key && (
                <Check className="w-4 h-4 text-white mx-auto" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 2 — Working Schedule
interface DaySchedule {
  working: boolean;
  startTime: string;
  endTime: string;
}

type WeekSchedule = DaySchedule[]; // index 0 = Mon (DOW=1) … index 6 = Sun (DOW=0)

const DEFAULT_SCHEDULE: WeekSchedule = DAYS_DOW.map((_, i) => ({
  working: i < 5, // Mon-Fri default
  startTime: "09:00",
  endTime: "18:00",
}));

const PRESETS = [
  {
    label: "Mon–Fri 9–6",
    apply: (): WeekSchedule =>
      DAYS_DOW.map((_, i) => ({
        working: i < 5,
        startTime: "09:00",
        endTime: "18:00",
      })),
  },
  {
    label: "Tue–Sat 10–7",
    apply: (): WeekSchedule =>
      DAYS_DOW.map((_, i) => ({
        working: i >= 1 && i <= 5,
        startTime: "10:00",
        endTime: "19:00",
      })),
  },
  {
    label: "Wed–Sun",
    apply: (): WeekSchedule =>
      DAYS_DOW.map((_, i) => ({
        working: i >= 2,
        startTime: "10:00",
        endTime: "18:00",
      })),
  },
];

function StepSchedule({
  schedule,
  onChange,
}: {
  schedule: WeekSchedule;
  onChange: (s: WeekSchedule) => void;
}) {
  function updateDay(idx: number, patch: Partial<DaySchedule>) {
    const next = schedule.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onChange(next);
  }

  // Build visual timeline bar for each working day
  function timeToFraction(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return ((h - 8) * 60 + m) / ((22 - 8) * 60); // 8am=0, 10pm=1
  }

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Quick presets</p>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.apply())}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/10 transition-colors text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual timeline */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Schedule overview</p>
        <div className="space-y-1.5">
          {schedule.map((day, idx) => (
            <div key={DAYS_SHORT[idx]} className="flex items-center gap-2 h-6">
              <span className="text-xs text-muted-foreground w-8 flex-shrink-0">{DAYS_SHORT[idx]}</span>
              <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden relative">
                {day.working && (
                  <div
                    className="absolute h-full bg-primary/70 rounded-sm"
                    style={{
                      left: `${timeToFraction(day.startTime) * 100}%`,
                      width: `${(timeToFraction(day.endTime) - timeToFraction(day.startTime)) * 100}%`,
                    }}
                  />
                )}
              </div>
              {day.working && (
                <span className="text-[10px] text-muted-foreground w-24 flex-shrink-0">
                  {formatTime(day.startTime)}–{formatTime(day.endTime)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Day toggles */}
      <div className="space-y-3">
        {DAYS_FULL.map((dayName, idx) => (
          <div
            key={dayName}
            className={cn(
              "rounded-xl border p-4 transition-colors",
              schedule[idx].working
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm text-foreground">{dayName}</span>
              <Switch
                checked={schedule[idx].working}
                onCheckedChange={(checked: boolean) => updateDay(idx, { working: checked })}
              />
            </div>

            {schedule[idx].working && (
              <div className="flex gap-3 items-center flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Start</span>
                  <select
                    value={schedule[idx].startTime}
                    onChange={(e) => updateDay(idx, { startTime: e.target.value })}
                    className="text-sm bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground outline-none focus:border-primary"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{formatTime(t)}</option>
                    ))}
                  </select>
                </div>
                <span className="text-muted-foreground text-sm pt-4">to</span>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">End</span>
                  <select
                    value={schedule[idx].endTime}
                    onChange={(e) => updateDay(idx, { endTime: e.target.value })}
                    className="text-sm bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground outline-none focus:border-primary"
                  >
                    {TIME_SLOTS.filter((t) => t > schedule[idx].startTime).map((t) => (
                      <option key={t} value={t}>{formatTime(t)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Step 3 — Services
interface ServiceSelection {
  [serviceId: string]: {
    selected: boolean;
    commissionOverride?: number;
  };
}

function StepServices({
  services,
  selection,
  onChange,
  existingStaff,
}: {
  services: ServiceData[];
  selection: ServiceSelection;
  onChange: (s: ServiceSelection) => void;
  existingStaff: StaffForCopy[];
}) {
  const [copyFrom, setCopyFrom] = useState<string>("");

  // Group by category
  const categories: Record<string, ServiceData[]> = {};
  for (const s of services) {
    if (!categories[s.categoryName]) categories[s.categoryName] = [];
    categories[s.categoryName].push(s);
  }
  const categoryNames = Object.keys(categories).sort();

  const selectedCount = Object.values(selection).filter((v) => v.selected).length;

  function selectAll() {
    const next: ServiceSelection = {};
    for (const s of services) {
      next[s.id] = { ...selection[s.id], selected: true };
    }
    onChange(next);
  }

  function clearAll() {
    const next: ServiceSelection = {};
    for (const s of services) {
      next[s.id] = { ...selection[s.id], selected: false };
    }
    onChange(next);
  }

  function copyFromStaff(staffId: string) {
    const staff = existingStaff.find((e) => e.id === staffId);
    if (!staff) return;
    const next: ServiceSelection = {};
    for (const s of services) {
      next[s.id] = {
        ...selection[s.id],
        selected: staff.services.includes(s.id),
      };
    }
    onChange(next);
    setCopyFrom("");
  }

  function toggle(serviceId: string) {
    onChange({
      ...selection,
      [serviceId]: {
        ...selection[serviceId],
        selected: !selection[serviceId]?.selected,
      },
    });
  }

  function setOverride(serviceId: string, val: string) {
    const num = parseFloat(val);
    onChange({
      ...selection,
      [serviceId]: {
        ...selection[serviceId],
        commissionOverride: isNaN(num) ? undefined : num,
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/10 transition-colors text-foreground"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-foreground"
          >
            Clear All
          </button>
          <Badge variant="secondary" className="text-xs">
            {selectedCount} selected
          </Badge>
        </div>

        {existingStaff.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Copy from:</span>
            <select
              value={copyFrom}
              onChange={(e) => {
                setCopyFrom(e.target.value);
                if (e.target.value) copyFromStaff(e.target.value);
              }}
              className="text-xs bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground outline-none focus:border-primary"
            >
              <option value="">Select staff…</option>
              {existingStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Categories */}
      {categoryNames.map((catName) => (
        <div key={catName}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {catName}
          </p>
          <div className="space-y-1">
            {categories[catName].map((svc) => {
              const sel = selection[svc.id];
              const isSelected = sel?.selected ?? false;

              return (
                <div
                  key={svc.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    isSelected
                      ? "border-primary/30 bg-primary/5"
                      : "border-border hover:bg-secondary/50"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(svc.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{svc.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ${svc.price.toFixed(0)}
                  </span>
                  {isSelected && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">Override %</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        placeholder="—"
                        value={sel?.commissionOverride ?? ""}
                        onChange={(e) => setOverride(svc.id, e.target.value)}
                        className="w-16 text-xs bg-secondary border border-border rounded-md px-1.5 py-1 text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {services.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No active services found. Add services first.
        </div>
      )}
    </div>
  );
}

// Step 4 — Review
function StepReview({
  basicInfo,
  schedule,
  selection,
  services,
}: {
  basicInfo: BasicInfoData;
  schedule: WeekSchedule;
  selection: ServiceSelection;
  services: ServiceData[];
}) {
  const colorDef = getColorClasses(basicInfo.avatarColor);
  const initials = basicInfo.name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  const workingDays = schedule
    .map((d, i) => (d.working ? DAYS_SHORT[i] : null))
    .filter(Boolean);

  const selectedServices = services.filter((s) => selection[s.id]?.selected);

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl flex-shrink-0",
              colorDef.bg,
              colorDef.text
            )}
          >
            {initials}
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">
              {basicInfo.name || <span className="text-muted-foreground italic">No name</span>}
            </p>
            {basicInfo.role && (
              <p className="text-sm text-muted-foreground">{basicInfo.role}</p>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {basicInfo.phone && (
                <span className="text-xs text-muted-foreground">{basicInfo.phone}</span>
              )}
              <Badge variant="secondary" className="text-xs">
                {basicInfo.commissionPct}% commission
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule summary */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-2">Working Schedule</p>
        {workingDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No working days selected</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Day</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Hours</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((day, idx) =>
                  day.working ? (
                    <tr key={DAYS_FULL[idx]} className="border-b border-border last:border-0">
                      <td className="p-3 text-foreground">{DAYS_FULL[idx]}</td>
                      <td className="p-3 text-muted-foreground">
                        {formatTime(day.startTime)} – {formatTime(day.endTime)}
                      </td>
                    </tr>
                  ) : null
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Services */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-2">
          Services{" "}
          <span className="text-muted-foreground font-normal">
            ({selectedServices.length} selected)
          </span>
        </p>
        {selectedServices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No services selected</p>
        ) : (
          <div className="flex gap-1.5 flex-wrap">
            {selectedServices.map((s) => (
              <Badge key={s.id} variant="secondary" className="text-xs">
                {s.name}
                {selection[s.id]?.commissionOverride !== undefined && (
                  <span className="ml-1 text-primary">
                    {selection[s.id].commissionOverride}%
                  </span>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Basic Info", icon: User },
  { label: "Schedule", icon: Calendar },
  { label: "Services", icon: Scissors },
  { label: "Review", icon: CheckCircle },
];

export function StaffOnboardingWizard({ services, existingStaff }: Props) {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    name: "",
    phone: "",
    role: "",
    commissionPct: 30,
    avatarColor: "violet",
    photo: null,
  });

  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);

  const [selection, setSelection] = useState<ServiceSelection>({});

  // Validation per step
  function canProceed(): boolean {
    if (step === 0) return basicInfo.name.trim().length > 0;
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Build schedule array (convert wizard index → dayOfWeek)
      const scheduleArr = schedule
        .map((d, i) =>
          d.working
            ? { dayOfWeek: DAYS_DOW[i], startTime: d.startTime, endTime: d.endTime }
            : null
        )
        .filter(Boolean) as { dayOfWeek: number; startTime: string; endTime: string }[];

      // Build services array
      const servicesArr = Object.entries(selection)
        .filter(([, v]) => v.selected)
        .map(([serviceId, v]) => ({
          serviceId,
          ...(v.commissionOverride !== undefined && {
            commissionOverridePct: v.commissionOverride,
          }),
        }));

      const result = await createStaffMember({
        name: basicInfo.name.trim(),
        phone: basicInfo.phone.trim() || undefined,
        role: basicInfo.role.trim() || undefined,
        commissionPct: basicInfo.commissionPct,
        avatarColor: basicInfo.avatarColor,
        photo: basicInfo.photo,
        schedule: scheduleArr,
        services: servicesArr,
      });

      if (!result.success) {
        setSubmitError(result.error);
        return;
      }

      router.push(`/dashboard/staff/${result.id}`);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicators */}
      <nav aria-label="Wizard steps" className="mb-8">
        <ol className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors",
                      done
                        ? "bg-primary border-primary text-primary-foreground"
                        : active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap hidden sm:block",
                      active ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 mt-[-16px]",
                      done ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step heading */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">
          Step {step + 1} — {STEPS[step].label}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {step === 0 && "Enter the staff member's basic details"}
          {step === 1 && "Set up their weekly working schedule"}
          {step === 2 && "Select the services they can perform"}
          {step === 3 && "Review everything before creating"}
        </p>
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === 0 && (
          <StepBasicInfo data={basicInfo} onChange={setBasicInfo} />
        )}
        {step === 1 && (
          <StepSchedule schedule={schedule} onChange={setSchedule} />
        )}
        {step === 2 && (
          <StepServices
            services={services}
            selection={selection}
            onChange={setSelection}
            existingStaff={existingStaff}
          />
        )}
        {step === 3 && (
          <StepReview
            basicInfo={basicInfo}
            schedule={schedule}
            selection={selection}
            services={services}
          />
        )}
      </div>

      {submitError && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting || !basicInfo.name.trim()}
            className="flex items-center gap-2 min-w-[160px]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Staff Member
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
