"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Loader2, RefreshCw } from "lucide-react";

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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createExpense, updateExpense } from "@/app/actions/expenses";
import {
  EXPENSE_CATEGORIES,
  SUBCATEGORIES,
  CATEGORY_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type ExpenseCategory,
} from "@/app/actions/expenses-constants";

// ── Form schema ────────────────────────────────────────────────────────────────

const CATEGORY_VALUES = [
  "RENT_UTILITIES",
  "PRODUCTS_SUPPLIES",
  "STAFF",
  "MARKETING",
  "EQUIPMENT",
  "OTHER",
] as const;

const PAYMENT_VALUES = ["CASH", "CARD", "TRANSFER"] as const;

const formSchema = z.object({
  category: z.enum(CATEGORY_VALUES),
  subcategory: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Amount must be a positive number",
    }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  vendor: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_VALUES),
  isRecurring: z.boolean(),
  recurringDay: z.string().optional(),
  notes: z.string().optional(),
  receipt: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

// ── Types ──────────────────────────────────────────────────────────────────────

interface ExpenseFormDialogProps {
  /** When provided the dialog is in edit mode */
  expense?: {
    id: string;
    category: string;
    subcategory: string | null;
    description: string;
    amount: number;
    date: string;
    vendor: string | null;
    paymentMethod: string;
    isRecurring: boolean;
    recurringDay: number | null;
    notes: string | null;
    receipt: string | null;
  };
  /** Custom trigger element, defaults to "Add Expense" button */
  trigger?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ExpenseFormDialog({ expense, trigger }: ExpenseFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();
  const isEdit = !!expense;

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          category: expense.category as typeof EXPENSE_CATEGORIES[number],
          subcategory: expense.subcategory ?? "",
          description: expense.description,
          amount: String(expense.amount),
          date: expense.date,
          vendor: expense.vendor ?? "",
          paymentMethod: (expense.paymentMethod as typeof PAYMENT_METHODS[number]) ?? "CASH",
          isRecurring: expense.isRecurring,
          recurringDay: expense.recurringDay ? String(expense.recurringDay) : "",
          notes: expense.notes ?? "",
          receipt: expense.receipt ?? "",
        }
      : {
          category: undefined,
          subcategory: "",
          description: "",
          amount: "",
          date: today,
          vendor: "",
          paymentMethod: "CASH",
          isRecurring: false,
          recurringDay: "",
          notes: "",
          receipt: "",
        },
  });

  const selectedCategory = watch("category");
  const isRecurring = watch("isRecurring");

  // Reset subcategory when category changes
  React.useEffect(() => {
    if (!isEdit) {
      setValue("subcategory", "");
    }
  }, [selectedCategory, isEdit, setValue]);

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const payload = {
      category: values.category,
      subcategory: values.subcategory || undefined,
      description: values.description,
      amount: parseFloat(values.amount),
      date: values.date,
      vendor: values.vendor || undefined,
      paymentMethod: values.paymentMethod,
      isRecurring: values.isRecurring,
      recurringDay:
        values.isRecurring && values.recurringDay
          ? parseInt(values.recurringDay, 10)
          : null,
      notes: values.notes || undefined,
      receipt: values.receipt || undefined,
    };

    const result = isEdit
      ? await updateExpense(expense.id, payload)
      : await createExpense(payload);

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

  const subcategoryOptions = selectedCategory
    ? (SUBCATEGORIES[selectedCategory as ExpenseCategory] ?? [])
    : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ? (
            <span />
          ) : isEdit ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" />
          ) : (
            <Button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" />
          )
        }
      >
        {trigger ?? (
          isEdit ? (
            <>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Expense
            </>
          )
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
          {/* Row: Category + Subcategory */}
          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) => field.onChange(val)}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!errors.category}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category.message}</p>
              )}
            </div>

            {/* Subcategory */}
            <div className="flex flex-col gap-1.5">
              <Label>Subcategory</Label>
              <Controller
                name="subcategory"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) => field.onChange(val)}
                    disabled={!selectedCategory || subcategoryOptions.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {subcategoryOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              id="exp-description"
              placeholder="e.g. Monthly rent payment"
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Row: Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                aria-invalid={!!errors.amount}
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="exp-date"
                type="date"
                aria-invalid={!!errors.date}
                {...register("date")}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>

          {/* Row: Vendor + Payment method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-vendor">Vendor / Payee</Label>
              <Input
                id="exp-vendor"
                placeholder="e.g. Office Depot"
                {...register("vendor")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Payment Method</Label>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? "CASH"}
                    onValueChange={(val) => field.onChange(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3 bg-secondary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <Label className="cursor-pointer font-medium">Recurring Expense</Label>
              </div>
              <Controller
                name="isRecurring"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {isRecurring && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-recurring-day" className="text-sm">
                  Day of Month (1–31)
                </Label>
                <Input
                  id="exp-recurring-day"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="e.g. 1"
                  className="w-28"
                  {...register("recurringDay")}
                />
                <p className="text-xs text-muted-foreground">
                  The day of each month this expense recurs.
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-notes">Notes</Label>
            <Textarea
              id="exp-notes"
              placeholder="Additional details…"
              className="resize-none"
              rows={2}
              {...register("notes")}
            />
          </div>

          {/* Receipt URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-receipt">Receipt URL</Label>
            <Input
              id="exp-receipt"
              type="url"
              placeholder="https://…"
              aria-invalid={!!errors.receipt}
              {...register("receipt")}
            />
            {errors.receipt && (
              <p className="text-xs text-destructive">{errors.receipt.message}</p>
            )}
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
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Add Expense"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
