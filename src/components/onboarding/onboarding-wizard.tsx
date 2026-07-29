"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Scissors,
  Users,
  Rocket,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Check,
  ChevronRight,
  ImageIcon,
  ArrowRight,
  CalendarDays,
  Clock,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  updateSalonProfile,
  bulkCreateServices,
  createOnboardingStaff,
  saveStaffAvailability,
} from "@/app/actions/onboarding";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SalonData {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
}

interface StaffMember {
  id: string;
  name: string;
  phone?: string;
  availabilitySet: boolean;
}

interface AddedService {
  name: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: "hair_salon", label: "Hair Salon" },
  { value: "nail_salon", label: "Nail Salon" },
  { value: "spa", label: "Spa" },
  { value: "barbershop", label: "Barbershop" },
  { value: "beauty_salon", label: "Beauty Salon" },
] as const;

type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

const PRESET_SERVICES: Record<BusinessType, { name: string; price: number; durationMins: number }[]> = {
  hair_salon: [
    { name: "Haircut", price: 35, durationMins: 45 },
    { name: "Color", price: 80, durationMins: 90 },
    { name: "Highlights", price: 100, durationMins: 120 },
    { name: "Blowout", price: 45, durationMins: 45 },
    { name: "Treatment", price: 60, durationMins: 60 },
  ],
  nail_salon: [
    { name: "Manicure", price: 25, durationMins: 30 },
    { name: "Pedicure", price: 35, durationMins: 45 },
    { name: "Gel Nails", price: 50, durationMins: 60 },
    { name: "Nail Art", price: 65, durationMins: 75 },
  ],
  spa: [
    { name: "Facial", price: 75, durationMins: 60 },
    { name: "Massage", price: 90, durationMins: 60 },
    { name: "Body Wrap", price: 110, durationMins: 90 },
    { name: "Waxing", price: 40, durationMins: 30 },
  ],
  barbershop: [
    { name: "Haircut", price: 25, durationMins: 30 },
    { name: "Beard Trim", price: 20, durationMins: 20 },
    { name: "Shave", price: 30, durationMins: 30 },
    { name: "Hair & Beard", price: 40, durationMins: 50 },
  ],
  beauty_salon: [
    { name: "Haircut & Style", price: 55, durationMins: 60 },
    { name: "Makeup", price: 70, durationMins: 60 },
    { name: "Eyebrows", price: 25, durationMins: 30 },
    { name: "Facial", price: 65, durationMins: 60 },
    { name: "Waxing", price: 40, durationMins: 30 },
  ],
};

const DAYS = [
  { label: "Monday", dayOfWeek: 1 },
  { label: "Tuesday", dayOfWeek: 2 },
  { label: "Wednesday", dayOfWeek: 3 },
  { label: "Thursday", dayOfWeek: 4 },
  { label: "Friday", dayOfWeek: 5 },
  { label: "Saturday", dayOfWeek: 6 },
  { label: "Sunday", dayOfWeek: 0 },
];

