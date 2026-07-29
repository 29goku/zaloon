"use client";

import * as React from "react";
import { CategoryAccordion, AccordionCategory } from "./category-accordion";

interface ServicesPageClientProps {
  categories: AccordionCategory[];
  allCategories: { id: string; name: string; icon: string | null }[];
  fmt: (n: number) => string;
}

export function ServicesPageClient({
  categories: initialCategories,
  allCategories,
  fmt,
}: ServicesPageClientProps) {
  // Local order state for Up/Down reordering (visual only — no persistence)
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

  function moveUp(index: number) {
    if (index === 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    if (index === sorted.length - 1) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {sorted.map((cat, index) => (
        <CategoryAccordion
          key={cat.id}
          category={cat}
          allCategories={allCategories}
          fmt={fmt}
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
