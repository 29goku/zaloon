"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addToWaitlist } from "@/app/actions/waitlist";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  serviceId: z.string().optional(),
  staffId: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ServiceOption = { id: string; name: string };
type StaffOption = { id: string; name: string };

interface AddWaitlistDialogProps {
  services: ServiceOption[];
  staff: StaffOption[];
}

export function AddWaitlistDialog({ services, staff }: AddWaitlistDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      serviceId: undefined,
      staffId: undefined,
      note: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await addToWaitlist({
      name: values.name,
      phone: values.phone,
      serviceId: values.serviceId === "none" ? undefined : values.serviceId,
      staffId: values.staffId === "none" ? undefined : values.staffId,
      note: values.note,
    });
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    reset();
    setOpen(false);
    router.refresh();
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
      setServerError(null);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" />
        }
      >
        <Plus className="w-4 h-4" />
        Add to Waitlist
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Waitlist</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wl-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="wl-name"
              placeholder="Full name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wl-phone">Phone</Label>
            <Input
              id="wl-phone"
              type="tel"
              placeholder="+1 555 000 0000"
              {...register("phone")}
            />
          </div>

          {/* Service */}
          <div className="flex flex-col gap-1.5">
            <Label>Service</Label>
            <Controller
              name="serviceId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(val) => field.onChange(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any service</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Preferred Staff */}
          <div className="flex flex-col gap-1.5">
            <Label>Preferred Staff</Label>
            <Controller
              name="staffId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(val) => field.onChange(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No preference</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wl-note">Note</Label>
            <Textarea
              id="wl-note"
              placeholder="Any special requests or notes…"
              {...register("note")}
            />
          </div>

          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Add to Waitlist"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
