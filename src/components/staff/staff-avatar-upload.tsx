"use client";

import { useState, useTransition } from "react";
import { ImageUpload } from "@/components/ui/image-upload";
import { updateStaffAvatar } from "@/app/actions/staff";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

interface StaffAvatarUploadProps {
  staffId: string;
  name: string;
  photo?: string | null;
  colorClass: string;
}

export function StaffAvatarUpload({ staffId, name, photo, colorClass }: StaffAvatarUploadProps) {
  const [current, setCurrent] = useState<string | null>(photo ?? null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleChange(base64: string | null) {
    setCurrent(base64);
    startTransition(async () => {
      const res = await updateStaffAvatar(staffId, base64);
      if (!res.success) {
        toast({ title: "Error", description: res.error, type: "error" });
        setCurrent(photo ?? null);
      }
    });
  }

  return (
    <div className={cn("relative", pending && "opacity-70")}>
      <ImageUpload
        value={current}
        onChange={handleChange}
        size="lg"
        shape="circle"
        placeholder={
          <div className={cn("w-full h-full rounded-full flex items-center justify-center font-bold text-2xl", colorClass)}>
            {initials}
          </div>
        }
      />
    </div>
  );
}
