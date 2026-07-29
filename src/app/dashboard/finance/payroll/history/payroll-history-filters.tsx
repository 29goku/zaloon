"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";

interface PayrollHistoryFiltersProps {
  allStaff: { id: string; name: string }[];
  currentStaffId?: string;
  currentFrom?: string;
  currentTo?: string;
}

export function PayrollHistoryFilters({
  allStaff,
  currentStaffId,
  currentFrom,
  currentTo,
}: PayrollHistoryFiltersProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const staffId = fd.get("staffId") as string;
    const from = fd.get("from") as string;
    const to = fd.get("to") as string;
    if (staffId) params.set("staffId", staffId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    startTransition(() => {
      router.push(
        `/dashboard/finance/payroll/history${params.size > 0 ? "?" + params.toString() : ""}`
      );
    });
  }

  function handleClear() {
    startTransition(() => {
      router.push("/dashboard/finance/payroll/history");
    });
  }

  const hasFilters = currentStaffId || currentFrom || currentTo;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 p-4 bg-card rounded-xl border border-border"
    >
      {/* Staff filter */}
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <label className="text-xs font-medium text-muted-foreground">
          Staff Member
        </label>
        <select
          name="staffId"
          defaultValue={currentStaffId ?? ""}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring"
        >
          <option value="">All Staff</option>
          {allStaff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date from */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Period From
        </label>
        <input
          name="from"
          type="date"
          defaultValue={currentFrom ?? ""}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring"
        />
      </div>

      {/* Date to */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Period To
        </label>
        <input
          name="to"
          type="date"
          defaultValue={currentTo ?? ""}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 self-end pb-0">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          Filter
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
