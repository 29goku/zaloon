"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCoupon } from "@/app/actions/coupons";

interface DeleteCouponButtonProps {
  id: string;
  code: string;
}

export function DeleteCouponButton({ id, code }: DeleteCouponButtonProps) {
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return;
    setPending(true);
    await deleteCoupon(id);
    setPending(false);
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
      onClick={handleDelete}
      disabled={pending}
      aria-label={`Delete coupon ${code}`}
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </Button>
  );
}
