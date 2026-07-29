"use client";

import { useRouter } from "next/navigation";

interface MonthPickerProps {
  options: { value: string; label: string }[];
  selectedMonth: string;
}

export function MonthPicker({ options, selectedMonth }: MonthPickerProps) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`?month=${e.target.value}`);
  }

  return (
    <select
      value={selectedMonth}
      onChange={handleChange}
      className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {options.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  );
}
