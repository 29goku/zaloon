import { prisma } from "@/lib/prisma";
import { Palette, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BrandingForm } from "@/components/settings/branding-form";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const salon = await prisma.salon.findFirst();

  // Parse businessHours blob for __-prefixed keys
  let blob: Record<string, unknown> = {};
  if (salon?.businessHours) {
    try {
      const parsed = JSON.parse(salon.businessHours);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        blob = parsed as Record<string, unknown>;
      }
    } catch {
      // ignore
    }
  }

  const socialLinks = {
    instagram: typeof (blob.__socialLinks as Record<string, string> | undefined)?.instagram === "string"
      ? (blob.__socialLinks as Record<string, string>).instagram
      : "",
    facebook: typeof (blob.__socialLinks as Record<string, string> | undefined)?.facebook === "string"
      ? (blob.__socialLinks as Record<string, string>).facebook
      : "",
    tiktok: typeof (blob.__socialLinks as Record<string, string> | undefined)?.tiktok === "string"
      ? (blob.__socialLinks as Record<string, string>).tiktok
      : "",
    googleMaps: typeof (blob.__socialLinks as Record<string, string> | undefined)?.googleMaps === "string"
      ? (blob.__socialLinks as Record<string, string>).googleMaps
      : "",
  };

  const businessHours = (blob.__businessHours && typeof blob.__businessHours === "object" && !Array.isArray(blob.__businessHours))
    ? (blob.__businessHours as Record<string, { open: boolean; openTime: string; closeTime: string }>)
    : {};

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Palette className="w-7 h-7 text-primary" />
          Branding &amp; Business Info
        </h1>
        <p className="text-muted-foreground mt-1">
          Logo, contact details, business hours, invoice settings, and social links
        </p>
      </div>

      <BrandingForm
        salon={{
          name: salon?.name ?? "",
          tagline: typeof blob.__tagline === "string" ? blob.__tagline : "",
          phone: salon?.phone ?? "",
          email: salon?.email ?? "",
          address: salon?.address ?? "",
          city: salon?.city ?? "",
          country: salon?.country ?? "US",
          timezone: salon?.timezone ?? "America/New_York",
          currency: salon?.currency ?? "USD",
          taxRate: salon?.taxRate ?? 0,
          invoicePrefix: salon?.invoicePrefix ?? "INV",
          invoiceFooter: salon?.invoiceFooter ?? "",
          requireTaxId: blob.__requireTaxId === true,
          logo: salon?.logo ?? null,
        }}
        socialLinks={socialLinks}
        businessHours={businessHours}
      />
    </div>
  );
}
