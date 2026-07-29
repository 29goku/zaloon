"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2, Users } from "lucide-react";
import { addToWaitlist, getWaitlistPositionForService } from "@/app/actions/waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  serviceId: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.enum(["morning", "afternoon", "evening"]).optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceOption {
  id: string;
  name: string;
}

interface WaitlistJoinFormProps {
  salonId: string;
  salonSlug: string;
  services: ServiceOption[];
}

const TIME_RANGES = [
  { value: "morning", label: "Morning (9 AM – 12 PM)" },
  { value: "afternoon", label: "Afternoon (12 PM – 5 PM)" },
  { value: "evening", label: "Evening (5 PM – 8 PM)" },
] as const;

interface SuccessState {
  position: number;
  serviceName: string | null;
}

export function WaitlistJoinForm({ salonId, services }: WaitlistJoinFormProps) {
  const [successState, setSuccessState] = React.useState<SuccessState | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      serviceId: undefined,
      preferredDate: "",
      preferredTime: undefined,
      note: "",
    },
  });

  const selectedServiceId = watch("serviceId");

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const resolvedServiceId = values.serviceId === "none" ? undefined : values.serviceId;

    const result = await addToWaitlist({
      name: values.name,
      phone: values.phone,
      serviceId: resolvedServiceId,
      preferredDate: values.preferredDate || undefined,
      preferredTime: values.preferredTime,
      note: values.note,
    });
    if (!result.success) {
      setServerError(result.error);
      return;
    }

    // Fetch the position after successful join
    const position = await getWaitlistPositionForService(salonId, resolvedServiceId ?? null);
    const selectedService = resolvedServiceId
      ? services.find((s) => s.id === resolvedServiceId)
      : null;

    setSuccessState({
      position,
      serviceName: selectedService?.name ?? null,
    });
  }

  if (successState) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">You are on the list!</h2>
          <p className="text-sm text-stone-500 mt-2">
            We will reach out as soon as a slot becomes available. Thank you for your patience.
          </p>
        </div>

        {/* Position indicator */}
        <div className="mt-2 w-full rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-amber-900">
              You are <span className="text-amber-600">#{successState.position}</span> in line
              {successState.serviceName ? ` for ${successState.serviceName}` : ""}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {successState.position === 1
                ? "You are first in line!"
                : `There ${successState.position - 1 === 1 ? "is" : "are"} ${successState.position - 1} ${successState.position - 1 === 1 ? "person" : "people"} ahead of you.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jw-name" className="text-stone-700">
          Your name <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="jw-name"
          placeholder="Full name"
          className="border-stone-200 focus-visible:ring-rose-400"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-rose-600">{errors.name.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jw-phone" className="text-stone-700">Phone</Label>
        <Input
          id="jw-phone"
          type="tel"
          placeholder="+1 555 000 0000"
          className="border-stone-200 focus-visible:ring-rose-400"
          {...register("phone")}
        />
      </div>

      {/* Service dropdown */}
      {services.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-stone-700">Preferred service</Label>
          <Controller
            name="serviceId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? "none"}
                onValueChange={(val) => field.onChange(val)}
              >
                <SelectTrigger className="w-full border-stone-200">
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
      )}

      {/* Preferred date picker */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jw-date" className="text-stone-700">Preferred date</Label>
        <Input
          id="jw-date"
          type="date"
          min={new Date().toISOString().split("T")[0]}
          className="border-stone-200 focus-visible:ring-rose-400"
          {...register("preferredDate")}
        />
      </div>

      {/* Preferred time of day */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-stone-700">Preferred time of day</Label>
        <Controller
          name="preferredTime"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? "none"}
              onValueChange={(val) => field.onChange(val === "none" ? undefined : val)}
            >
              <SelectTrigger className="w-full border-stone-200">
                <SelectValue placeholder="No preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No preference</SelectItem>
                {TIME_RANGES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jw-note" className="text-stone-700">Additional notes</Label>
        <Textarea
          id="jw-note"
          placeholder="Any special requests or details…"
          className="border-stone-200 focus-visible:ring-rose-400 resize-none"
          rows={3}
          {...register("note")}
        />
      </div>

      {serverError && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{serverError}</p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl py-2.5 font-semibold"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Joining…
          </>
        ) : (
          "Join Waitlist"
        )}
      </Button>
    </form>
  );
}
