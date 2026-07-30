import { getDigestSettings } from "@/app/actions/settings";
import { generateDigestData } from "@/lib/generate-digest";
import { prisma } from "@/lib/prisma";
import { DigestSettingsForm } from "@/components/settings/digest-settings-form";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DigestSettingsPage() {
  const [digestSettings, salon] = await Promise.all([
    getDigestSettings(),
    prisma.salon.findFirst({ select: { id: true } }),
  ]);

  // Pre-generate a 7-day preview if a salon exists
  let previewData = null;
  if (salon) {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 7);
    periodStart.setHours(0, 0, 0, 0);
    try {
      previewData = await generateDigestData(salon.id, periodStart, now);
    } catch {
      // non-fatal — preview just won't show
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Mail className="w-7 h-7 text-primary" />
          Business Summary Email
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure a periodic digest email with revenue, appointments, and client highlights
          delivered to your inbox.
        </p>
      </div>

      <DigestSettingsForm initial={digestSettings} previewData={previewData} />
    </div>
  );
}
