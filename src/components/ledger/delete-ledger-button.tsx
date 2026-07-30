"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteLedgerEntry } from "@/app/actions/ledger";
import { InlineConfirm } from "@/components/ui/inline-confirm";

interface DeleteLedgerButtonProps {
  id: string;
}

export function DeleteLedgerButton({ id }: DeleteLedgerButtonProps) {
  const router = useRouter();

  return (
    <InlineConfirm
      message="Delete this ledger entry?"
      onConfirm={async () => {
        const result = await deleteLedgerEntry(id);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      }}
      trigger={
        <button
          className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-[#F41666] hover:bg-[#F41666]/10 transition-all"
          aria-label="Delete entry"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      }
    />
  );
}
