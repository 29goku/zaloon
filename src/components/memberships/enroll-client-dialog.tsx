"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { enrollClient } from "@/app/actions/memberships";

// ── Types ──────────────────────────────────────────────────────────────────

type Client = { id: string; name: string };
type Plan = { id: string; name: string; price: number; sessionsPerMonth: number };

interface EnrollClientDialogProps {
  clients: Client[];
  plans: Plan[];
}

// ── Schema ─────────────────────────────────────────────────────────────────

const formSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  planId: z.string().min(1, "Select a plan"),
  startDate: z.string().min(1, "Start date is required"),
});

type FormValues = z.infer<typeof formSchema>;

// ── Component ──────────────────────────────────────────────────────────────

export function EnrollClientDialog({ clients, plans }: EnrollClientDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      planId: "",
      startDate: today,
    },
  });

  const clientId = watch("clientId");
  const planId = watch("planId");

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const result = await enrollClient(values.clientId, values.planId, values.startDate);

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setServerError("An unexpected error occurred");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
      setServerError(null);
    }
    setOpen(next);
  }

  const activePlans = plans.filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          />
        }
      >
        <UserPlus className="w-4 h-4" />
        Enroll Client
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll Client in Plan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Client */}
          <div className="space-y-1.5">
            <Label htmlFor="enroll-client">Client</Label>
            <Select
              value={clientId}
              onValueChange={(val) => setValue("clientId", val ?? "", { shouldValidate: true })}
            >
              <SelectTrigger id="enroll-client" className="w-full" aria-invalid={!!errors.clientId}>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && (
              <p className="text-xs text-destructive">{errors.clientId.message}</p>
            )}
          </div>

          {/* Plan */}
          <div className="space-y-1.5">
            <Label htmlFor="enroll-plan">Plan</Label>
            <Select
              value={planId}
              onValueChange={(val) => setValue("planId", val ?? "", { shouldValidate: true })}
            >
              <SelectTrigger id="enroll-plan" className="w-full" aria-invalid={!!errors.planId}>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {activePlans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — ${p.price}/mo · {p.sessionsPerMonth} sessions
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.planId && (
              <p className="text-xs text-destructive">{errors.planId.message}</p>
            )}
          </div>

          {/* Start date */}
          <div className="space-y-1.5">
            <Label htmlFor="enroll-start">Start Date</Label>
            <Input
              id="enroll-start"
              type="date"
              aria-invalid={!!errors.startDate}
              {...register("startDate")}
            />
            {errors.startDate && (
              <p className="text-xs text-destructive">{errors.startDate.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enroll Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
