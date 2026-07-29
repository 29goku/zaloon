"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { updateCoupon } from "@/app/actions/coupons";

interface CouponActiveToggleProps {
  id: string;
  active: boolean;
}

export function CouponActiveToggle({ id, active }: CouponActiveToggleProps) {
  const [optimistic, setOptimistic] = React.useState(active);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  async function handleChange(checked: boolean) {
    setOptimistic(checked);
    setPending(true);
    await updateCoupon(id, { active: checked });
    setPending(false);
    router.refresh();
  }

  return (
    <Switch
      checked={optimistic}
      onCheckedChange={handleChange}
      disabled={pending}
      aria-label="Toggle coupon active state"
    />
  );
}
