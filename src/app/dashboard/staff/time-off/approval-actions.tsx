"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveTimeOff, denyTimeOff } from "@/app/actions/time-off";
import { ConflictResolutionDialog } from "@/components/staff/conflict-resolution-panel";

interface ApprovalActionsProps {
  id: string;
  conflicts?: number;
  staffName?: string;
  timeOffId?: string;
  startDate?: string;
  endDate?: string;
  staffId?: string;
}

export function ApprovalActions({
  id,
  conflicts = 0,
  staffName = "",
  startDate = "",
  endDate = "",
  staffId = "",
}: ApprovalActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showConflict, setShowConflict] = useState(false);
  const router = useRouter();

  function handleApprove() {
    if (conflicts > 0) {
      setShowConflict(true);
      return;
    }
    doApprove();
  }

  function doApprove() {
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
    <>
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

      {conflicts > 0 && (
        <ConflictResolutionDialog
          open={showConflict}
          onOpenChange={setShowConflict}
          timeOffId={id}
          staffId={staffId}
          staffName={staffName}
          startDate={startDate}
          endDate={endDate}
          onApproveAnyway={doApprove}
        />
      )}
    </>
  );
}
