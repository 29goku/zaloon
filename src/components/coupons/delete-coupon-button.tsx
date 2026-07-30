"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCoupon } from "@/app/actions/coupons";
import { InlineConfirm } from "@/components/ui/inline-confirm";

interface DeleteCouponButtonProps {
  id: string;
  code: string;
}

export function DeleteCouponButton({ id, code }: DeleteCouponButtonProps) {
  const router = useRouter();

  return (
    <InlineConfirm
      message={`Delete coupon "${code}"? This cannot be undone.`}
      onConfirm={async () => {
        await deleteCoupon(id);
        router.refresh();
      }}
      trigger={
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          aria-label={`Delete coupon ${code}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      }
    />
  );
}
