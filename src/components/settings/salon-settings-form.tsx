"use client";

import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { updateSalonSettings } from "@/app/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  Building2,
  Globe,
  DollarSign,
  Clock,
  Phone,
  Mail,
  Receipt,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "IN", label: "India" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
];

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DEFAULT_HOURS = DAYS.map((day) => ({
  day,
  isOpen: day !== "Sunday",
  openTime: "09:00",
  closeTime: "19:00",
}));

// ── Types ────────────────────────────────────────────────────────────────────

export type BusinessHourEntry = {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

const businessHourEntrySchema = z.object({
  day: z.string(),
  isOpen: z.boolean(),
  openTime: z.string(),
  closeTime: z.string(),
});

const settingsSchema = z.object({
  name: z.string().min(1, "Salon name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  taxRate: z.number().min(0, "Tax rate must be 0 or more").max(100, "Tax rate cannot exceed 100%"),
  invoicePrefix: z.string().min(1, "Prefix is required").max(20),
  businessHours: z.array(businessHourEntrySchema),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export interface SalonData {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  currency: string;
  taxRate: number;
  invoicePrefix: string;
  businessHours?: string | null;
}

interface SalonSettingsFormProps {
  salon: SalonData;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseBusinessHours(raw: string | null | undefined): BusinessHourEntry[] {
  if (!raw) return DEFAULT_HOURS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 7) return parsed as BusinessHourEntry[];
    return DEFAULT_HOURS;
  } catch {
    return DEFAULT_HOURS;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function SalonSettingsForm({ salon }: SalonSettingsFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: salon.name ?? "",
      phone: salon.phone ?? "",
      email: salon.email ?? "",
      address: salon.address ?? "",
      city: salon.city ?? "",
      country: salon.country ?? "US",
      currency: salon.currency ?? "USD",
      taxRate: salon.taxRate ?? 0,
      invoicePrefix: salon.invoicePrefix ?? "INV",
      businessHours: parseBusinessHours(salon.businessHours),
    },
  });

  const { fields } = useFieldArray({ control, name: "businessHours" });
  const businessHoursValues = watch("businessHours");
  const invoicePrefixValue = watch("invoicePrefix");

  async function onSubmit(values: SettingsFormValues) {
    const result = await updateSalonSettings({
      ...values,
      businessHours: JSON.stringify(values.businessHours),
    });

    if (result.success) {
      toast.success("Settings saved", "Your salon settings have been updated.");
      router.refresh();
    } else {
      toast.error("Failed to save", result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Basic Information ─────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Salon name */}
          <div>
            <Label
              htmlFor="name"
              className="text-xs text-muted-foreground uppercase tracking-wide mb-1"
            >
              Salon Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="My Salon"
              className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary"
            />
            {errors.name && (
              <p className="text-destructive text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="phone"
                className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"
              >
                <Phone className="w-3 h-3" /> Phone
              </Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+1 555 000 0000"
                className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary"
              />
            </div>
            <div>
              <Label
                htmlFor="email"
                className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"
              >
                <Mail className="w-3 h-3" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="hello@mysalon.com"
                className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary"
              />
              {errors.email && (
                <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <Label
              htmlFor="address"
              className="text-xs text-muted-foreground uppercase tracking-wide mb-1"
            >
              Address
            </Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="123 Main Street"
              className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary"
            />
          </div>

          {/* City + Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="city"
                className="text-xs text-muted-foreground uppercase tracking-wide mb-1"
              >
                City
              </Label>
              <Input
                id="city"
                {...register("city")}
                placeholder="New York"
                className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary"
              />
            </div>
            <div>
              <Label
                htmlFor="country"
                className="text-xs text-muted-foreground uppercase tracking-wide mb-1"
              >
                Country
              </Label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="country"
                      className="mt-1 w-full bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary"
                    >
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Financial Settings ────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Financial Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Currency */}
            <div>
              <Label
                htmlFor="currency"
                className="text-xs text-muted-foreground uppercase tracking-wide mb-1"
              >
                Currency
              </Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="currency"
                      className="mt-1 w-full bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary"
                    >
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currency && (
                <p className="text-destructive text-xs mt-1">{errors.currency.message}</p>
              )}
            </div>

            {/* Tax Rate */}
            <div>
              <Label
                htmlFor="taxRate"
                className="text-xs text-muted-foreground uppercase tracking-wide mb-1"
              >
                Tax Rate (%)
              </Label>
              <Controller
                name="taxRate"
                control={control}
                render={({ field }) => (
                  <Input
                    id="taxRate"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={field.value}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary"
                  />
                )}
              />
              {errors.taxRate && (
                <p className="text-destructive text-xs mt-1">{errors.taxRate.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">0% = no tax on invoices</p>
            </div>

            {/* Invoice Prefix */}
            <div>
              <Label
                htmlFor="invoicePrefix"
                className="text-xs text-muted-foreground uppercase tracking-wide mb-1"
              >
                Invoice Prefix
              </Label>
              <Input
                id="invoicePrefix"
                {...register("invoicePrefix")}
                placeholder="INV"
                className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary"
              />
              {errors.invoicePrefix && (
                <p className="text-destructive text-xs mt-1">{errors.invoicePrefix.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                e.g. {invoicePrefixValue || "INV"}-000001
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Business Hours ────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Business Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {fields.map((field, index) => {
              const isOpen = businessHoursValues?.[index]?.isOpen ?? false;
              return (
                <div
                  key={field.id}
                  className="flex items-center gap-4 py-2.5 border-b border-border last:border-0"
                >
                  {/* Toggle */}
                  <Controller
                    name={`businessHours.${index}.isOpen`}
                    control={control}
                    render={({ field: toggleField }) => (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={toggleField.value}
                        onClick={() => toggleField.onChange(!toggleField.value)}
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          toggleField.value ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${
                            toggleField.value ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    )}
                  />

                  {/* Day name */}
                  <span className="text-sm font-medium w-24 shrink-0 text-foreground">
                    {field.day}
                  </span>

                  {/* Time inputs or Closed */}
                  {isOpen ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        {...register(`businessHours.${index}.openTime`)}
                        className="bg-secondary rounded-lg px-3 py-1.5 text-sm text-foreground border-none focus:outline-none focus:ring-2 focus:ring-primary w-28"
                      />
                      <span className="text-muted-foreground/50 text-sm">—</span>
                      <input
                        type="time"
                        {...register(`businessHours.${index}.closeTime`)}
                        className="bg-secondary rounded-lg px-3 py-1.5 text-sm text-foreground border-none focus:outline-none focus:ring-2 focus:ring-primary w-28"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/50 italic flex-1">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pb-8">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground px-6 py-3 h-auto rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
