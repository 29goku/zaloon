"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteInventoryItem } from "@/app/actions/inventory";

interface DeleteItemButtonProps {
  itemId: string;
  itemName: string;
}

export function DeleteItemButton({ itemId, itemName }: DeleteItemButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${itemName}"? This will also remove all stock transactions.`)) {
      return;
    }
    setLoading(true);
    const result = await deleteInventoryItem(itemId);
    setLoading(false);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      title="Delete item"
      disabled={loading}
      onClick={handleDelete}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  );
}
