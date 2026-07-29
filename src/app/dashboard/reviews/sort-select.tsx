"use client";

export function ReviewSortSelect({
  defaultValue,
  staffIdFilter,
  filterMode,
}: {
  defaultValue: string;
  staffIdFilter?: string;
  filterMode?: string;
}) {
  return (
    <form method="GET" action="/dashboard/reviews">
      {staffIdFilter && <input type="hidden" name="staffId" value={staffIdFilter} />}
      {filterMode && filterMode !== "all" && <input type="hidden" name="filter" value={filterMode} />}
      <select
        name="sort"
        defaultValue={defaultValue}
        onChange={(e) => (e.target.form as HTMLFormElement | null)?.submit()}
        className="h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="rating-high">Rating ↓</option>
        <option value="rating-low">Rating ↑</option>
      </select>
    </form>
  );
}
