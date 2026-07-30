"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteInventoryItem } from "@/app/actions/inventory";
import { InlineConfirm } from "@/components/ui/inline-confirm";

interface DeleteItemButtonProps {
  itemId: string;
  itemName: string;
}

export function DeleteItemButton({ itemId, itemName }: DeleteItemButtonProps) {
  const router = useRouter();

  return (
    <InlineConfirm
      message={`Delete "${itemName}"? This will also remove all stock transactions.`}
      onConfirm={async () => {
        const result = await deleteInventoryItem(itemId);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      }}
      trigger={
        <Button
          variant="ghost"
          size="icon-xs"
          title="Delete item"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      }
    />
  );
}
