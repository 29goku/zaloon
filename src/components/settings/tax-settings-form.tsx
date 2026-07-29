"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { saveTaxSettings } from "@/app/actions/settings";
import type { TaxSettings } from "@/app/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Percent, Plus, Trash2, Receipt, Info } from "lucide-react";

// ── Schema ───────────────────────────────────────────────────────────────────

const additionalTaxSchema = z.object({
  name: z.string().min(1, "Name required"),
  rate: z.number().min(0, "Must be >= 0").max(100, "Max 100%"),
});

const formSchema = z.object({
  enabled: z.boolean(),
  taxName: z.string().min(1, "Tax name required"),
  taxRate: z.number().min(0).max(100),
  taxNumber: z.string(),
  includeTaxInPrice: z.boolean(),
  taxableItems: z.enum(["all", "services_only", "products_only"]),
  additionalTaxes: z.array(additionalTaxSchema),
});

type FormValues = z.infer<typeof formSchema>;

// ── Component ────────────────────────────────────────────────────────────────

interface TaxSettingsFormProps {
  initial: TaxSettings;
}

export function TaxSettingsForm({ initial }: TaxSettingsFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      enabled: initial.enabled,
      taxName: initial.taxName,
      taxRate: initial.taxRate,
      taxNumber: initial.taxNumber,
      includeTaxInPrice: initial.includeTaxInPrice,
      taxableItems: initial.taxableItems,
      additionalTaxes: initial.additionalTaxes,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalTaxes",
  });

  const watchedValues = watch();
  const exampleBase = 100;
  const mainTaxAmt = watchedValues.includeTaxInPrice
    ? exampleBase - exampleBase / (1 + watchedValues.taxRate / 100)
    : exampleBase * (watchedValues.taxRate / 100);
  const exSubtotal = watchedValues.includeTaxInPrice
    ? exampleBase - mainTaxAmt
    : exampleBase;
  const exTotal = watchedValues.includeTaxInPrice
    ? exampleBase
    : exampleBase + mainTaxAmt;

  async function onSubmit(values: FormValues) {
    const result = await saveTaxSettings(values);
    if (result.success) {
      toast.success("Saved", "Tax settings updated successfully.");
      router.refresh();
    } else {
      toast.error("Save failed", result.error);
    }
  }

  const inputClass =
    "mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* ── Enable / Disable ─────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            Tax Configuration
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Configure how taxes are calculated and applied to invoices.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Tax Collection</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Show tax on invoices and track tax collected
              </p>
            </div>
            <Controller
              name="enabled"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    field.value ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      field.value ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              )}
            />
          </div>

          {/* Tax name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Tax Name
              </Label>
              <Input
                {...register("taxName")}
                placeholder="e.g. GST, VAT, Sales Tax, HST"
                className={inputClass}
              />
              {errors.taxName && (
                <p className="text-destructive text-xs mt-1">{errors.taxName.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Shown on invoices (e.g. "GST")
              </p>
            </div>

            {/* Tax rate */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Tax Rate (%)
              </Label>
              <Controller
                name="taxRate"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={field.value}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                )}
              />
              {errors.taxRate && (
                <p className="text-destructive text-xs mt-1">{errors.taxRate.message}</p>
              )}
            </div>
          </div>

          {/* Tax number */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Tax Registration Number
            </Label>
            <Input
              {...register("taxNumber")}
              placeholder="e.g. GST 123-456-789"
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Printed on invoices for compliance
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Pricing & Items ───────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Pricing &amp; Taxable Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Tax-inclusive toggle */}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Tax-Inclusive Prices</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prices already include tax (back-calculate tax from total)
              </p>
            </div>
            <Controller
              name="includeTaxInPrice"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    field.value ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      field.value ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              )}
            />
          </div>

          {/* Taxable items radio */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">
              Taxable Items
            </Label>
            <div className="space-y-2">
              {(
                [
                  { value: "all", label: "All items (services + products)" },
                  { value: "services_only", label: "Services only" },
                  { value: "products_only", label: "Products only" },
                ] as const
              ).map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <Controller
                    name="taxableItems"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="radio"
                        value={value}
                        checked={field.value === value}
                        onChange={() => field.onChange(value)}
                        className="w-4 h-4 accent-primary"
                      />
                    )}
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Additional Taxes ──────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Additional Taxes
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Add secondary taxes such as city tax, service charge, or provincial tax.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground py-2 text-center">
              No additional taxes configured.
            </p>
          )}
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Name
                </Label>
                <Input
                  {...register(`additionalTaxes.${index}.name`)}
                  placeholder="e.g. City Tax"
                  className={inputClass}
                />
                {errors.additionalTaxes?.[index]?.name && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.additionalTaxes[index]?.name?.message}
                  </p>
                )}
              </div>
              <div className="w-28">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Rate (%)
                </Label>
                <Controller
                  name={`additionalTaxes.${index}.rate`}
                  control={control}
                  render={({ field: f }) => (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={f.value}
                      onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                      className={inputClass}
                    />
                  )}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="mb-1 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: "", rate: 0 })}
            className="mt-2 rounded-xl border-dashed"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Tax
          </Button>
        </CardContent>
      </Card>

      {/* ── Preview ───────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Invoice Preview
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            How tax will appear on a $100 service.
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-secondary rounded-xl p-4 font-mono text-sm space-y-1.5 max-w-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Service:</span>
              <span>${exampleBase.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span>${exSubtotal.toFixed(2)}</span>
            </div>
            {watchedValues.taxRate > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>
                  {watchedValues.taxName || "Tax"} ({watchedValues.taxRate}%):
                </span>
                <span>${mainTaxAmt.toFixed(2)}</span>
              </div>
            )}
            {watchedValues.additionalTaxes.map((at) =>
              at.rate > 0 ? (
                <div key={at.name} className="flex justify-between text-muted-foreground">
                  <span>
                    {at.name || "Extra"} ({at.rate}%):
                  </span>
                  <span>${(exSubtotal * (at.rate / 100)).toFixed(2)}</span>
                </div>
              ) : null
            )}
            <div className="border-t border-border pt-1.5 flex justify-between font-semibold text-foreground">
              <span>Total:</span>
              <span>${exTotal.toFixed(2)}</span>
            </div>
            {watchedValues.includeTaxInPrice && (
              <p className="text-xs text-muted-foreground pt-1">
                * Price is tax-inclusive
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pb-8">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground px-6 py-3 h-auto rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {isSubmitting ? "Saving..." : "Save Tax Settings"}
        </Button>
      </div>
    </form>
  );
}
