"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cancelTimeOffRequest } from "@/app/actions/timeoff";

export function CancelLeaveButton({
  id,
  staffName,
}: {
  id: string;
  staffName: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await cancelTimeOffRequest(id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to cancel leave");
        return;
      }
      toast.success(`Leave for ${staffName} cancelled`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
        <span className="hidden sm:inline ml-1">Cancel</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Leave</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel the approved leave for{" "}
            <span className="font-semibold text-foreground">{staffName}</span>?
            This will remove the record and make the staff member available again.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Keep leave
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Cancelling..." : "Cancel leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
