"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestTimeOffDialog } from "@/components/staff/request-time-off-dialog";

interface Props {
  staff: { id: string; name: string }[];
}

export function RequestTimeOffButton({ staff }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Request Time Off
      </Button>
      <RequestTimeOffDialog open={open} onOpenChange={setOpen} staff={staff} />
    </>
  );
}
