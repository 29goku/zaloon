import { ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import { getIntakeFormFields } from "@/app/actions/intake";
import { IntakeFormBuilder } from "./intake-form-builder";

export const dynamic = "force-dynamic";

export default async function IntakeFormPage() {
  const fields = await getIntakeFormFields();

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      {/* Back */}
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-indigo-400/10 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Intake Form Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Design the form new clients fill out before their first visit
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <IntakeFormBuilder initialFields={fields} />
      </div>
    </div>
  );
}
