import { prisma } from "@/lib/prisma";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const salon = await prisma.salon.findFirst();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="w-7 h-7 text-primary" />
          General Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Salon profile, contact info, regional settings, and invoice configuration
        </p>
      </div>

      <GeneralSettingsForm
        salon={{
          name: salon?.name ?? "",
          slug: salon?.slug ?? "",
          phone: salon?.phone ?? null,
          email: salon?.email ?? null,
          address: salon?.address ?? null,
          city: salon?.city ?? null,
          country: salon?.country ?? "US",
          timezone: salon?.timezone ?? "UTC",
          currency: salon?.currency ?? "USD",
          taxRate: salon?.taxRate ?? 0,
          invoicePrefix: salon?.invoicePrefix ?? "INV",
          invoiceFooter: salon?.invoiceFooter ?? null,
        }}
      />
    </div>
  );
}
