import { Building2 } from "lucide-react";
import { getBranches } from "@/app/actions/branches";
import { BranchesManager } from "@/components/branches/branches-manager";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const branches = await getBranches();

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="w-7 h-7 text-primary" />
          Branches &amp; Locations
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your salon locations. Each branch has its own contact details
          and timezone.
        </p>
      </div>

      <BranchesManager initialBranches={branches} />
    </div>
  );
}
