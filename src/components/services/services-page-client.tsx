"use client";

import * as React from "react";
import { CategoryAccordion, AccordionCategory } from "./category-accordion";
import { reorderCategories } from "@/app/actions/services";

interface ServicesPageClientProps {
  categories: AccordionCategory[];
  allCategories: { id: string; name: string; icon: string | null }[];
  currency?: string;
}

export function ServicesPageClient({
  categories: initialCategories,
  allCategories,
  currency = "USD",
}: ServicesPageClientProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  // Local order state for Up/Down reordering (persisted via reorderCategories)
  const [order, setOrder] = React.useState<string[]>(
    () => initialCategories.map((c) => c.id)
  );

  // Keep order in sync if server data changes (e.g. after router.refresh())
  React.useEffect(() => {
    setOrder((prev) => {
      const incomingIds = initialCategories.map((c) => c.id);
      // Preserve existing order for ids that are still present, append new ones
      const kept = prev.filter((id) => incomingIds.includes(id));
      const added = incomingIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [initialCategories]);

  const sorted = order
    .map((id) => initialCategories.find((c) => c.id === id))
    .filter(Boolean) as AccordionCategory[];

  async function moveUp(index: number) {
    if (index === 0) return;
    const next = [...order];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setOrder(next);
    await reorderCategories(next);
  }

  async function moveDown(index: number) {
    if (index === sorted.length - 1) return;
    const next = [...order];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setOrder(next);
    await reorderCategories(next);
  }

  return (
    <div className="space-y-4">
      {sorted.map((cat, index) => (
        <CategoryAccordion
          key={cat.id}
          category={cat}
          allCategories={allCategories}
          currency={currency}
          defaultOpen={index === 0}
          isFirst={index === 0}
          isLast={index === sorted.length - 1}
          onMoveUp={() => moveUp(index)}
          onMoveDown={() => moveDown(index)}
        />
      ))}
    </div>
  );
}
