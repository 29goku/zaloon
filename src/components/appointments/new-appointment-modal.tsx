"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ChevronLeft, ChevronRight, Check, Loader2, User2, Scissors, CalendarDays, ClipboardCheck, Trash2, UserCheck, Clock, Umbrella, AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { createAppointment, createRecurringAppointments } from "@/app/actions/appointments";
import { searchClients } from "@/app/actions/search";
import { getStaffAvailabilityForDate } from "@/app/actions/shifts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = { id: string; name: string; phone: string | null };
type StaffMember = { id: string; name: string };
type Service = {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  categoryId: string;
  StaffService?: { staffId: string }[];
};
type Category = {
  id: string;
  name: string;
  Service?: Service[];
};

// A row in the multi-service builder
type ServiceRow = {
  serviceId: string;
  staffId: string; // "" = not selected yet
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  clientId: z.string().nullable().optional(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Client", icon: User2 },
  { id: 2, label: "Services", icon: Scissors },
  { id: 3, label: "Date & Time", icon: CalendarDays },
  { id: 4, label: "Confirm", icon: ClipboardCheck },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface NewAppointmentModalProps {
  staff: StaffMember[];
  services?: Service[];
  categories?: Category[];
  salonId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: StepId }) {
  return (
    <div className="flex items-center justify-between mb-6 px-1">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = step.id < currentStep;
        const isActive = step.id === currentStep;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isActive
                    ? "border-primary text-primary bg-primary/10"
                    : "border-muted-foreground/30 text-muted-foreground/40"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium hidden sm:block ${
                  isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground/40"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-1 transition-colors ${
                  step.id < currentStep ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NewAppointmentModal({
  staff,
  services: servicesProp,
  categories: categoriesProp,
  salonId: salonIdProp,
}: NewAppointmentModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState<StepId>(1);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Client search state
  const [clientSearch, setClientSearch] = React.useState("");
  const [clientResults, setClientResults] = React.useState<Client[]>([]);
  const [clientSearching, setClientSearching] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<Client | "walk-in" | null>(null);

  // Staff availability state for selected staff + date
  const [staffAvailability, setStaffAvailability] = React.useState<{
    hasShift: boolean;
    shiftStart: string | null;
    shiftEnd: string | null;
    onLeave: boolean;
    leaveReason: string | null;
    appointmentCount: number;
  } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);

  // Services state — fetched from API if not passed as prop
  const [categories, setCategories] = React.useState<Category[]>(categoriesProp ?? []);
  const [services, setServices] = React.useState<Service[]>(servicesProp ?? []);
  const [servicesLoading, setServicesLoading] = React.useState(false);

  // Multi-service rows: each row has a serviceId + a per-service staffId
  const [serviceRows, setServiceRows] = React.useState<ServiceRow[]>([
    { serviceId: "", staffId: "" },
  ]);
  const [rowsError, setRowsError] = React.useState<string | null>(null);

  // Recurring state
  const [recurringEnabled, setRecurringEnabled] = React.useState(false);
  const [recurringPattern, setRecurringPattern] = React.useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [recurringOccurrences, setRecurringOccurrences] = React.useState(4);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: undefined,
      date: today,
      startTime: "",
      notes: "",
    },
  });

  const watchedDate = watch("date");
  const watchedStartTime = watch("startTime");

  // ── Fetch services from API if not provided as props ──────────────────────

  React.useEffect(() => {
    if (open && services.length === 0 && categories.length === 0) {
      setServicesLoading(true);
      fetch("/api/services")
        .then((r) => r.json())
        .then((data: Category[]) => {
          setCategories(data);
          const allServices = data.flatMap((cat) => cat.Service ?? []);
          setServices(allServices);
        })
        .catch(() => {
          toast.add({ title: "Could not load services", type: "error" });
        })
        .finally(() => setServicesLoading(false));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Client search ─────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!clientSearch.trim()) {
      setClientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setClientSearching(true);
      try {
        const results = await searchClients(clientSearch);
        setClientResults(results);
      } finally {
        setClientSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  // ── Derived values ────────────────────────────────────────────────────────

  // Staff who offer a given service (falls back to all staff if no StaffService data)
  function staffForService(serviceId: string): StaffMember[] {
    if (!serviceId) return staff;
    const svc = services.find((s) => s.id === serviceId);
    if (!svc?.StaffService || svc.StaffService.length === 0) return staff;
    const ids = new Set(svc.StaffService.map((ss) => ss.staffId));
    return staff.filter((m) => ids.has(m.id));
  }

  // The primary staffId is the first row's staffId (falls back to any picked staff)
  const primaryStaffId = serviceRows.find((r) => r.staffId)?.staffId ?? "";

  // ── Fetch staff availability when staff + date changes ───────────────────

  React.useEffect(() => {
    if (!primaryStaffId || !watchedDate) {
      setStaffAvailability(null);
      return;
    }
    let cancelled = false;
    setAvailabilityLoading(true);
    getStaffAvailabilityForDate(primaryStaffId, watchedDate)
      .then((data) => {
        if (!cancelled) setStaffAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setStaffAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [primaryStaffId, watchedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedServiceObjects = serviceRows
    .map((r) => services.find((s) => s.id === r.serviceId))
    .filter(Boolean) as Service[];

  const totalPrice = selectedServiceObjects.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServiceObjects.reduce((sum, s) => sum + s.durationMins, 0);

  // ── Service row helpers ───────────────────────────────────────────────────

  function updateRow(index: number, patch: Partial<ServiceRow>) {
    setServiceRows((rows) =>
      rows.map((r, i) => {
        if (i !== index) return r;
        const updated = { ...r, ...patch };
        // If service changed, reset staffId to avoid stale cross-service assignment
        if (patch.serviceId !== undefined && patch.serviceId !== r.serviceId) {
          updated.staffId = "";
        }
        return updated;
      })
    );
  }

  function addRow() {
    setServiceRows((rows) => [...rows, { serviceId: "", staffId: "" }]);
  }

  function removeRow(index: number) {
    setServiceRows((rows) => rows.filter((_, i) => i !== index));
  }

  // ── Navigation helpers ────────────────────────────────────────────────────

  async function goNext() {
    setServerError(null);

    // Validate service rows on step 2
    if (currentStep === 2) {
      setRowsError(null);
      const filledRows = serviceRows.filter((r) => r.serviceId);
      if (filledRows.length === 0) {
        setRowsError("Select at least one service.");
        return;
      }
      const missingStaff = filledRows.some((r) => !r.staffId);
      if (missingStaff) {
        setRowsError("Assign a staff member to each service.");
        return;
      }
      // Deduplicate: remove duplicate serviceIds (keep first occurrence)
      const seen = new Set<string>();
      const deduped = filledRows.filter((r) => {
        if (seen.has(r.serviceId)) return false;
        seen.add(r.serviceId);
        return true;
      });
      setServiceRows(deduped);
    }

    if (currentStep === 3) {
      const valid = await trigger(["date", "startTime"]);
      if (!valid) return;
    }

    setCurrentStep((s) => Math.min(4, s + 1) as StepId);
  }

  function goBack() {
    setCurrentStep((s) => Math.max(1, s - 1) as StepId);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const filledRows = serviceRows.filter((r) => r.serviceId && r.staffId);
    if (filledRows.length === 0) {
      setServerError("At least one service with staff is required.");
      return;
    }

    // Build serviceStaffMap and derive primary staffId
    const serviceStaffMap: Record<string, string> = {};
    filledRows.forEach((r) => {
      serviceStaffMap[r.serviceId] = r.staffId;
    });
    const staffId = filledRows[0].staffId;
    const clientId =
      selectedClient === "walk-in" || selectedClient === null
        ? null
        : (selectedClient as Client).id;

    // ── Recurring path ──────────────────────────────────────────────────────
    if (recurringEnabled) {
      const salonId: string = salonIdProp ?? "";
      if (!salonId) {
        setServerError("Could not determine salon. Please try again.");
        return;
      }

      const result = await createRecurringAppointments({
        salonId,
        clientId: clientId ?? undefined,
        staffId,
        serviceIds: filledRows.map((r) => r.serviceId),
        startDate: values.date,
        startTime: values.startTime,
        totalAmount: totalPrice,
        pattern: recurringPattern,
        occurrences: recurringOccurrences,
      });

      if (!result.success) {
        setServerError("Failed to create recurring appointments.");
        return;
      }

      toast.add({
        title: "Recurring series booked",
        description: `${result.created} appointments created.`,
        type: "success",
      });

      handleClose(false);
      router.refresh();
      return;
    }

    // ── Single appointment path ─────────────────────────────────────────────
    const result = await createAppointment({
      ...values,
      clientId,
      staffId,
      serviceIds: filledRows.map((r) => r.serviceId),
      serviceStaffMap,
    });

    if (!result.success) {
      // Show conflict-specific error messages
      if ("conflicts" in result && result.conflicts && result.conflicts.length > 0) {
        setServerError(result.conflicts[0].message ?? result.error);
      } else {
        setServerError(result.error);
      }
      return;
    }

    // Show shift warning toast if staff has no shift on that day
    if ("warnings" in result && result.warnings && result.warnings.length > 0) {
      const shiftWarning = result.warnings.find((w) => w.type === "outside_shift");
      if (shiftWarning) {
        toast.add({
          title: `Warning: ${shiftWarning.staffName ? `Staff ${shiftWarning.staffName} doesn't` : "Staff doesn't"} have a shift on this day`,
          description: "Appointment created anyway.",
          type: "warning",
        });
      }
    }

    toast.add({
      title: "Appointment booked",
      description: `Appointment ${result.id.slice(0, 8).toUpperCase()} created successfully.`,
      type: "success",
    });

    // Show reminders scheduled toast
    if ("remindersScheduled" in result && typeof result.remindersScheduled === "number" && result.remindersScheduled > 0) {
      const count = result.remindersScheduled;
      toast.add({
        title: "Reminders scheduled",
        description: count === 1
          ? "1 SMS reminder scheduled for this appointment."
          : `${count} SMS reminders scheduled (24h and 2h before appointment).`,
        type: "info",
      });
    }

    handleClose(false);
    router.refresh();
  }

  // ── Reset on close ────────────────────────────────────────────────────────

  function handleClose(next: boolean) {
    if (!next) {
      reset();
      setCurrentStep(1);
      setServerError(null);
      setClientSearch("");
      setClientResults([]);
      setSelectedClient(null);
      setServiceRows([{ serviceId: "", staffId: "" }]);
      setRowsError(null);
      setStaffAvailability(null);
      setRecurringEnabled(false);
      setRecurringPattern("weekly");
      setRecurringOccurrences(4);
    }
    setOpen(next);
  }

  // ─── Render steps ─────────────────────────────────────────────────────────

  function renderStep() {
    // ── Step 1: Client ─────────────────────────────────────────────────────
    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Search for an existing client or choose Walk-in.
          </p>

          {/* Walk-in option */}
          <button
            type="button"
            onClick={() => setSelectedClient("walk-in")}
            className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:bg-muted ${
              selectedClient === "walk-in"
                ? "border-primary bg-primary/5 text-primary font-medium"
                : "border-border text-foreground"
            }`}
          >
            <User2 className="w-4 h-4 shrink-0" />
            Walk-in (no client profile)
          </button>

          {/* Search input */}
          <div className="space-y-1.5">
            <Label htmlFor="client-search">Search by name or phone</Label>
            <div className="relative">
              <Input
                id="client-search"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Type to search…"
                autoComplete="off"
              />
              {clientSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Results */}
          {clientResults.length > 0 && (
            <div className="rounded-lg border border-input divide-y divide-border overflow-hidden">
              {clientResults.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => {
                    setSelectedClient(client);
                    setClientSearch(client.name);
                    setClientResults([]);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
                    selectedClient !== "walk-in" &&
                    (selectedClient as Client)?.id === client.id
                      ? "bg-primary/5 text-primary"
                      : ""
                  }`}
                >
                  <div>
                    <div className="font-medium">{client.name}</div>
                    {client.phone && (
                      <div className="text-xs text-muted-foreground">
                        {client.phone}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected client badge */}
          {selectedClient && selectedClient !== "walk-in" && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
              <Check className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-primary">
                {(selectedClient as Client).name}
              </span>
              <button
                type="button"
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelectedClient(null);
                  setClientSearch("");
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      );
    }

    // ── Step 2: Services + per-service staff ──────────────────────────────
    if (currentStep === 2) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Add one or more services. Assign a staff member to each.
          </p>

          {servicesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {serviceRows.map((row, index) => {
                const eligibleStaff = staffForService(row.serviceId);
                const isFirst = index === 0;
                return (
                  <div
                    key={index}
                    className="rounded-lg border border-input bg-muted/20 p-3 space-y-2"
                  >
                    {/* Row header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Service {index + 1}
                      </span>
                      {!isFirst && (
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remove service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Service select */}
                    <div className="space-y-1">
                      <Label className="text-xs">Service</Label>
                      <select
                        value={row.serviceId}
                        onChange={(e) =>
                          updateRow(index, { serviceId: e.target.value })
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">Select a service…</option>
                        {categories.length > 0
                          ? categories.map((cat) => {
                              const catServices = services.filter(
                                (s) => s.categoryId === cat.id
                              );
                              if (catServices.length === 0) return null;
                              return (
                                <optgroup key={cat.id} label={cat.name}>
                                  {catServices.map((svc) => (
                                    <option key={svc.id} value={svc.id}>
                                      {svc.name} — {svc.durationMins}min —{" "}
                                      {svc.price.toLocaleString("en", {
                                        style: "currency",
                                        currency: "USD",
                                        minimumFractionDigits: 0,
                                      })}
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })
                          : services.map((svc) => (
                              <option key={svc.id} value={svc.id}>
                                {svc.name} — {svc.durationMins}min —{" "}
                                {svc.price.toLocaleString("en", {
                                  style: "currency",
                                  currency: "USD",
                                  minimumFractionDigits: 0,
                                })}
                              </option>
                            ))}
                      </select>
                    </div>

                    {/* Staff select (shown once a service is picked) */}
                    {row.serviceId && (
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Staff for this service
                        </Label>
                        <select
                          value={row.staffId}
                          onChange={(e) =>
                            updateRow(index, { staffId: e.target.value })
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Select staff…</option>
                          {eligibleStaff.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        {eligibleStaff.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            No staff available for this service.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add another service button */}
              <button
                type="button"
                onClick={addRow}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-input px-3 py-2.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add another service
              </button>
            </div>
          )}

          {rowsError && (
            <p className="text-xs text-destructive">{rowsError}</p>
          )}

          {/* Running total */}
          {selectedServiceObjects.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
              <span>{selectedServiceObjects.length} service(s)</span>
              <span>
                {totalDuration}min &middot;{" "}
                {totalPrice.toLocaleString("en", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>
          )}
        </div>
      );
    }

    // ── Step 3: Date & Time ────────────────────────────────────────────────
    if (currentStep === 3) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose the date and start time for the appointment.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="modal-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modal-date"
                type="date"
                min={today}
                aria-invalid={!!errors.date}
                {...register("date")}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modal-time">
                Start time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modal-time"
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

          <div className="space-y-1.5">
            <Label htmlFor="modal-notes">Notes (optional)</Label>
            <textarea
              id="modal-notes"
              rows={3}
              placeholder="Any special requests or notes…"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              {...register("notes")}
            />
          </div>

          {/* ── Recurring section ──────────────────────────────────── */}
          <RecurringSection
            date={watchedDate}
            enabled={recurringEnabled}
            onToggle={() => setRecurringEnabled((v) => !v)}
            pattern={recurringPattern}
            onPatternChange={setRecurringPattern}
            occurrences={recurringOccurrences}
            onOccurrencesChange={setRecurringOccurrences}
          />

          {/* ── Staff availability widget ───────────────────────────── */}
          {primaryStaffId && watchedDate && (
            <div className="rounded-xl border border-border bg-secondary/20 px-3.5 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Staff Availability
              </p>
              {availabilityLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Checking availability…
                </div>
              ) : staffAvailability ? (
                <div className="space-y-1.5">
                  {/* Shift hours */}
                  {staffAvailability.onLeave ? (
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                      <Umbrella className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        On leave
                        {staffAvailability.leaveReason
                          ? ` — ${staffAvailability.leaveReason}`
                          : " (day off approved)"}
                      </span>
                    </div>
                  ) : staffAvailability.hasShift ? (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        Available:{" "}
                        {(() => {
                          function fmt12(t: string) {
                            const [h, m] = t.split(":").map(Number);
                            const suffix = h >= 12 ? "pm" : "am";
                            const h12 = h % 12 || 12;
                            return m === 0
                              ? `${h12}${suffix}`
                              : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
                          }
                          return `${fmt12(staffAvailability.shiftStart!)} – ${fmt12(staffAvailability.shiftEnd!)}`;
                        })()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>No shift scheduled for this day</span>
                    </div>
                  )}

                  {/* Appointment count */}
                  {staffAvailability.appointmentCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        {staffAvailability.appointmentCount} appointment
                        {staffAvailability.appointmentCount !== 1 ? "s" : ""} already booked
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      );
    }

    // ── Step 4: Confirm ────────────────────────────────────────────────────
    if (currentStep === 4) {
      const filledRows = serviceRows.filter((r) => r.serviceId && r.staffId);
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Review the appointment details before booking.
          </p>

          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            {/* Client */}
            <SummaryRow label="Client">
              {selectedClient === "walk-in" || selectedClient === null
                ? "Walk-in"
                : (selectedClient as Client).name}
            </SummaryRow>

            {/* Services with per-service staff */}
            <SummaryRow label="Services">
              <div className="text-right space-y-1">
                {filledRows.map((row) => {
                  const svc = services.find((s) => s.id === row.serviceId);
                  const staffMember = staff.find((m) => m.id === row.staffId);
                  if (!svc) return null;
                  return (
                    <div key={row.serviceId} className="text-sm">
                      <div className="font-medium">{svc.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {staffMember?.name ?? "—"} &middot; {svc.durationMins}min &middot;{" "}
                        {svc.price.toLocaleString("en", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 0,
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="text-xs text-muted-foreground font-medium pt-0.5 border-t border-border/50 mt-1">
                  Total: {totalDuration}min &middot;{" "}
                  {totalPrice.toLocaleString("en", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 0,
                  })}
                </div>
              </div>
            </SummaryRow>

            {/* Date & Time */}
            <SummaryRow label="Date & Time">
              {watchedDate
                ? new Date(watchedDate + "T00:00:00").toLocaleDateString("en", {
                    dateStyle: "medium",
                  })
                : "—"}{" "}
              at {watchedStartTime || "—"}
            </SummaryRow>

            {/* Recurring */}
            {recurringEnabled && (
              <SummaryRow label="Recurring">
                <span className="text-violet-400 font-medium">
                  {recurringPattern === "weekly"
                    ? "Weekly"
                    : recurringPattern === "biweekly"
                    ? "Every 2 weeks"
                    : "Monthly"}{" "}
                  &times; {recurringOccurrences}
                </span>
              </SummaryRow>
            )}
          </div>

          {serverError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {serverError}
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  const stepLabel = STEPS.find((s) => s.id === currentStep)?.label ?? "Appointment";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger render={<Button className="flex items-center gap-2" />}>
        <Plus className="w-4 h-4" />
        New Appointment
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Appointment — {stepLabel}</DialogTitle>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {renderStep()}

          {/* Footer nav */}
          <div className="-mx-4 -mb-4 flex items-center justify-between gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goBack}
              disabled={currentStep === 1 || isSubmitting}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            {currentStep < 4 ? (
              <Button type="button" size="sm" onClick={goNext} disabled={isSubmitting}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Booking…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Confirm & Book
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Summary row sub-component ────────────────────────────────────────────────

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{children}</span>
    </div>
  );
}

// ─── Recurring section sub-component ─────────────────────────────────────────

const PATTERN_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

function addRecurringDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return date.toISOString().split("T")[0];
}

function addRecurringMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1 + months, d);
  if (date.getMonth() !== ((m - 1 + months) % 12 + 12) % 12) {
    date.setDate(0);
  }
  return date.toISOString().split("T")[0];
}

function previewDates(
  startDate: string,
  pattern: "weekly" | "biweekly" | "monthly",
  occurrences: number
): string[] {
  const dates: string[] = [];
  for (let i = 0; i < occurrences; i++) {
    if (pattern === "weekly") dates.push(addRecurringDays(startDate, i * 7));
    else if (pattern === "biweekly") dates.push(addRecurringDays(startDate, i * 14));
    else dates.push(addRecurringMonths(startDate, i));
  }
  return dates;
}

function fmtShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

interface RecurringSectionProps {
  date: string;
  enabled: boolean;
  onToggle: () => void;
  pattern: "weekly" | "biweekly" | "monthly";
  onPatternChange: (p: "weekly" | "biweekly" | "monthly") => void;
  occurrences: number;
  onOccurrencesChange: (n: number) => void;
}

function RecurringSection({
  date,
  enabled,
  onToggle,
  pattern,
  onPatternChange,
  occurrences,
  onOccurrencesChange,
}: RecurringSectionProps) {
  const preview = date ? previewDates(date, pattern, occurrences) : [];

  return (
    <div className="rounded-xl border border-border bg-violet-500/5 px-3.5 py-3 space-y-3">
      {/* Toggle header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-violet-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Recurring
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
            enabled ? "bg-violet-500" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Options (only when enabled) */}
      {enabled && (
        <div className="space-y-3">
          {/* Pattern */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Pattern</Label>
              <select
                value={pattern}
                onChange={(e) =>
                  onPatternChange(e.target.value as "weekly" | "biweekly" | "monthly")
                }
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Repeat for</Label>
              <select
                value={occurrences}
                onChange={(e) => onOccurrencesChange(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {[2, 3, 4, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} times
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
              <span className="font-medium text-foreground">
                Creates {preview.length} appointments:{" "}
              </span>
              {preview.map((d, i) => (
                <span key={d}>
                  {fmtShort(d)}
                  {i < preview.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
