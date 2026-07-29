"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePricingRule, type PricingRule } from "@/app/actions/pricing-rules";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";

interface Service {
  id: string;
  name: string;
  categoryName: string;
}

interface RuleWizardProps {
  services: Service[];
  editRule?: PricingRule | null;
  onClose: () => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const RULE_TYPES = [
  {
    value: "peak" as const,
    label: "Peak Hours",
    description: "Busy periods — add a surcharge",
    emoji: "🔥",
  },
  {
    value: "offpeak" as const,
    label: "Off-Peak Discount",
    description: "Slow periods — attract more bookings",
    emoji: "🌙",
  },
  {
    value: "lastminute" as const,
    label: "Last-Minute Deal",
    description: "Book within X hours — fill gaps",
    emoji: "⚡",
  },
  {
    value: "advance" as const,
    label: "Advance Booking",
    description: "Book X days ahead — reward planners",
    emoji: "📅",
  },
  {
    value: "day_of_week" as const,
    label: "Day of Week",
    description: "Price change on specific days",
    emoji: "📆",
  },
  {
    value: "seasonal" as const,
    label: "Seasonal",
    description: "Date range — holidays, events",
    emoji: "🌸",
  },
];

interface FormState {
  name: string;
  type: PricingRule["type"];
  daysOfWeek: number[];
  timeRangeStart: string;
  timeRangeEnd: string;
  advanceDays: number;
  lastMinuteHours: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  adjustmentType: "percent" | "fixed";
  adjustmentValue: number;
  isDiscount: boolean;
  appliesTo: "all" | string[];
  priority: number;
}

function defaultForm(edit?: PricingRule | null): FormState {
  if (edit) {
    return {
      name: edit.name,
      type: edit.type,
      daysOfWeek: edit.daysOfWeek ?? [],
      timeRangeStart: edit.timeRangeStart ?? "09:00",
      timeRangeEnd: edit.timeRangeEnd ?? "17:00",
      advanceDays: edit.advanceDays ?? 7,
      lastMinuteHours: edit.lastMinuteHours ?? 24,
      dateRangeStart: edit.dateRangeStart ?? "",
      dateRangeEnd: edit.dateRangeEnd ?? "",
      adjustmentType: edit.adjustmentType,
      adjustmentValue: Math.abs(edit.adjustmentValue),
      isDiscount: edit.adjustmentValue < 0,
      appliesTo: edit.appliesTo,
      priority: edit.priority,
    };
  }
  return {
    name: "",
    type: "peak",
    daysOfWeek: [],
    timeRangeStart: "09:00",
    timeRangeEnd: "12:00",
    advanceDays: 7,
    lastMinuteHours: 24,
    dateRangeStart: "",
    dateRangeEnd: "",
    adjustmentType: "percent",
    adjustmentValue: 10,
    isDiscount: false,
    appliesTo: "all",
    priority: 0,
  };
}

export function RuleWizard({ services, editRule, onClose }: RuleWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => defaultForm(editRule));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function toggleDay(d: number) {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter((x) => x !== d) : [...f.daysOfWeek, d],
    }));
  }

  function toggleService(id: string) {
    setForm((f) => {
      if (f.appliesTo === "all") return { ...f, appliesTo: [id] };
      const arr = f.appliesTo as string[];
      return {
        ...f,
        appliesTo: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
      };
    });
  }

  function handleSave() {
    setError("");
    const adjustmentValue = form.isDiscount ? -Math.abs(form.adjustmentValue) : Math.abs(form.adjustmentValue);
    const rule: Omit<PricingRule, "id"> & { id?: string } = {
      ...(editRule?.id ? { id: editRule.id } : {}),
      name: form.name || (RULE_TYPES.find((r) => r.value === form.type)?.label ?? "Rule"),
      type: form.type,
      adjustmentType: form.adjustmentType,
      adjustmentValue,
      appliesTo: form.appliesTo,
      active: true,
      priority: form.priority,
      ...(["peak", "offpeak", "day_of_week"].includes(form.type) && form.daysOfWeek.length > 0
        ? { daysOfWeek: form.daysOfWeek }
        : {}),
      ...(["peak", "offpeak"].includes(form.type) && form.timeRangeStart && form.timeRangeEnd
        ? { timeRangeStart: form.timeRangeStart, timeRangeEnd: form.timeRangeEnd }
        : {}),
      ...(form.type === "advance" ? { advanceDays: form.advanceDays } : {}),
      ...(form.type === "lastminute" ? { lastMinuteHours: form.lastMinuteHours } : {}),
      ...(form.type === "seasonal" && form.dateRangeStart && form.dateRangeEnd
        ? { dateRangeStart: form.dateRangeStart, dateRangeEnd: form.dateRangeEnd }
        : {}),
    };
    startTransition(async () => {
      const result = await savePricingRule(rule);
      if (result.success) {
        router.refresh();
        onClose();
      } else {
        setError("Failed to save rule. Please try again.");
      }
    });
  }

  // ── Step renders ─────────────────────────────────────────────────────────────

  function renderStep0() {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">Choose rule type</h3>
          <p className="text-xs text-muted-foreground">What kind of pricing adjustment do you want?</p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {RULE_TYPES.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: rt.value }))}
              className={[
                "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                form.type === rt.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted/50",
              ].join(" ")}
            >
              <span className="text-xl flex-shrink-0">{rt.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{rt.label}</p>
                <p className="text-xs text-muted-foreground truncate">{rt.description}</p>
              </div>
              {form.type === rt.value && (
                <Check className="w-4 h-4 text-primary ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderStep1() {
    const type = form.type;
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">Set conditions</h3>
          <p className="text-xs text-muted-foreground">When should this rule apply?</p>
        </div>

        {/* Rule name */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Rule name</label>
          <input
            type="text"
            placeholder={RULE_TYPES.find((r) => r.value === type)?.label ?? "Rule"}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Days of week */}
        {["peak", "offpeak", "day_of_week"].includes(type) && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Days of week</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={[
                    "w-10 h-10 rounded-lg text-xs font-semibold border transition-colors",
                    form.daysOfWeek.includes(i)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50",
                  ].join(" ")}
                >
                  {d}
                </button>
              ))}
            </div>
            {form.daysOfWeek.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Leave empty to match all days.</p>
            )}
          </div>
        )}

        {/* Time range */}
        {["peak", "offpeak"].includes(type) && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start time</label>
              <input
                type="time"
                value={form.timeRangeStart}
                onChange={(e) => setForm((f) => ({ ...f, timeRangeStart: e.target.value }))}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">End time</label>
              <input
                type="time"
                value={form.timeRangeEnd}
                onChange={(e) => setForm((f) => ({ ...f, timeRangeEnd: e.target.value }))}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {/* Last-minute hours */}
        {type === "lastminute" && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Within how many hours?
            </label>
            <input
              type="number"
              min={1}
              max={72}
              value={form.lastMinuteHours}
              onChange={(e) => setForm((f) => ({ ...f, lastMinuteHours: Number(e.target.value) }))}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1">Rule applies when booking is made within this many hours of the appointment.</p>
          </div>
        )}

        {/* Advance days */}
        {type === "advance" && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              How many days in advance?
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={form.advanceDays}
              onChange={(e) => setForm((f) => ({ ...f, advanceDays: Number(e.target.value) }))}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1">Rule applies when booking is made at least this many days before the appointment.</p>
          </div>
        )}

        {/* Seasonal date range */}
        {type === "seasonal" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">From date</label>
              <input
                type="date"
                value={form.dateRangeStart}
                onChange={(e) => setForm((f) => ({ ...f, dateRangeStart: e.target.value }))}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">To date</label>
              <input
                type="date"
                value={form.dateRangeEnd}
                onChange={(e) => setForm((f) => ({ ...f, dateRangeEnd: e.target.value }))}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority (higher = applied first)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">Price adjustment</h3>
          <p className="text-xs text-muted-foreground">How much to change the price?</p>
        </div>

        {/* Discount vs Surcharge */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isDiscount: true }))}
              className={[
                "flex-1 h-10 rounded-lg border-2 text-sm font-semibold transition-colors",
                form.isDiscount
                  ? "bg-green-500/20 border-green-500 text-green-400"
                  : "border-border text-muted-foreground hover:border-green-500/50",
              ].join(" ")}
            >
              Discount (-)
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isDiscount: false }))}
              className={[
                "flex-1 h-10 rounded-lg border-2 text-sm font-semibold transition-colors",
                !form.isDiscount
                  ? "bg-red-500/20 border-red-500 text-red-400"
                  : "border-border text-muted-foreground hover:border-red-500/50",
              ].join(" ")}
            >
              Surcharge (+)
            </button>
          </div>
        </div>

        {/* Amount type */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Amount type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, adjustmentType: "percent" }))}
              className={[
                "flex-1 h-10 rounded-lg border-2 text-sm font-semibold transition-colors",
                form.adjustmentType === "percent"
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              ].join(" ")}
            >
              Percentage (%)
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, adjustmentType: "fixed" }))}
              className={[
                "flex-1 h-10 rounded-lg border-2 text-sm font-semibold transition-colors",
                form.adjustmentType === "fixed"
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              ].join(" ")}
            >
              Fixed ($)
            </button>
          </div>
        </div>

        {/* Amount value */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
              {form.adjustmentType === "percent" ? "%" : "$"}
            </span>
            <input
              type="number"
              min={0}
              step={form.adjustmentType === "percent" ? 1 : 0.5}
              value={form.adjustmentValue}
              onChange={(e) => setForm((f) => ({ ...f, adjustmentValue: Math.abs(Number(e.target.value)) }))}
              className="w-full h-9 rounded-lg border border-input bg-background pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Applies to */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Applies to</label>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, appliesTo: "all" }))}
              className={[
                "flex-1 h-9 rounded-lg border-2 text-sm font-semibold transition-colors",
                form.appliesTo === "all"
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              ].join(" ")}
            >
              All services
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, appliesTo: [] }))}
              className={[
                "flex-1 h-9 rounded-lg border-2 text-sm font-semibold transition-colors",
                form.appliesTo !== "all"
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              ].join(" ")}
            >
              Select services
            </button>
          </div>

          {form.appliesTo !== "all" && (
            <div className="space-y-1 max-h-44 overflow-y-auto rounded-lg border border-border p-2 bg-muted/20">
              {services.map((svc) => {
                const selected = Array.isArray(form.appliesTo) && form.appliesTo.includes(svc.id);
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => toggleService(svc.id)}
                    className={[
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-colors",
                      selected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                        selected ? "bg-primary border-primary" : "border-muted-foreground",
                      ].join(" ")}
                    >
                      {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    <span className="truncate">{svc.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto truncate">{svc.categoryName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderStep3() {
    const typeLabel = RULE_TYPES.find((r) => r.value === form.type)?.label ?? form.type;
    const ruleName = form.name || typeLabel;
    const adjustmentValue = form.isDiscount
      ? -Math.abs(form.adjustmentValue)
      : Math.abs(form.adjustmentValue);
    const adjustDisplay =
      (adjustmentValue >= 0 ? "+" : "") +
      (form.adjustmentType === "percent"
        ? `${adjustmentValue}%`
        : `$${Math.abs(adjustmentValue).toFixed(2)}`);

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">Review & save</h3>
          <p className="text-xs text-muted-foreground">Check everything before saving.</p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <Row label="Name" value={ruleName} />
          <Row label="Type" value={typeLabel} />
          <Row
            label="Adjustment"
            value={adjustDisplay}
            valueClass={adjustmentValue < 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}
          />
          {form.daysOfWeek.length > 0 && (
            <Row label="Days" value={form.daysOfWeek.map((d) => DAYS[d]).join(", ")} />
          )}
          {["peak", "offpeak"].includes(form.type) && form.timeRangeStart && form.timeRangeEnd && (
            <Row label="Time range" value={`${form.timeRangeStart} – ${form.timeRangeEnd}`} />
          )}
          {form.type === "lastminute" && (
            <Row label="Within" value={`${form.lastMinuteHours} hours`} />
          )}
          {form.type === "advance" && (
            <Row label="Advance" value={`${form.advanceDays} days`} />
          )}
          {form.type === "seasonal" && form.dateRangeStart && form.dateRangeEnd && (
            <Row label="Date range" value={`${form.dateRangeStart} → ${form.dateRangeEnd}`} />
          )}
          <Row
            label="Applies to"
            value={form.appliesTo === "all" ? "All services" : `${Array.isArray(form.appliesTo) ? form.appliesTo.length : 0} service(s)`}
          />
          <Row label="Priority" value={String(form.priority)} />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>
    );
  }

  const steps = [
    { label: "Type", render: renderStep0 },
    { label: "Conditions", render: renderStep1 },
    { label: "Adjustment", render: renderStep2 },
    { label: "Review", render: renderStep3 },
  ];

  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-bold text-foreground">
            {editRule ? "Edit Pricing Rule" : "Create Pricing Rule"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-border flex-shrink-0">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-1.5">
                <div
                  className={[
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span
                  className={[
                    "text-xs font-medium hidden sm:inline",
                    i === step ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={["flex-1 h-px mx-2", i < step ? "bg-primary" : "bg-border"].join(" ")} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{steps[step].render()}</div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={isPending}
              className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? handleSave : () => setStep((s) => s + 1)}
            disabled={isPending}
            className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {isLast ? (
              isPending ? "Saving…" : (editRule ? "Update Rule" : "Save Rule")
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className={["text-foreground text-right", valueClass ?? ""].join(" ")}>{value}</span>
    </div>
  );
}
