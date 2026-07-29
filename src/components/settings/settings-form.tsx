"use client";

import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";

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
import { toast } from "@/components/ui/toast";
import {
  Building2,
  Globe,
  DollarSign,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  Receipt,
} from "lucide-react";

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "IN", label: "India" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Vancouver", label: "Vancouver (PT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AED", label: "AED — UAE Dirham" },
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
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().min(1, "Currency is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  // Business hours
  businessHours: z.array(businessHourEntrySchema),
  // Invoice settings
  invoicePrefix: z.string().min(1, "Prefix is required").max(20),
  taxRate: z.number().min(0, "Tax rate must be 0 or more").max(30, "Tax rate cannot exceed 30%"),
  invoiceFooter: z.string().max(500).optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SalonData {
  name: string;
  address?: string | null;
  city?: string | null;
  country: string;
  timezone: string;
  currency: string;
  phone?: string | null;
  email?: string | null;
  taxRate: number;
  invoicePrefix: string;
  invoiceFooter?: string | null;
  businessHours?: string | null;
}

interface SettingsFormProps {
  salon: SalonData;
}

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

export function SettingsForm({ salon }: SettingsFormProps) {
  const [saved, setSaved] = useState(false);

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
      address: salon.address ?? "",
      city: salon.city ?? "",
      country: salon.country ?? "US",
      timezone: salon.timezone ?? "UTC",
      currency: salon.currency ?? "USD",
      phone: salon.phone ?? "",
      email: salon.email ?? "",
      businessHours: parseBusinessHours(salon.businessHours),
      invoicePrefix: salon.invoicePrefix ?? "INV",
      taxRate: salon.taxRate ?? 0,
      invoiceFooter: salon.invoiceFooter ?? "",
    },
  });

  const { fields } = useFieldArray({ control, name: "businessHours" });
  const businessHoursValues = watch("businessHours");

  async function onSubmit(values: SettingsFormValues) {
    setSaved(false);
    const result = await updateSalonSettings({
      ...values,
      businessHours: JSON.stringify(values.businessHours),
      invoiceFooter: values.invoiceFooter || undefined,
    });
    if (result.success) {
      setSaved(true);
      toast.add({
        title: "Settings saved",
        description: "Your salon settings have been updated.",
        type: "success",
      });
      setTimeout(() => setSaved(false), 3000);
    } else {
      toast.add({
        title: "Failed to save",
        description: result.error,
        type: "error",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Salon Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Salon Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Salon Name
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

          <div>
            <Label htmlFor="address" className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Address
            </Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="123 Main Street"
              className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city" className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
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
              <Label htmlFor="country" className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Country
              </Label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
              {errors.country && (
                <p className="text-destructive text-xs mt-1">{errors.country.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Contact Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
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
              <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
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
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#F48E16]" />
            Regional Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Currency
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
            <div>
              <Label htmlFor="timezone" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Timezone
              </Label>
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="timezone"
                      className="mt-1 w-full bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary"
                    >
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.timezone && (
                <p className="text-destructive text-xs mt-1">{errors.timezone.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F48E16]" />
            Business Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fields.map((field, index) => {
              const isOpen = businessHoursValues?.[index]?.isOpen ?? false;
              return (
                <div
                  key={field.id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
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
                  <span className="text-sm font-medium w-24 shrink-0">
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
                    <span className="text-sm text-muted-foreground/50 italic flex-1">
                      Closed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Invoice Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoicePrefix" className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
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
                Invoice numbers will appear as {watch("invoicePrefix") || "INV"}-XXXXXX
              </p>
            </div>
            <div>
              <Label htmlFor="taxRate" className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
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
                    max={30}
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
              <p className="text-xs text-muted-foreground mt-1">
                0% = no tax shown on invoices
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="invoiceFooter" className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Invoice Footer Message
            </Label>
            <textarea
              id="invoiceFooter"
              {...register("invoiceFooter")}
              rows={3}
              placeholder="Thank you for choosing us! Refunds within 7 days with receipt."
              className="mt-1 w-full bg-secondary rounded-xl border-none px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            {errors.invoiceFooter && (
              <p className="text-destructive text-xs mt-1">{errors.invoiceFooter.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground px-6 py-3 h-auto rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-500 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Saved successfully
          </span>
        )}
      </div>
    </form>
  );
}
