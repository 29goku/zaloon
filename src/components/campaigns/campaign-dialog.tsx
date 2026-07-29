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
  Gift,
  RefreshCw,
  Tag,
  Sparkles,
} from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign, getTargetAudience } from "@/app/actions/campaigns";

// ── Types ──────────────────────────────────────────────────────────────────────

type FilterType = "all" | "inactive" | "birthday" | "vip";
export type CampaignTemplateKey = "BIRTHDAY" | "WIN_BACK" | "PROMOTIONAL";

// ── Templates ─────────────────────────────────────────────────────────────────

const CAMPAIGN_TEMPLATES: Record<
  CampaignTemplateKey,
  { name: string; type: string; message: string; subject?: string; filter: FilterType }
> = {
  BIRTHDAY: {
    name: "Birthday Campaign",
    type: "BIRTHDAY",
    message:
      "Happy Birthday, {name}! To celebrate your special day, enjoy 20% off your next visit. Valid this month only! Book now and let us pamper you.",
    subject: "Happy Birthday from Zaloon! Here's your gift",
    filter: "birthday",
  },
  WIN_BACK: {
    name: "Win-back Campaign",
    type: "WIN_BACK",
    message:
      "Hi {name}, we miss you! It's been a while since your last visit. Come back and enjoy a special welcome-back offer — 15% off your next appointment. Book today at Zaloon!",
    subject: "We miss you! Come back for a special offer",
    filter: "inactive",
  },
  PROMOTIONAL: {
    name: "Promotional Offer",
    type: "PROMOTIONAL",
    message:
      "Hi {name}! Zaloon has an exclusive offer just for you. Book before {date} and get an amazing deal. Our team can't wait to see you!",
    subject: "Exclusive offer just for you from Zaloon",
    filter: "all",
  },
};

// ── Form schema ────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(200),
  type: z.enum(["BIRTHDAY", "WIN_BACK", "PROMOTIONAL", "CUSTOM"], {
    error: "Campaign type is required",
  }),
  // Step 1 — Audience
  audienceFilter: z.enum(["all", "inactive", "birthday", "vip"]),
  daysInactive: z.string().optional(),
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

