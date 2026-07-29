"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteLedgerEntry } from "@/app/actions/ledger";

interface DeleteLedgerButtonProps {
  id: string;
}

export function DeleteLedgerButton({ id }: DeleteLedgerButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleDelete() {
    if (!confirm("Delete this ledger entry?")) return;
    startTransition(async () => {
      const result = await deleteLedgerEntry(id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-[#F41666] hover:bg-[#F41666]/10 transition-all disabled:opacity-40"
      aria-label="Delete entry"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
