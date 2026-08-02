"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Users,
  Sparkles,
  SlidersHorizontal,
  MessageSquare,
  Calendar,
  Rocket,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign, getTargetAudience } from "@/app/actions/campaigns";
import { PREDEFINED_SEGMENTS } from "@/lib/segments";

// ── Zod schema ─────────────────────────────────────────────────────────────────

const wizardSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(200),
  type: z.enum(["BIRTHDAY", "WIN_BACK", "PROMOTIONAL", "CUSTOM"], {
    error: "Type is required",
  }),
  // Step 1 — Audience
  audienceMode: z.enum(["segment", "custom"]),
  segmentId: z.string().optional(),
  // Custom filter sub-fields (all optional)
  customMinVisits: z.string().optional(),
  customMinSpend: z.string().optional(),
  customLastVisitBefore: z.string().optional(),
  customLastVisitAfter: z.string().optional(),
  customTagsContain: z.string().optional(),
  // Step 2 — Message
  channel: z.enum(["SMS", "EMAIL", "WHATSAPP"], {
    error: "Channel is required",
  }),
  subject: z.string().max(200).optional(),
  message: z.string().min(1, "Message is required").max(1600),
  // Step 3 — Schedule
  scheduleMode: z.enum(["now", "later"]),
  scheduledAt: z.string().optional(),
});

type WizardValues = z.infer<typeof wizardSchema>;

// ── Step labels ────────────────────────────────────────────────────────────────

