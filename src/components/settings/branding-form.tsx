"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  updateSalonInfo,
  updateSalonLogo,
  updateBusinessHoursGrid,
  updateSocialLinks,
} from "@/app/actions/settings";
import {
  Building2,
  Globe,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Clock,
  Receipt,
  Link2,
  Upload,
  X,
  Copy,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "JPY", label: "JPY — Japanese Yen" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AED", label: "AED — UAE Dirham" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const hh = String(h).padStart(2, "0");
  const label = `${hh}:${m}`;
  return { value: label, label };
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface DayHours {
  open: boolean;
  openTime: string;
  closeTime: string;
}

interface SocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
  googleMaps: string;
}

interface Props {
  salon: {
    name: string;
    tagline: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    country: string;
    timezone: string;
    currency: string;
    taxRate: number;
    invoicePrefix: string;
    invoiceFooter: string;
    requireTaxId: boolean;
    logo: string | null;
  };
  socialLinks: SocialLinks;
  businessHours: Record<string, DayHours>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BrandingForm({ salon, socialLinks: initialLinks, businessHours: initialHours }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Business Info state
  const [info, setInfo] = useState({
    name: salon.name,
    tagline: salon.tagline,
    phone: salon.phone,
    email: salon.email,
    address: salon.address,
    city: salon.city,
    country: salon.country,
    timezone: salon.timezone,
    currency: salon.currency,
  });

  // Invoice state
  const [invoice, setInvoice] = useState({
    taxRate: salon.taxRate,
    invoicePrefix: salon.invoicePrefix,
    invoiceFooter: salon.invoiceFooter,
    requireTaxId: salon.requireTaxId,
  });

  // Social links state
  const [links, setLinks] = useState<SocialLinks>(initialLinks);

  // Business hours state
  const [hours, setHours] = useState<Record<string, DayHours>>(() => {
    const defaults: Record<string, DayHours> = {};
    for (const day of DAYS) {
      defaults[day] = initialHours[day] ?? {
        open: day !== "Sunday",
        openTime: "09:00",
        closeTime: "19:00",
      };
    }
    return defaults;
  });

  // Logo state
  const [logoPreview, setLogoPreview] = useState<string | null>(salon.logo);
  const [logoUploading, startLogoTransition] = useTransition();

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleInfoSave() {
    startTransition(async () => {
      const result = await updateSalonInfo({ ...info });
      if (!result.success) {
        toast.error(result.error ?? "Failed to save");
        return;
      }
      toast.success("Business info saved");
      router.refresh();
    });
  }

  function handleInvoiceSave() {
    startTransition(async () => {
      const result = await updateSalonInfo({ ...invoice });
      if (!result.success) {
        toast.error(result.error ?? "Failed to save");
        return;
      }
      toast.success("Invoice settings saved");
      router.refresh();
    });
  }

  function handleSocialSave() {
    startTransition(async () => {
      const result = await updateSocialLinks(links);
      if (!result.success) {
        toast.error(result.error ?? "Failed to save");
        return;
      }
      toast.success("Social links saved");
      router.refresh();
    });
  }

  function handleHoursSave() {
    startTransition(async () => {
      const result = await updateBusinessHoursGrid(hours);
      if (!result.success) {
        toast.error(result.error ?? "Failed to save");
        return;
      }
      toast.success("Business hours saved");
      router.refresh();
    });
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      startLogoTransition(async () => {
        const result = await updateSalonLogo(base64);
        if (!result.success) {
          toast.error(result.error ?? "Failed to upload logo");
          return;
        }
        toast.success("Logo updated");
        router.refresh();
      });
    };
    reader.readAsDataURL(file);
  }

  function handleLogoRemove() {
    setLogoPreview(null);
    startLogoTransition(async () => {
      const result = await updateSalonLogo("");
      if (!result.success) {
        toast.error(result.error ?? "Failed to remove logo");
        return;
      }
      toast.success("Logo removed");
      router.refresh();
    });
  }

