import { XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCancellationPolicy } from "@/app/actions/policies";
import { CancellationPolicyForm } from "@/components/settings/cancellation-policy-form";

export const dynamic = "force-dynamic";

export default async function CancellationPolicyPage() {
  const policy = await getCancellationPolicy();

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cancellation Policy</h1>
            <p className="text-sm text-muted-foreground">
              Set fees for late cancellations and no-shows
            </p>
          </div>
        </div>
      </div>

      <CancellationPolicyForm initialPolicy={policy} />
    </div>
  );
}
