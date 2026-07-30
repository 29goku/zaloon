"use client";

import { useRouter } from "next/navigation";

interface StaffSelectorProps {
  allStaff: { id: string; name: string }[];
  selectedStaffId: string;
  period?: string;
}

export function StaffSelector({ allStaff, selectedStaffId, period }: StaffSelectorProps) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    params.set("staffId", e.target.value);
    if (period) params.set("period", period);
    router.push(`/dashboard/activity/staff?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="staffSelect" className="text-sm font-medium text-foreground">
        Staff:
      </label>
      <div className="relative">
        <select
          id="staffSelect"
          defaultValue={selectedStaffId}
          onChange={handleChange}
          className="h-9 pl-3 pr-8 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
        >
          {allStaff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