  function copyHoursToAll() {
    const monday = hours["Monday"];
    if (!monday) return;
    const next: Record<string, DayHours> = {};
    for (const day of DAYS) {
      next[day] = { ...monday };
    }
    setHours(next);
  }

  function copyMonFri() {
    const monday = hours["Monday"];
    if (!monday) return;
    const next = { ...hours };
    for (const day of ["Tuesday", "Wednesday", "Thursday", "Friday"] as const) {
      next[day] = { ...monday };
    }
    setHours(next);
  }

  function updateDay(day: string, field: keyof DayHours, value: boolean | string | null) {
    if (value === null) return;
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ── Business Info ── */}
      <SettingsSection
        title="Business Info"
        description="Your salon's identity and contact details"
        action={
          <Button size="sm" onClick={handleInfoSave} disabled={isPending}>
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Name + Tagline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="flex items-center gap-1.5 text-sm">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                Salon Name
              </Label>
              <Input
                id="name"
                value={info.name}
                onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))}
                placeholder="My Salon"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tagline" className="text-sm">Tagline</Label>
              <Input
                id="tagline"
                value={info.tagline}
                onChange={(e) => setInfo((p) => ({ ...p, tagline: e.target.value }))}
                placeholder="Where beauty meets care"
              />
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="flex items-center gap-1.5 text-sm">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={info.phone}
                onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 555 000 0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-sm">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={info.email}
                onChange={(e) => setInfo((p) => ({ ...p, email: e.target.value }))}
                placeholder="hello@mysalon.com"
              />
            </div>
          </div>

          {/* Address + City */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="address" className="flex items-center gap-1.5 text-sm">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Address
              </Label>
              <Input
                id="address"
                value={info.address}
                onChange={(e) => setInfo((p) => ({ ...p, address: e.target.value }))}
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-sm">City</Label>
              <Input
                id="city"
                value={info.city}
                onChange={(e) => setInfo((p) => ({ ...p, city: e.target.value }))}
                placeholder="New York"
              />
            </div>
          </div>

          {/* Country */}
          <div className="space-y-1.5">
            <Label htmlFor="country" className="flex items-center gap-1.5 text-sm">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              Country
            </Label>
            <Input
              id="country"
              value={info.country}
              onChange={(e) => setInfo((p) => ({ ...p, country: e.target.value }))}
              placeholder="US"
            />
          </div>

          {/* Timezone + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Timezone
              </Label>
              <Select value={info.timezone} onValueChange={(v) => setInfo((p) => ({ ...p, timezone: v ?? p.timezone }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                Currency
              </Label>
              <Select value={info.currency} onValueChange={(v) => setInfo((p) => ({ ...p, currency: v ?? p.currency }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ── Logo ── */}
      <SettingsSection
        title="Logo"
        description="Shown on invoices, the booking portal, and receipts. Max 2 MB."
      >
        <div className="flex items-center gap-6">
          {/* Preview */}
          <div className="w-24 h-24 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Salon logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoFile}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={logoUploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {logoUploading ? "Uploading…" : logoPreview ? "Replace Logo" : "Upload Logo"}
            </Button>
            {logoPreview && (
              <Button
                variant="ghost"
                size="sm"
                disabled={logoUploading}
                onClick={handleLogoRemove}
                className="flex items-center gap-2 text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
                Remove
              </Button>
            )}
            <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Max 2 MB.</p>
          </div>
        </div>
      </SettingsSection>

      {/* ── Invoice Settings ── */}
      <SettingsSection
        title="Invoice Settings"
        description="Prefix, tax rate, footer, and tax ID requirements"
        action={
          <Button size="sm" onClick={handleInvoiceSave} disabled={isPending}>
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="invoicePrefix" className="flex items-center gap-1.5 text-sm">
                <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                Invoice Prefix
              </Label>
              <Input
                id="invoicePrefix"
                value={invoice.invoicePrefix}
                onChange={(e) => setInvoice((p) => ({ ...p, invoicePrefix: e.target.value }))}
                placeholder="INV"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxRate" className="text-sm">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min={0}
                max={30}
                step={0.01}
                value={invoice.taxRate}
                onChange={(e) => setInvoice((p) => ({ ...p, taxRate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invoiceFooter" className="text-sm">Invoice Footer Message</Label>
            <Textarea
              id="invoiceFooter"
              value={invoice.invoiceFooter}
              onChange={(e) => setInvoice((p) => ({ ...p, invoiceFooter: e.target.value }))}
              placeholder="Thank you for your business! All prices are inclusive of applicable taxes."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Require Tax ID on invoice</p>
              <p className="text-xs text-muted-foreground mt-0.5">Print client tax / VAT ID on invoices</p>
            </div>
            <Switch
              checked={invoice.requireTaxId}
              onCheckedChange={(v) => setInvoice((p) => ({ ...p, requireTaxId: v }))}
            />
          </div>
        </div>
      </SettingsSection>

      {/* ── Social Links ── */}
      <SettingsSection
        title="Social Links"
        description="Displayed on your booking portal and client emails"
        action={
          <Button size="sm" onClick={handleSocialSave} disabled={isPending}>
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="instagram" className="flex items-center gap-1.5 text-sm">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              Instagram URL
            </Label>
            <Input
              id="instagram"
              type="url"
              value={links.instagram}
              onChange={(e) => setLinks((p) => ({ ...p, instagram: e.target.value }))}
              placeholder="https://instagram.com/mysalon"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="facebook" className="flex items-center gap-1.5 text-sm">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              Facebook URL
            </Label>
            <Input
              id="facebook"
              type="url"
              value={links.facebook}
              onChange={(e) => setLinks((p) => ({ ...p, facebook: e.target.value }))}
              placeholder="https://facebook.com/mysalon"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tiktok" className="flex items-center gap-1.5 text-sm">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              TikTok Handle
            </Label>
            <Input
              id="tiktok"
              value={links.tiktok}
              onChange={(e) => setLinks((p) => ({ ...p, tiktok: e.target.value }))}
              placeholder="@mysalon"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="googleMaps" className="flex items-center gap-1.5 text-sm">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              Google Maps Link
            </Label>
            <Input
              id="googleMaps"
              type="url"
              value={links.googleMaps}
              onChange={(e) => setLinks((p) => ({ ...p, googleMaps: e.target.value }))}
              placeholder="https://maps.google.com/?q=..."
            />
          </div>
        </div>
      </SettingsSection>

      {/* ── Business Hours ── */}
      <SettingsSection
        title="Business Hours"
        description="Set your weekly opening schedule"
        action={
          <Button size="sm" onClick={handleHoursSave} disabled={isPending}>
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Quick copy buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyHoursToAll}
              className="flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Mon to all days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyMonFri}
              className="flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Mon to Tue–Fri
            </Button>
          </div>

          {/* Day grid */}
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {DAYS.map((day) => {
              const d = hours[day];
              return (
                <div
                  key={day}
                  className={`flex items-center gap-3 px-4 py-3 ${d.open ? "bg-card" : "bg-muted/30"}`}
                >
                  {/* Day name */}
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-medium text-foreground">{day}</p>
                  </div>

                  {/* Open toggle */}
                  <Switch
                    checked={d.open}
                    onCheckedChange={(v) => updateDay(day, "open", v)}
                  />
                  <span className="text-xs text-muted-foreground w-12 shrink-0">
                    {d.open ? "Open" : "Closed"}
                  </span>

                  {/* Times */}
                  {d.open ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <Select
                        value={d.openTime}
                        onValueChange={(v) => updateDay(day, "openTime", v)}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-52">
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">to</span>
                      <Select
                        value={d.closeTime}
                        onValueChange={(v) => updateDay(day, "closeTime", v)}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-52">
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <p className="ml-auto text-xs text-muted-foreground italic">Closed all day</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