const STEP_CONFIG = [
  { label: "Audience", icon: Users },
  { label: "Message", icon: MessageSquare },
  { label: "Schedule", icon: Calendar },
  { label: "Review", icon: Rocket },
] as const;

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const total = STEP_CONFIG.length;
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEP_CONFIG.map(({ label, icon: Icon }, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1 min-w-0">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all ${
                i < current
                  ? "bg-primary text-primary-foreground"
                  : i === current
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30 scale-110"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < current ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
            </div>
            <span
              className={`text-[10px] font-medium hidden sm:block ${
                i === current ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
          {i < total - 1 && (
            <div
              className={`flex-1 h-0.5 rounded-full transition-colors mb-4 ${
                i < current ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Merge tag chip ─────────────────────────────────────────────────────────────

function MergeTagChip({
  tag,
  onInsert,
}: {
  tag: string;
  onInsert: (t: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onInsert(tag)}
      className="inline-flex items-center px-2 py-0.5 rounded border border-border bg-muted hover:bg-primary/10 hover:border-primary text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
    >
      {`{{${tag}}}`}
    </button>
  );
}

// ── Audience count display ─────────────────────────────────────────────────────

function AudiencePill({
  loading,
  count,
}: {
  loading: boolean;
  count: number | null;
}) {
  return (
    <div className="rounded-xl bg-muted/50 border border-border px-3 py-2.5 flex items-center gap-2">
      <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm text-muted-foreground">
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            Estimating audience…
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </span>
        ) : count !== null ? (
          <>
            This campaign will reach{" "}
            <strong className="text-foreground">{count.toLocaleString()} client{count !== 1 ? "s" : ""}</strong>
          </>
        ) : (
          "Select an audience segment above"
        )}
      </span>
    </div>
  );
}

// ── Segment color mapping ──────────────────────────────────────────────────────

const SEGMENT_COLOR_MAP: Record<string, string> = {
  "blue-500": "border-blue-500/40 bg-blue-500/5 text-blue-600 dark:text-blue-400",
  "purple-500": "border-purple-500/40 bg-purple-500/5 text-purple-600 dark:text-purple-400",
  "amber-500": "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400",
  "red-500": "border-red-500/40 bg-red-500/5 text-red-600 dark:text-red-400",
  "yellow-500": "border-yellow-500/40 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400",
  "pink-500": "border-pink-500/40 bg-pink-500/5 text-pink-600 dark:text-pink-400",
  "green-500": "border-green-500/40 bg-green-500/5 text-green-600 dark:text-green-400",
};

// ── Inner wizard form ─────────────────────────────────────────────────────────

interface WizardFormProps {
  onSuccess: () => void;
}

function WizardForm({ onSuccess }: WizardFormProps) {
  const [step, setStep] = React.useState(0);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [audienceCount, setAudienceCount] = React.useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = React.useState(false);

  // Per-segment estimated counts
  const [segmentCounts, setSegmentCounts] = React.useState<Record<string, number>>({});
  const [loadingSegments, setLoadingSegments] = React.useState(false);

  const messageRef = React.useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger: triggerValidation,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<WizardValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      name: "",
      type: undefined,
      audienceMode: "segment",
      segmentId: undefined,
      channel: undefined,
      subject: "",
      message: "",
      scheduleMode: "now",
      scheduledAt: "",
    },
  });

  const audienceMode = watch("audienceMode");
  const segmentId = watch("segmentId");
  const channel = watch("channel");
  const message = watch("message");
  const scheduleMode = watch("scheduleMode");

  // Load per-segment counts when Step 1 is shown
  React.useEffect(() => {
    if (step !== 0 || audienceMode !== "segment") return;
    let cancelled = false;

    async function loadCounts() {
      setLoadingSegments(true);
      try {
        const results = await Promise.all(
          PREDEFINED_SEGMENTS.map(async (seg) => {
            const r = await getTargetAudience(
              JSON.stringify({ filter: "segment", segmentId: seg.id })
            );
            return [seg.id, r.count] as [string, number];
          })
        );
        if (!cancelled) {
          setSegmentCounts(Object.fromEntries(results));
        }
      } finally {
        if (!cancelled) setLoadingSegments(false);
      }
    }

    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [step, audienceMode]);

  // Live audience count when segment selection changes
  React.useEffect(() => {
    if (step !== 0) return;

    const filter = buildTargetFilter();
    if (!filter) {
      setAudienceCount(null);
      return;
    }

    let cancelled = false;
    setLoadingAudience(true);

    getTargetAudience(filter).then((r) => {
      if (!cancelled) {
        setAudienceCount(r.count);
        setLoadingAudience(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, segmentId, audienceMode]);

  function buildTargetFilter(): string | null {
    const mode = getValues("audienceMode");
    if (mode === "segment") {
      const sid = getValues("segmentId");
      if (!sid) return null;
      return JSON.stringify({ filter: "segment", segmentId: sid });
    }
    // custom
    const custom: Record<string, unknown> = { filter: "custom" };
    const minV = getValues("customMinVisits");
    const minS = getValues("customMinSpend");
    const lBef = getValues("customLastVisitBefore");
    const lAft = getValues("customLastVisitAfter");
    const tags = getValues("customTagsContain");
    if (minV) custom.minVisits = parseInt(minV);
    if (minS) custom.minSpend = parseFloat(minS);
    if (lBef) custom.lastVisitBefore = lBef;
    if (lAft) custom.lastVisitAfter = lAft;
    if (tags) custom.tagsContain = tags;
    return JSON.stringify(custom);
  }

  function insertMergeTag(tag: string) {
    const el = messageRef.current;
    const currentMsg = message ?? "";
    const token = `{{${tag}}}`;
    if (!el) {
      setValue("message", currentMsg + token);
      return;
    }
    const start = el.selectionStart ?? currentMsg.length;
    const end = el.selectionEnd ?? currentMsg.length;
    const newValue = currentMsg.slice(0, start) + token + currentMsg.slice(end);
    setValue("message", newValue, { shouldValidate: true });
    setTimeout(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  const stepFields: Array<Array<keyof WizardValues>> = [
    ["name", "type", "audienceMode"],
    ["channel", "message"],
    ["scheduleMode"],
    [],
  ];

  async function goNext() {
    const valid = await triggerValidation(stepFields[step] as (keyof WizardValues)[]);
    if (!valid) return;
    // Step 1: require segment selection in segment mode
    if (step === 0 && audienceMode === "segment" && !segmentId) {
      return;
    }
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => s - 1);
  }

  async function onSubmit(values: WizardValues) {
    setServerError(null);

    const targetFilter = buildTargetFilter();
    let scheduledAt: Date | null = null;
    if (values.scheduleMode === "later" && values.scheduledAt) {
      scheduledAt = new Date(values.scheduledAt);
    }

    const result = await createCampaign({
      name: values.name,
      type: values.type,
      message: values.message,
      channel: values.channel,
      subject: values.channel === "EMAIL" ? (values.subject ?? null) : null,
      targetFilter,
      scheduledAt,
    });

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    router.refresh();
    onSuccess();
  }

  const smsWarning = channel === "WHATSAPP" && (message?.length ?? 0) > 4096;
  const charColor =
    (message?.length ?? 0) > 4096 && channel === "WHATSAPP"
      ? "text-destructive"
      : (message?.length ?? 0) > 4096 && channel === "WHATSAPP"
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-0">
      <StepIndicator current={step} />

      {/* ── STEP 1: Target Audience ───────────────────────────────────────────── */}
      {step === 0 && (
        <div className="flex flex-col gap-4">
          {/* Name + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="wiz-name">
                Campaign name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wiz-name"
                placeholder="e.g. Summer VIP Promo"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <select
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="" disabled>Select type</option>
                    <option value="BIRTHDAY">Birthday</option>
                    <option value="WIN_BACK">Win-back</option>
                    <option value="PROMOTIONAL">Promotional</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                )}
              />
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>
          </div>

          {/* Audience mode toggle */}
          <div className="flex flex-col gap-2">
            <Label>Target audience</Label>
            <Controller
              name="audienceMode"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  <label
                    className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                      field.value === "segment"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      value="segment"
                      checked={field.value === "segment"}
                      onChange={() => field.onChange("segment")}
                    />
                    <Sparkles className="w-4 h-4" />
                    Smart Segments
                  </label>
                  <label
                    className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                      field.value === "custom"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      value="custom"
                      checked={field.value === "custom"}
                      onChange={() => field.onChange("custom")}
                    />
                    <SlidersHorizontal className="w-4 h-4" />
                    Custom Filter
                  </label>
                </div>
              )}
            />
          </div>

          {/* Segment cards */}
          {audienceMode === "segment" && (
            <Controller
              name="segmentId"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PREDEFINED_SEGMENTS.map((seg) => {
                    const isSelected = field.value === seg.id;
                    const colorClass =
                      SEGMENT_COLOR_MAP[seg.color] ??
                      "border-border bg-muted/40 text-foreground";
                    const selectedColorClass = isSelected
                      ? colorClass
                      : "border-border bg-card hover:bg-muted/30";
                    const estCount = segmentCounts[seg.id];

                    return (
                      <label
                        key={seg.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedColorClass} ${
                          isSelected ? "ring-1 ring-inset ring-current" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          value={seg.id}
                          checked={isSelected}
                          onChange={() => field.onChange(seg.id)}
                        />
                        <span className="text-xl leading-none flex-shrink-0 mt-0.5">
                          {seg.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-tight">{seg.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {seg.description}
                          </p>
                          {loadingSegments ? (
                            <span className="text-xs text-muted-foreground/60">
                              loading…
                            </span>
                          ) : estCount !== undefined ? (
                            <span className="text-xs font-medium mt-0.5 block">
                              ~{estCount.toLocaleString()} clients
                            </span>
                          ) : null}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            />
          )}

          {/* Custom filter fields */}
          {audienceMode === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cust-visits">Min visits</Label>
                <Input
                  id="cust-visits"
                  type="number"
                  min="0"
                  placeholder="e.g. 5"
                  {...register("customMinVisits")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cust-spend">Min spend ($)</Label>
                <Input
                  id="cust-spend"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 200"
                  {...register("customMinSpend")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cust-before">Last visit before</Label>
                <Input
                  id="cust-before"
                  type="date"
                  {...register("customLastVisitBefore")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cust-after">Last visit after</Label>
                <Input
                  id="cust-after"
                  type="date"
                  {...register("customLastVisitAfter")}
                />
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <Label htmlFor="cust-tags">Tags contain</Label>
                <Input
                  id="cust-tags"
                  placeholder="e.g. loyal"
                  {...register("customTagsContain")}
                />
              </div>
            </div>
          )}

          {/* Live audience count */}
          <AudiencePill loading={loadingAudience} count={audienceCount} />

          {step === 0 && audienceMode === "segment" && !segmentId && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Please select a segment to continue.
            </p>
          )}
        </div>
      )}

      {/* ── STEP 2: Message ──────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {/* Channel */}
          <div className="flex flex-col gap-1.5">
            <Label>
              Channel <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="channel"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  {(["SMS", "EMAIL", "WHATSAPP"] as const).map((ch) => (
                    <label
                      key={ch}
                      className={`flex-1 flex items-center justify-center p-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                        field.value === ch
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        value={ch}
                        checked={field.value === ch}
                        onChange={() => field.onChange(ch)}
                      />
                      {ch === "SMS" ? "SMS" : ch === "EMAIL" ? "Email" : "WhatsApp"}
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.channel && (
              <p className="text-xs text-destructive">{errors.channel.message}</p>
            )}
          </div>

          {/* Email subject */}
          {channel === "EMAIL" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wiz-subject">Subject line</Label>
              <Input
                id="wiz-subject"
                placeholder="e.g. A special offer just for you!"
                {...register("subject")}
              />
            </div>
          )}

          {/* Merge tags */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Insert merge tag:
            </p>
            <div className="flex flex-wrap gap-2">
              <MergeTagChip tag="clientName" onInsert={insertMergeTag} />
              <MergeTagChip tag="salonName" onInsert={insertMergeTag} />
              <MergeTagChip tag="bookingLink" onInsert={insertMergeTag} />
            </div>
          </div>

          {/* Message textarea */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wiz-message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="wiz-message"
              placeholder="Hi {{clientName}}, we have an exclusive offer for you at {{salonName}}! Book at {{bookingLink}}"
              className="resize-none min-h-[140px]"
              aria-invalid={!!errors.message}
              {...register("message")}
              ref={(el) => {
                messageRef.current = el;
                const { ref } = register("message");
                if (typeof ref === "function") ref(el);
              }}
            />
            <div className="flex items-center justify-between">
              {errors.message ? (
                <p className="text-xs text-destructive">{errors.message.message}</p>
              ) : smsWarning ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Message exceeds WhatsApp 4096 character limit
                </p>
              ) : (
                <span />
              )}
              <p className={`text-xs tabular-nums ${charColor}`}>
                {message?.length ?? 0} / {channel === "WHATSAPP" ? "4096" : "1600"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Schedule ─────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <Controller
            name="scheduleMode"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                {[
                  {
                    value: "now",
                    label: "Save as draft",
                    desc: "Save now, launch manually when ready from campaigns list",
                  },
                  {
                    value: "later",
                    label: "Schedule for later",
                    desc: "Pick a date and time — campaign will be queued for launch",
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      field.value === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      className="accent-primary mt-0.5"
                      value={opt.value}
                      checked={field.value === opt.value}
                      onChange={() => field.onChange(opt.value)}
                    />
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          />

          {scheduleMode === "later" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wiz-scheduled-at">Date &amp; time</Label>
              <Input
                id="wiz-scheduled-at"
                type="datetime-local"
                {...register("scheduledAt")}
              />
            </div>
          )}

          {/* Preview box */}
          <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2 text-sm">
            <p className="font-semibold text-foreground">Sending preview</p>
            <p className="text-muted-foreground">
              Audience:{" "}
              <strong className="text-foreground">
                {audienceCount !== null
                  ? `${audienceCount.toLocaleString()} client${audienceCount !== 1 ? "s" : ""}`
                  : "—"}
              </strong>
            </p>
            <p className="text-muted-foreground">
              Via: <strong className="text-foreground">{watch("channel") || "—"}</strong>
            </p>
            <p className="text-muted-foreground">
              Status after save:{" "}
              <strong className="text-foreground">
                {scheduleMode === "later" ? "Draft (scheduled)" : "Draft"}
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review & Launch ──────────────────────────────────────────── */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="font-semibold text-foreground text-base">Campaign Summary</p>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="font-medium text-foreground truncate">
                  {watch("name") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Type</dt>
                <dd className="font-medium text-foreground capitalize">
                  {watch("type")?.toLowerCase().replace("_", "-") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Channel</dt>
                <dd className="font-medium text-foreground">
                  {watch("channel") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Audience</dt>
                <dd className="font-medium text-foreground">
                  {audienceCount !== null
                    ? `${audienceCount.toLocaleString()} clients`
                    : "—"}
                </dd>
              </div>
              {watch("channel") === "EMAIL" && watch("subject") && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Subject</dt>
                  <dd className="font-medium text-foreground">{watch("subject")}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Schedule</dt>
                <dd className="font-medium text-foreground">
                  {watch("scheduleMode") === "later" && watch("scheduledAt")
                    ? new Date(watch("scheduledAt")!).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Save as draft"}
                </dd>
              </div>
            </dl>

            {/* Message preview */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Message preview</p>
              <div className="rounded-xl bg-muted/50 border border-border px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                {watch("message") || <span className="text-muted-foreground italic">No message yet</span>}
              </div>
            </div>
          </div>

          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <DialogFooter className="mt-6 flex items-center gap-2">
        {step === 0 ? (
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
        ) : (
          <Button type="button" variant="outline" onClick={goBack}>
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}

        {step < 3 ? (
          <Button type="button" onClick={goNext}>
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Launch Campaign
              </>
            )}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

// ── Public export ──────────────────────────────────────────────────────────────

export function CampaignWizardDialog() {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" />
        }
      >
        <Sparkles className="w-4 h-4" />
        New Campaign
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Create Campaign
          </DialogTitle>
        </DialogHeader>
        <WizardForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
