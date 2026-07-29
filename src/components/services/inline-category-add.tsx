"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory } from "@/app/actions/services";

export function InlineCategoryAdd() {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState(false);
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleOpen() {
    setExpanded(true);
    setName("");
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleCancel() {
    setExpanded(false);
    setName("");
    setError(null);
  }

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Category name is required");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await createCategory({ name: trimmed });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setExpanded(false);
    setName("");
    router.refresh();
  }

  if (!expanded) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-lg hover:bg-muted"
      >
        <Plus className="w-3.5 h-3.5" />
        Add category inline
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border bg-muted/30">
      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") handleCancel();
        }}
        placeholder="Category name..."
        className="h-8 text-sm flex-1"
        aria-label="New category name"
        aria-invalid={!!error}
      />
      {error && <span className="text-xs text-destructive shrink-0">{error}</span>}
      <Button size="sm" onClick={handleAdd} disabled={loading} className="h-8 px-3">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleCancel}
        disabled={loading}
        className="h-8 px-2"
      >
        Cancel
      </Button>
    </div>
  );
}