type FormValues = z.infer<typeof formSchema>;

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEP_LABELS = ["Audience", "Message", "Schedule"];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
              i < current
                ? "bg-primary text-primary-foreground"
                : i === current
                ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`flex-1 h-0.5 rounded-full transition-colors ${
                i < current ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Variable chip ──────────────────────────────────────────────────────────────

function VarChip({
  variable,
  onInsert,
}: {
  variable: string;
  onInsert: (v: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onInsert(variable)}
      className="inline-flex items-center px-2 py-0.5 rounded border border-border bg-muted hover:bg-primary/10 hover:border-primary text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
    >
      {`{${variable}}`}
    </button>
  );
}

// ── Inner form ─────────────────────────────────────────────────────────────────

interface CampaignFormProps {
  defaultType?: CampaignTemplateKey;
  prefillMessage?: string;
  onSuccess: () => void;
}

function CampaignForm({ defaultType, prefillMessage, onSuccess }: CampaignFormProps) {
  const [step, setStep] = React.useState(0);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [audienceCount, setAudienceCount] = React.useState<number | null>(null);
  const [audiencePreview, setAudiencePreview] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingAudience, setLoadingAudience] = React.useState(false);

  const messageRef = React.useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();

  const template = defaultType ? CAMPAIGN_TEMPLATES[defaultType] : undefined;

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger: triggerValidation,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: template?.name ?? "",
      type: (template?.type as FormValues["type"]) ?? undefined,
      audienceFilter: template?.filter ?? "all",
      daysInactive: "30",
      channel: undefined,
      subject: template?.subject ?? "",
      message: prefillMessage ?? template?.message ?? "",
      scheduleMode: "now",
      scheduledAt: "",
    },
  });

  const audienceFilter = watch("audienceFilter");
  const daysInactive = watch("daysInactive");
  const channel = watch("channel");
  const message = watch("message");
  const scheduleMode = watch("scheduleMode");

  // Build targetFilter JSON
  function buildTargetFilter(): string {
    if (audienceFilter === "inactive") {
      const days = parseInt(daysInactive ?? "30");
      return JSON.stringify({
        filter: "inactive",
        daysInactive: isNaN(days) ? 30 : days,
      });
    }
    return JSON.stringify({ filter: audienceFilter });
  }

  // Fetch audience on step 0
  React.useEffect(() => {
    if (step !== 0) return;
    let cancelled = false;

    async function fetchAudience() {
      setLoadingAudience(true);
      try {
        const result = await getTargetAudience(buildTargetFilter());
        if (!cancelled) {
          setAudienceCount(result.count);
          setAudiencePreview(result.preview.map((c) => ({ id: c.id, name: c.name })));
        }
      } finally {
        if (!cancelled) setLoadingAudience(false);
      }
    }

    fetchAudience();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, audienceFilter, daysInactive]);

  // Insert variable into message textarea at cursor
  function insertVariable(variable: string) {
    const el = messageRef.current;
    const currentMsg = message ?? "";
    if (!el) {
      setValue("message", currentMsg + `{${variable}}`);
      return;
    }
    const start = el.selectionStart ?? currentMsg.length;
    const end = el.selectionEnd ?? currentMsg.length;
    const newValue =
      currentMsg.slice(0, start) + `{${variable}}` + currentMsg.slice(end);
    setValue("message", newValue, { shouldValidate: true });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + variable.length + 2,
        start + variable.length + 2
      );
    }, 0);
  }

  const stepFields: Array<Array<keyof FormValues>> = [
    ["name", "type", "audienceFilter"],
    ["channel", "message"],
    ["scheduleMode"],
  ];

  async function goNext() {
    const valid = await triggerValidation(stepFields[step]);
    if (valid) setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => s - 1);
  }

  async function onSubmit(values: FormValues) {
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-0 mt-2">
      <StepIndicator current={step} total={3} />

      <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wide">
        Step {step + 1}: {STEP_LABELS[step]}
      </p>

      {/* ── STEP 1: Audience ── */}
      {step === 0 && (
        <div className="flex flex-col gap-4">
          {/* Campaign name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="campaign-name">
              Campaign name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="campaign-name"
              placeholder="e.g. Summer Sale Blast"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Campaign type */}
          <div className="flex flex-col gap-1.5">
            <Label>
              Type <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-invalid={!!errors.type}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BIRTHDAY">Birthday</SelectItem>
                    <SelectItem value="WIN_BACK">Win-back</SelectItem>
                    <SelectItem value="PROMOTIONAL">Promotional</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>

          {/* Target filter */}
          <div className="flex flex-col gap-2">
            <Label>Target audience</Label>
            <Controller
              name="audienceFilter"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "all", label: "All clients", icon: Users },
                    { value: "inactive", label: "Inactive clients", icon: RefreshCw },
                    { value: "birthday", label: "Birthday this month", icon: Gift },
                    { value: "vip", label: "VIP clients", icon: Sparkles },
                  ].map(({ value, label, icon: Icon }) => (
                    <label
                      key={value}
                      className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                        field.value === value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        value={value}
                        checked={field.value === value}
                        onChange={() => field.onChange(value)}
                      />
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          field.value === value ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-xs font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Days inactive sub-field */}
          {audienceFilter === "inactive" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="days-inactive">No visit in (days)</Label>
              <Input
                id="days-inactive"
                type="number"
                min="1"
                placeholder="e.g. 30"
                {...register("daysInactive")}
              />
            </div>
          )}

          {/* Live audience preview */}
          <div className="rounded-xl bg-muted/50 border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">
                {loadingAudience ? (
                  <span className="inline-flex items-center gap-1">
                    Estimating…
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </span>
                ) : audienceCount !== null ? (
                  <>
                    <strong className="text-foreground">
                      {audienceCount.toLocaleString()} client
                      {audienceCount !== 1 ? "s" : ""}
                    </strong>{" "}
                    will receive this campaign
                  </>
                ) : (
                  "Calculating audience…"
                )}
              </span>
            </div>
            {audiencePreview.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {audiencePreview.map((c) => (
                  <span
                    key={c.id}
                    className="text-xs bg-background border border-border rounded-full px-2 py-0.5 text-muted-foreground"
                  >
                    {c.name}
                  </span>
                ))}
                {audienceCount !== null && audienceCount > 5 && (
                  <span className="text-xs text-muted-foreground px-1 py-0.5">
                    +{(audienceCount - 5).toLocaleString()} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: Message ── */}
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
                  {[
                    { value: "SMS", label: "SMS" },
                    { value: "EMAIL", label: "Email" },
                    { value: "WHATSAPP", label: "WhatsApp" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex-1 flex items-center justify-center p-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                        field.value === opt.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        value={opt.value}
                        checked={field.value === opt.value}
                        onChange={() => field.onChange(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.channel && (
              <p className="text-xs text-destructive">{errors.channel.message}</p>
            )}
          </div>

          {/* Subject — email only */}
          {channel === "EMAIL" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-subject">Subject line</Label>
              <Input
                id="campaign-subject"
                placeholder="e.g. A special offer just for you!"
                {...register("subject")}
              />
              {errors.subject && (
                <p className="text-xs text-destructive">{errors.subject.message}</p>
              )}
            </div>
          )}

          {/* Variable chips */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground font-medium">Insert variable:</p>
            <div className="flex gap-2 flex-wrap">
              <VarChip variable="name" onInsert={insertVariable} />
              <VarChip variable="date" onInsert={insertVariable} />
            </div>
          </div>

          {/* Message textarea */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="campaign-message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="campaign-message"
              placeholder={`Hi {name}, we have a special offer for you! Visit us before {date} to claim.`}
              className="resize-none min-h-[130px]"
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
              ) : (
                <span />
              )}
              <p
                className={`text-xs tabular-nums ${
                  (message?.length ?? 0) > 1600
                    ? "text-destructive"
                    : (message?.length ?? 0) > 1400
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}
              >
                {message?.length ?? 0} / 1600
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Schedule ── */}
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
                    desc: "Campaign saved as DRAFT — launch manually when ready",
                  },
                  {
                    value: "later",
                    label: "Schedule for later",
                    desc: "Pick a date and time to automatically launch",
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
              <Label htmlFor="scheduled-at">Date &amp; time</Label>
              <Input
                id="scheduled-at"
                type="datetime-local"
                {...register("scheduledAt")}
              />
            </div>
          )}

          {/* Summary */}
          <div className="rounded-xl bg-muted/50 border border-border p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-sm">Campaign Summary</p>
            <p>
              Audience:{" "}
              <strong className="text-foreground">
                {audienceCount !== null
                  ? `${audienceCount.toLocaleString()} client${audienceCount !== 1 ? "s" : ""}`
                  : "—"}
              </strong>
            </p>
            <p>
              Channel:{" "}
              <strong className="text-foreground">{watch("channel") || "—"}</strong>
            </p>
            <p>
              Status after save:{" "}
              <strong className="text-foreground">
                {scheduleMode === "later" ? "DRAFT (scheduled)" : "DRAFT"}
              </strong>
            </p>
          </div>
        </div>
      )}

      {serverError && (
        <p className="text-xs text-destructive mt-4">{serverError}</p>
      )}

      {/* Navigation */}
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

        {step < 2 ? (
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
              "Save Campaign"
            )}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

// ── CampaignDialog — default "Create Campaign" button ─────────────────────────

interface CampaignDialogProps {
  prefillMessage?: string;
}

export function CampaignDialog({ prefillMessage }: CampaignDialogProps = {}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" />
        }
      >
        <Plus className="w-4 h-4" />
        Create Campaign
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>
        <CampaignForm prefillMessage={prefillMessage} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// ── QuickCreateCampaignDialog — for the quick-create buttons ──────────────────

interface QuickCreateCampaignDialogProps {
  defaultType: CampaignTemplateKey;
  children: React.ReactNode;
}

export function QuickCreateCampaignDialog({
  defaultType,
  children,
}: QuickCreateCampaignDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="contents"
        aria-label={`Create ${defaultType} campaign`}
      >
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
          </DialogHeader>
          <CampaignForm
            defaultType={defaultType}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
