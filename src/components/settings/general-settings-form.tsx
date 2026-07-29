"use client";

import { useState, useTransition } from "react";
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
  Phone,
  Mail,
  MapPin,
  Clock,
  Receipt,
  FileText,
  AlertTriangle,
  Link as LinkIcon,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "IN", label: "India" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "NZ", label: "New Zealand" },
  { value: "ZA", label: "South Africa" },
  { value: "NG", label: "Nigeria" },
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
  { value: "NZD", label: "NZD — New Zealand Dollar" },
  { value: "ZAR", label: "ZAR — South African Rand" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC — Coordinated Universal Time" },
  { value: "America/New_York", label: "America/New_York — Eastern Time" },
  { value: "America/Chicago", label: "America/Chicago — Central Time" },
  { value: "America/Denver", label: "America/Denver — Mountain Time" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles — Pacific Time" },
  { value: "America/Toronto", label: "America/Toronto — Eastern Time (Canada)" },
  { value: "America/Vancouver", label: "America/Vancouver — Pacific Time (Canada)" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo — Brazil Time" },
  { value: "Europe/London", label: "Europe/London — GMT / BST" },
  { value: "Europe/Paris", label: "Europe/Paris — Central European Time" },
  { value: "Europe/Berlin", label: "Europe/Berlin — Central European Time" },
  { value: "Europe/Moscow", label: "Europe/Moscow — Moscow Time" },
  { value: "Asia/Dubai", label: "Asia/Dubai — Gulf Standard Time" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata — India Standard Time" },
  { value: "Asia/Singapore", label: "Asia/Singapore — Singapore Time" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo — Japan Standard Time" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai — China Standard Time" },
  { value: "Australia/Sydney", label: "Australia/Sydney — AEST / AEDT" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne — AEST / AEDT" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland — New Zealand Time" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg — South Africa Standard Time" },
  { value: "Africa/Lagos", label: "Africa/Lagos — West Africa Time" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface GeneralSalonData {
  name: string;
  slug: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  timezone?: string | null;
  currency: string;
  taxRate: number;
  invoicePrefix: string;
  invoiceFooter?: string | null;
}

interface GeneralSettingsFormProps {
  salon: GeneralSalonData;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GeneralSettingsForm({ salon }: GeneralSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(salon.name);
  const [phone, setPhone] = useState(salon.phone ?? "");
  const [email, setEmail] = useState(salon.email ?? "");
  const [address, setAddress] = useState(salon.address ?? "");
  const [city, setCity] = useState(salon.city ?? "");
  const [country, setCountry] = useState(salon.country ?? "US");
  const [timezone, setTimezone] = useState(salon.timezone ?? "UTC");
  const [currency, setCurrency] = useState(salon.currency ?? "USD");
  const [taxRate, setTaxRate] = useState(String(salon.taxRate ?? 0));
  const [invoicePrefix, setInvoicePrefix] = useState(salon.invoicePrefix ?? "INV");
  const [invoiceFooter, setInvoiceFooter] = useState(salon.invoiceFooter ?? "");

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  function validate() {
    let ok = true;
    if (!name.trim()) {
      setNameError("Salon name is required");
      ok = false;
    } else {
      setNameError("");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Invalid email address");
      ok = false;
    } else {
      setEmailError("");
    }
    return ok;
  }

  function handleSave() {
    if (!validate()) return;
    startTransition(async () => {
      const result = await updateSalonSettings({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country,
        timezone,
        currency,
        taxRate: parseFloat(taxRate) || 0,
        invoicePrefix: invoicePrefix.trim() || "INV",
        invoiceFooter: invoiceFooter.trim() || undefined,
      });

      if (result.success) {
        toast.success("Settings saved", "Your salon settings have been updated.");
        router.refresh();
      } else {
        toast.error("Failed to save", result.error);
      }
    });
  }

  return (
    <div className="space-y-6">

      {/* ── Salon Profile ─────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Salon Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Salon Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Salon"
              className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm"
            />
            {nameError && (
              <p className="text-destructive text-xs mt-1">{nameError}</p>
            )}
          </div>

          {/* Slug — read-only with note */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              Booking URL Slug
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-0 rounded-xl bg-secondary border border-border overflow-hidden">
                <span className="px-3 py-2.5 text-xs text-muted-foreground border-r border-border shrink-0 select-none">
                  /book/
                </span>
                <span className="px-3 py-2.5 text-sm font-mono text-foreground select-all">
                  {salon.slug}
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-start gap-1.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                The slug is set during onboarding and affects your public booking link. Contact support to change it.
              </p>
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@mysalon.com"
                className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm"
              />
              {emailError && (
                <p className="text-destructive text-xs mt-1">{emailError}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Address
            </Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street"
              className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm"
            />
          </div>

          {/* City + Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                City
              </Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New York"
                className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Globe className="w-3 h-3" /> Country
              </Label>
              <Select value={country} onValueChange={(v) => { if (v) setCountry(v); }}>
                <SelectTrigger className="mt-1 w-full bg-secondary rounded-xl border-none h-auto py-3 text-sm">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Regional Settings ─────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Regional Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timezone */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Timezone
            </Label>
            <Select value={timezone} onValueChange={(v) => { if (v) setTimezone(v); }}>
              <SelectTrigger className="mt-1 w-full bg-secondary rounded-xl border-none h-auto py-3 text-sm">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Used for appointment scheduling and report dates
            </p>
          </div>

          {/* Currency */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Currency
            </Label>
            <Select value={currency} onValueChange={(v) => { if (v) setCurrency(v); }}>
              <SelectTrigger className="mt-1 w-full bg-secondary rounded-xl border-none h-auto py-3 text-sm">
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
          </div>
        </CardContent>
      </Card>

      {/* ── Invoice Settings ──────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Invoice Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invoice prefix + Tax rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Invoice Prefix
              </Label>
              <Input
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="INV"
                maxLength={20}
                className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                e.g. {invoicePrefix || "INV"}-000001
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Tax Rate (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="0"
                className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">0% = no tax on invoices</p>
            </div>
          </div>

          {/* Invoice footer */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <FileText className="w-3 h-3" /> Invoice Footer
            </Label>
            <textarea
              value={invoiceFooter}
              onChange={(e) => setInvoiceFooter(e.target.value)}
              placeholder="Thank you for your visit! Refunds are not available after 24 hours."
              rows={3}
              maxLength={500}
              className="mt-1 w-full bg-secondary rounded-xl border-none px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Shown at the bottom of all receipts and invoices ({invoiceFooter.length}/500)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Save ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-4 pb-8">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-primary text-primary-foreground px-6 py-3 h-auto rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
