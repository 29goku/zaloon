import { prisma } from "@/lib/prisma";
import { Building2 } from "lucide-react";
import { SalonSettingsForm } from "@/components/settings/salon-settings-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SalonProfilePage() {
  const salon = await prisma.salon.findFirst();

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
          <Building2 className="w-7 h-7 text-primary" />
          Salon Profile
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your salon&apos;s basic information and financial settings
        </p>
      </div>

      <SalonSettingsForm
        salon={{
          name: salon?.name ?? "",
          phone: salon?.phone ?? null,
          email: salon?.email ?? null,
          address: salon?.address ?? null,
          city: salon?.city ?? null,
          country: salon?.country ?? "US",
          currency: salon?.currency ?? "USD",
          taxRate: salon?.taxRate ?? 0,
          invoicePrefix: salon?.invoicePrefix ?? "INV",
          businessHours: salon?.businessHours ?? null,
        }}
      />
    </div>
  );
}