// ── Stepper ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Salon Profile", icon: Building2 },
  { id: 2, label: "Services", icon: Scissors },
  { id: 3, label: "Staff", icon: Users },
  { id: 4, label: "Go Live", icon: Rocket },
];

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isLast = index === STEPS.length - 1;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-secondary border-border text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isCurrent ? "text-primary" : isCompleted ? "text-primary/70" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {!isLast && (
              <div
                className={`w-16 h-0.5 mb-5 mx-2 transition-all duration-300 ${
                  currentStep > step.id ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Salon Profile ──────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, "Salon name is required"),
  slug: z
    .string()
    .min(1, "URL slug is required")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  businessType: z.string().min(1, "Please select your business type"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

interface Step1Props {
  salon: SalonData;
  onComplete: (businessType: BusinessType, salonName: string, slug: string) => void;
}

function Step1SalonProfile({ salon, onComplete }: Step1Props) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: salon.name ?? "",
      slug: salon.slug ?? "",
      phone: salon.phone ?? "",
      address: salon.address ?? "",
      city: salon.city ?? "",
      businessType: "",
    },
  });

  // Auto-generate slug from name
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const generated = slugify(e.target.value);
      setValue("slug", generated, { shouldValidate: false });
    },
    [setValue]
  );

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function onSubmit(values: ProfileFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await updateSalonProfile({
        name: values.name,
        slug: values.slug,
        phone: values.phone,
        address: values.address,
        city: values.city,
        businessType: values.businessType,
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      onComplete(values.businessType as BusinessType, values.name, values.slug);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Tell us about your salon</h2>
        <p className="text-muted-foreground text-sm mt-1">
          This information will be shown on your booking page.
        </p>
      </div>

      {/* Logo upload */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
          Logo (optional)
        </Label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors overflow-hidden ${
              logoPreview
                ? "border-primary/30"
                : "border-border hover:border-primary/50 bg-secondary"
            }`}
          >
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </button>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Upload logo
            </button>
            <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG up to 2MB</p>
            {logoPreview && (
              <button
                type="button"
                onClick={() => {
                  setLogoPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-xs text-destructive hover:text-destructive/80 mt-0.5 block"
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>
      </div>

      {/* Business Type */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
          Business Type <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BUSINESS_TYPES.map((type) => (
            <Controller
              key={type.value}
              name="businessType"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(type.value)}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all text-left ${
                    field.value === type.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-foreground hover:border-primary/40"
                  }`}
                >
                  {type.label}
                </button>
              )}
            />
          ))}
        </div>
        {errors.businessType && (
          <p className="text-destructive text-xs mt-1">{errors.businessType.message}</p>
        )}
      </div>

      {/* Salon Name */}
      <div>
        <Label htmlFor="salon-name" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
          Salon Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="salon-name"
          {...register("name", { onChange: handleNameChange })}
          placeholder="e.g. Glamour Studio"
          className="bg-secondary rounded-xl border-none h-auto px-4 py-3 text-sm"
        />
        {errors.name && (
          <p className="text-destructive text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Slug */}
      <div>
        <Label htmlFor="salon-slug" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
          Booking URL Slug <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-0 rounded-xl bg-secondary overflow-hidden border border-transparent focus-within:border-primary/40">
          <span className="pl-4 pr-1 text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
            yoursite.com/book/
          </span>
          <Input
            id="salon-slug"
            {...register("slug")}
            placeholder="glamour-studio"
            className="bg-transparent border-none rounded-none px-1 py-3 h-auto text-sm focus-visible:ring-0 min-w-0"
          />
        </div>
        {errors.slug && (
          <p className="text-destructive text-xs mt-1">{errors.slug.message}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <Label htmlFor="salon-phone" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
          Phone
        </Label>
        <Input
          id="salon-phone"
          type="tel"
          {...register("phone")}
          placeholder="+1 555 000 0000"
          className="bg-secondary rounded-xl border-none h-auto px-4 py-3 text-sm"
        />
      </div>

      {/* Address + City */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="salon-address" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
            Address
          </Label>
          <Input
            id="salon-address"
            {...register("address")}
            placeholder="123 Main Street"
            className="bg-secondary rounded-xl border-none h-auto px-4 py-3 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="salon-city" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
            City
          </Label>
          <Input
            id="salon-city"
            {...register("city")}
            placeholder="New York"
            className="bg-secondary rounded-xl border-none h-auto px-4 py-3 text-sm"
          />
        </div>
      </div>

      {serverError && (
        <p className="text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-xl">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full h-auto py-3 rounded-xl text-sm font-semibold">
        {isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
        ) : (
          <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>
        )}
      </Button>
    </form>
  );
}

// ── Step 2: Services ───────────────────────────────────────────────────────

interface Step2Props {
  businessType: BusinessType;
  onComplete: (services: AddedService[]) => void;
  onBack: () => void;
}

function Step2Services({ businessType, onComplete, onBack }: Step2Props) {
  const presets = PRESET_SERVICES[businessType] ?? [];
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());
  const [customName, setCustomName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const categoryName = BUSINESS_TYPES.find((b) => b.value === businessType)?.label ?? "Services";

  function togglePreset(name: string) {
    setAddedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function addAll() {
    setAddedNames(new Set(presets.map((p) => p.name)));
  }

  function addCustom() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    setAddedNames((prev) => new Set(prev).add(trimmed));
    setCustomName("");
  }

  function removeAdded(name: string) {
    setAddedNames((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  // Names that are custom (not in presets)
  const customServices = [...addedNames].filter(
    (n) => !presets.some((p) => p.name === n)
  );

  function handleContinue() {
    if (addedNames.size === 0) {
      onComplete([]);
      return;
    }

    setServerError(null);
    startTransition(async () => {
      const services = [...addedNames].map((name) => {
        const preset = presets.find((p) => p.name === name);
        return preset ?? { name, price: 0, durationMins: 30 };
      });

      const result = await bulkCreateServices({
        categoryName,
        services,
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      onComplete(services.map((s) => ({ name: s.name })));
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Add your services</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Here are popular services for a{" "}
          <span className="font-medium text-foreground">
            {BUSINESS_TYPES.find((b) => b.value === businessType)?.label}
          </span>
          . Select the ones you offer.
        </p>
      </div>

      {/* Preset service chips */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Suggested services</span>
          <button
            type="button"
            onClick={addAll}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Add all
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const isAdded = addedNames.has(preset.name);
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => togglePreset(preset.name)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                  isAdded
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-secondary border-border text-foreground hover:border-primary/40"
                }`}
              >
                {isAdded && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                {preset.name}
                <span className="text-xs opacity-60 ml-1">${preset.price}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom service input */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
          Add a custom service
        </Label>
        <div className="flex gap-2">
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="e.g. Bridal Package"
            className="bg-secondary rounded-xl border-none h-auto px-4 py-3 text-sm flex-1"
          />
          <Button
            type="button"
            onClick={addCustom}
            variant="outline"
            size="sm"
            className="px-3 h-auto py-3 rounded-xl"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Selected services summary */}
      {addedNames.size > 0 && (
        <div className="bg-secondary/60 rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            {addedNames.size} service{addedNames.size !== 1 ? "s" : ""} selected
          </p>
          <div className="space-y-2">
            {[...addedNames].map((name) => {
              const isCustom = customServices.includes(name);
              return (
                <div
                  key={name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-foreground">{name}</span>
                    {isCustom && (
                      <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">
                        custom
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAdded(name)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {serverError && (
        <p className="text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-xl">
          {serverError}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="px-5 h-auto py-3 rounded-xl text-sm"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleContinue}
          disabled={isPending}
          className="flex-1 h-auto py-3 rounded-xl text-sm font-semibold"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
          ) : addedNames.size === 0 ? (
            <>Skip for now <ChevronRight className="w-4 h-4 ml-1" /></>
          ) : (
            <>Continue with {addedNames.size} service{addedNames.size !== 1 ? "s" : ""} <ChevronRight className="w-4 h-4 ml-1" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Staff ──────────────────────────────────────────────────────────

interface DayShiftState {
  active: boolean;
  startTime: string;
  endTime: string;
}

interface AvailabilityEditorProps {
  staffId: string;
  staffName: string;
  onDone: () => void;
}

function AvailabilityEditor({ staffId, staffName, onDone }: AvailabilityEditorProps) {
  const [days, setDays] = useState<Record<number, DayShiftState>>(() => {
    const state: Record<number, DayShiftState> = {};
    for (const d of DAYS) {
      state[d.dayOfWeek] = {
        active: d.dayOfWeek !== 0, // all days except Sunday on by default
        startTime: "09:00",
        endTime: "18:00",
      };
    }
    return state;
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setDayField<K extends keyof DayShiftState>(
    dayOfWeek: number,
    field: K,
    value: DayShiftState[K]
  ) {
    setDays((prev) => ({
      ...prev,
      [dayOfWeek]: { ...prev[dayOfWeek], [field]: value },
    }));
  }

  function handleSave() {
    const shifts = DAYS.filter((d) => days[d.dayOfWeek]?.active).map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: days[d.dayOfWeek].startTime,
      endTime: days[d.dayOfWeek].endTime,
    }));

    setError(null);
    startTransition(async () => {
      const result = await saveStaffAvailability(staffId, shifts);
      if (result.success) {
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mt-4 bg-secondary/40 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        Set availability for {staffName}
      </p>
      <div className="space-y-2">
        {DAYS.map((day) => {
          const state = days[day.dayOfWeek];
          return (
            <div
              key={day.dayOfWeek}
              className={`rounded-xl border px-3 py-2.5 transition-colors ${
                state.active ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-[100px]">
                  <Switch
                    checked={state.active}
                    onCheckedChange={(checked) => setDayField(day.dayOfWeek, "active", checked)}
                    disabled={isPending}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      state.active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
                {state.active ? (
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <Input
                      type="time"
                      value={state.startTime}
                      onChange={(e) => setDayField(day.dayOfWeek, "startTime", e.target.value)}
                      disabled={isPending}
                      className="w-28 text-xs h-7 bg-card border-border"
                    />
                    <span className="text-muted-foreground text-xs">–</span>
                    <Input
                      type="time"
                      value={state.endTime}
                      onChange={(e) => setDayField(day.dayOfWeek, "endTime", e.target.value)}
                      disabled={isPending}
                      className="w-28 text-xs h-7 bg-card border-border"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground ml-auto">Day off</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={isPending} size="sm" className="rounded-xl">
          {isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : "Save Availability"}
        </Button>
        <Button onClick={onDone} variant="ghost" size="sm" className="rounded-xl text-muted-foreground">
          Skip
        </Button>
      </div>
    </div>
  );
}

interface Step3Props {
  onComplete: (staffList: StaffMember[]) => void;
  onBack: () => void;
}

function Step3Staff({ onComplete, onBack }: Step3Props) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [expandedAvailability, setExpandedAvailability] = useState<string | null>(null);

  function handleAddStaff() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setServerError(null);
    startTransition(async () => {
      const result = await createOnboardingStaff({ name: trimmed, phone: phone.trim() || undefined });
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      setStaffList((prev) => [
        ...prev,
        { id: result.id, name: trimmed, phone: phone.trim() || undefined, availabilitySet: false },
      ]);
      setName("");
      setPhone("");
      // Auto-expand availability for the new staff
      setExpandedAvailability(result.id);
    });
  }

  function handleAvailabilityDone(staffId: string) {
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, availabilitySet: true } : s))
    );
    setExpandedAvailability(null);
  }

  function removeStaff(staffId: string) {
    setStaffList((prev) => prev.filter((s) => s.id !== staffId));
    if (expandedAvailability === staffId) setExpandedAvailability(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Set up your team</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Add your stylists and therapists. You can set their availability here or do it later.
        </p>
      </div>

      {/* Add staff form */}
      <div className="bg-secondary/40 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Add a team member</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="staff-name" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
              Name
            </Label>
            <Input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddStaff();
                }
              }}
              placeholder="e.g. Priya Sharma"
              className="bg-card rounded-xl border-border h-auto px-4 py-3 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="staff-phone" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
              Phone (optional)
            </Label>
            <Input
              id="staff-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className="bg-card rounded-xl border-border h-auto px-4 py-3 text-sm"
            />
          </div>
        </div>
        <Button
          type="button"
          onClick={handleAddStaff}
          disabled={isPending || !name.trim()}
          size="sm"
          className="rounded-xl"
        >
          {isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Adding…</> : <><Plus className="w-3.5 h-3.5 mr-1.5" />Add Member</>}
        </Button>
        {serverError && (
          <p className="text-xs text-destructive">{serverError}</p>
        )}
      </div>

      {/* Staff list */}
      {staffList.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {staffList.length} team member{staffList.length !== 1 ? "s" : ""} added
          </p>
          {staffList.map((staff) => (
            <div key={staff.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {staff.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{staff.name}</p>
                    {staff.phone && (
                      <p className="text-xs text-muted-foreground">{staff.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {staff.availabilitySet ? (
                    <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-lg font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Availability set
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAvailability(
                          expandedAvailability === staff.id ? null : staff.id
                        )
                      }
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary border border-border px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <CalendarDays className="w-3 h-3" />
                      Set availability
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeStaff(staff.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {expandedAvailability === staff.id && (
                <div className="px-4 pb-4">
                  <AvailabilityEditor
                    staffId={staff.id}
                    staffName={staff.name}
                    onDone={() => handleAvailabilityDone(staff.id)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="px-5 h-auto py-3 rounded-xl text-sm">
          Back
        </Button>
        <Button
          type="button"
          onClick={() => onComplete(staffList)}
          className="flex-1 h-auto py-3 rounded-xl text-sm font-semibold"
        >
          {staffList.length === 0 ? (
            <>Skip for now <ChevronRight className="w-4 h-4 ml-1" /></>
          ) : (
            <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Step 4: Go Live ────────────────────────────────────────────────────────

interface Step4Props {
  salonName: string;
  slug: string;
  serviceCount: number;
  staffCount: number;
}

function Step4GoLive({ salonName, slug, serviceCount, staffCount }: Step4Props) {
  const [copied, setCopied] = useState(false);
  const bookingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/book/${slug}`
      : `/book/${slug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Confetti animation */}
      <ConfettiEffect />

      <div className="text-center pt-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">You&apos;re all set!</h2>
        <p className="text-muted-foreground text-sm mt-2">
          {salonName} is ready to take bookings.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/60 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{serviceCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Service{serviceCount !== 1 ? "s" : ""} added
          </p>
        </div>
        <div className="bg-secondary/60 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{staffCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Staff member{staffCount !== 1 ? "s" : ""} added
          </p>
        </div>
      </div>

      {/* Booking link preview */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Your booking link
        </p>
        <div className="flex items-center gap-2 bg-secondary rounded-xl p-3 border border-border/50">
          <span className="text-sm font-mono text-foreground flex-1 truncate">
            {bookingUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick actions
        </p>
        <Link
          href="/dashboard"
          className="flex items-center justify-between w-full bg-primary text-primary-foreground px-4 py-3.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <span>View Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/dashboard/appointments"
          className="flex items-center justify-between w-full border border-border bg-card px-4 py-3.5 rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
        >
          <span>Make first booking</span>
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
        </Link>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-between w-full border border-border bg-card px-4 py-3.5 rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
        >
          <span>{copied ? "Copied!" : "Copy booking link"}</span>
          {copied ? (
            <Check className="w-4 h-4 text-primary" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Confetti Effect ────────────────────────────────────────────────────────

// Particles are computed once at module load so Math.random() is not called
// inside render, which satisfies the react-hooks/purity rule.
const CONFETTI_PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  color: ["#3a8a2a", "#d97c10", "#d91557", "#4a9e4a", "#B4EFA5"][Math.floor(Math.random() * 5)],
  size: `${4 + Math.random() * 6}px`,
  delay: `${Math.random() * 1.5}s`,
  duration: `${1.5 + Math.random() * 1.5}s`,
  rotation: `${Math.random() * 720 - 360}deg`,
}));

function ConfettiEffect() {
  const particles = CONFETTI_PARTICLES;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50" aria-hidden="true">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(var(--r)); opacity: 0; }
        }
        .confetti-particle {
          position: absolute;
          top: 0;
          border-radius: 2px;
          animation: confetti-fall var(--d) var(--delay) ease-in both;
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            ["--r" as string]: p.rotation,
            ["--d" as string]: p.duration,
            ["--delay" as string]: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  salon: SalonData;
  initialServiceCount: number;
  initialStaffCount: number;
}

export function OnboardingWizard({
  salon,
  initialServiceCount,
  initialStaffCount,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<BusinessType>("hair_salon");
  const [salonName, setSalonName] = useState(salon.name);
  const [slug, setSlug] = useState(salon.slug);
  const [addedServices, setAddedServices] = useState<AddedService[]>([]);
  const [addedStaff, setAddedStaff] = useState<StaffMember[]>([]);

  function handleStep1Complete(bt: BusinessType, name: string, newSlug: string) {
    setBusinessType(bt);
    setSalonName(name);
    setSlug(newSlug);
    setStep(2);
  }

  function handleStep2Complete(services: AddedService[]) {
    setAddedServices(services);
    setStep(3);
  }

  function handleStep3Complete(staff: StaffMember[]) {
    setAddedStaff(staff);
    setStep(4);
  }

  return (
    <div className="min-h-screen p-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">
          Getting started
        </p>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome to Zaloon
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Let&apos;s get your salon ready in just 4 steps.
        </p>
      </div>

      {/* Stepper */}
      <Stepper currentStep={step} />

      {/* Step content */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        {step === 1 && (
          <Step1SalonProfile salon={salon} onComplete={handleStep1Complete} />
        )}
        {step === 2 && (
          <Step2Services
            businessType={businessType}
            onComplete={handleStep2Complete}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3Staff
            onComplete={handleStep3Complete}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Step4GoLive
            salonName={salonName}
            slug={slug}
            serviceCount={initialServiceCount + addedServices.length}
            staffCount={initialStaffCount + addedStaff.length}
          />
        )}
      </div>

      {/* Skip link (steps 1-3 only) */}
      {step < 4 && (
        <div className="mt-6 text-center">
          <a
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Skip setup and go to dashboard
          </a>
        </div>
      )}
    </div>
  );
}
