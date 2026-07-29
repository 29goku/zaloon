"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveTimeOff, denyTimeOff } from "@/app/actions/time-off";

export function ApprovalActions({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleApprove() {
    startTransition(async () => {
      const result = await approveTimeOff(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Time off approved");
      router.refresh();
    });
  }

  function handleDeny() {
    startTransition(async () => {
      const result = await denyTimeOff(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Request denied and removed");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <Button
        size="sm"
        variant="default"
        disabled={isPending}
        onClick={handleApprove}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <Check className="w-3.5 h-3.5" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending}
        onClick={handleDeny}
      >
        <X className="w-3.5 h-3.5" />
        Deny
      </Button>
    </div>
  );
}
