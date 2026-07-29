"use client";

import { useRouter } from "next/navigation";

export function ReviewSortSelect({
  defaultValue,
  staffIdFilter,
  filterMode,
}: {
  defaultValue: string;
  staffIdFilter?: string;
  filterMode?: string;
}) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    params.set("sort", e.target.value);
    if (staffIdFilter) params.set("staffId", staffIdFilter);
    if (filterMode && filterMode !== "all") params.set("filter", filterMode);
    router.push(`/dashboard/reviews?${params.toString()}`);
  }

  return (
    <select
      name="sort"
      defaultValue={defaultValue}
      onChange={handleChange}
      className="h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="newest">Newest</option>
      <option value="oldest">Oldest</option>
      <option value="rating-high">Rating ↓</option>
      <option value="rating-low">Rating ↑</option>
    </select>
  );
}
