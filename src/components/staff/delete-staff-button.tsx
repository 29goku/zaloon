"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteStaff } from "@/app/actions/staff";

export function DeleteStaffButton({ staffId, staffName }: { staffId: string; staffName: string }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteStaff(staffId);
      if (!result.success) {
        setError(result.error);
        setConfirm(false);
        return;
      }
      router.push("/dashboard/staff");
      router.refresh();
    });
  }

  if (!confirm) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setConfirm(true)}
      >
        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
        Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Delete {staffName}?</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={handleDelete}
      >
        {isPending ? "Deleting…" : "Yes, delete"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => { setConfirm(false); setError(null); }}
      >
        Cancel
      </Button>
      {error && <p className="text-xs text-destructive w-full">{error}</p>}
    </div>
  );
}
