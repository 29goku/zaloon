"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createAppointment } from "@/app/actions/appointments";

const schema = z.object({
  clientId: z.string().optional(),
  staffId: z.string().min(1, "Staff is required"),
  serviceIds: z.array(z.string()).min(1, "Select at least one service"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Client = { id: string; name: string };
type Staff = { id: string; name: string };
type Service = { id: string; name: string; price: number; durationMins: number; categoryId: string };
type Category = { id: string; name: string };

interface NewAppointmentDialogProps {
  clients: Client[];
  staff: Staff[];
  services: Service[];
  categories: Category[];
}

export function NewAppointmentDialog({
  clients,
  staff,
  services,
  categories,
}: NewAppointmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: undefined,
      staffId: "",
      serviceIds: [],
      date: today,
      startTime: "",
      notes: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createAppointment({
      ...values,
      clientId: values.clientId === "walk-in" ? null : values.clientId,
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
        New Appointment
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Client */}
          <div className="space-y-1.5">
            <Label htmlFor="clientId">Client</Label>
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(val) => field.onChange(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Walk-in / select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Staff */}
          <div className="space-y-1.5">
            <Label htmlFor="staffId">
              Staff <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="staffId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => field.onChange(val)}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!errors.staffId}
                  >
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.staffId && (
              <p className="text-xs text-destructive">{errors.staffId.message}</p>
            )}
          </div>

          {/* Services */}
          <div className="space-y-1.5">
            <Label>
              Services <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="serviceIds"
              control={control}
              render={({ field }) => (
                <div className="rounded-lg border border-input bg-transparent p-2 space-y-2 max-h-44 overflow-y-auto">
                  {categories.length > 0
                    ? categories.map((cat) => {
                        const catServices = services.filter(
                          (s) => s.categoryId === cat.id
                        );
                        if (catServices.length === 0) return null;
                        return (
                          <div key={cat.id}>
                            <p className="text-xs font-medium text-muted-foreground px-2 pt-1 pb-0.5 uppercase tracking-wide">
                              {cat.name}
                            </p>
                            {catServices.map((svc) => {
                              const checked = field.value.includes(svc.id);
                              return (
                                <label
                                  key={svc.id}
                                  className="flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1 hover:bg-muted transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    className="rounded border-input accent-primary"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        field.onChange([...field.value, svc.id]);
                                      } else {
                                        field.onChange(
                                          field.value.filter((id) => id !== svc.id)
                                        );
                                      }
                                    }}
                                  />
                                  <span className="text-sm flex-1">{svc.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {svc.price.toLocaleString("en", {
                                      style: "currency",
                                      currency: "USD",
                                      minimumFractionDigits: 0,
                                    })}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })
                    : services.map((svc) => {
                        const checked = field.value.includes(svc.id);
                        return (
                          <label
                            key={svc.id}
                            className="flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1 hover:bg-muted transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-input accent-primary"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  field.onChange([...field.value, svc.id]);
                                } else {
                                  field.onChange(
                                    field.value.filter((id) => id !== svc.id)
                                  );
                                }
                              }}
                            />
                            <span className="text-sm flex-1">{svc.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {svc.price.toLocaleString("en", {
                                style: "currency",
                                currency: "USD",
                                minimumFractionDigits: 0,
                              })}
                            </span>
                          </label>
                        );
                      })}
                  {services.length === 0 && (
                    <p className="text-sm text-muted-foreground px-2 py-1">
                      No services available
                    </p>
                  )}
                </div>
              )}
            />
            {errors.serviceIds && (
              <p className="text-xs text-destructive">
                {errors.serviceIds.message}
              </p>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                aria-invalid={!!errors.date}
                {...register("date")}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime">
                Start time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                aria-invalid={!!errors.startTime}
                {...register("startTime")}
              />
              {errors.startTime && (
                <p className="text-xs text-destructive">
                  {errors.startTime.message}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes…"
              rows={2}
              {...register("notes")}
            />
          </div>

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Create Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
