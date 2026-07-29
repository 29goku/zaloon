"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { saveLoyaltySettings } from "@/app/actions/settings";
import type { LoyaltySettings } from "@/app/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Award, Gift, Star, Repeat, DollarSign } from "lucide-react";

// ── Schema ───────────────────────────────────────────────────────────────────

const tierSchema = z.object({
  name: z.string().min(1),
  minPoints: z.number().min(0),
});

const formSchema = z.object({
  tiers: z.tuple([tierSchema, tierSchema, tierSchema, tierSchema]),
  pointsPerDollar: z.number().min(0.1, "Must be at least 0.1").max(100),
  firstVisitBonus: z.number().min(0).max(10000),
  referralBonus: z.number().min(0).max(10000),
  birthdayBonus: z.number().min(0).max(10000),
  redemptionRate: z.number().min(1, "Must be at least 1").max(10000),
  minimumRedeem: z.number().min(0).max(100000),
});

type FormValues = z.infer<typeof formSchema>;

// ── Component ────────────────────────────────────────────────────────────────

interface LoyaltySettingsFormProps {
  initial: LoyaltySettings;
}

export function LoyaltySettingsForm({ initial }: LoyaltySettingsFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tiers: [
        initial.tiers[0] ?? { name: "Bronze", minPoints: 0 },
        initial.tiers[1] ?? { name: "Silver", minPoints: 500 },
        initial.tiers[2] ?? { name: "Gold", minPoints: 1500 },
        initial.tiers[3] ?? { name: "Platinum", minPoints: 3000 },
      ] as [
        { name: string; minPoints: number },
        { name: string; minPoints: number },
        { name: string; minPoints: number },
        { name: string; minPoints: number },
      ],
      pointsPerDollar: initial.pointsPerDollar,
      firstVisitBonus: initial.firstVisitBonus,
      referralBonus: initial.referralBonus,
      birthdayBonus: initial.birthdayBonus,
      redemptionRate: initial.redemptionRate,
      minimumRedeem: initial.minimumRedeem,
    },
  });

  async function onSubmit(values: FormValues) {
    const result = await saveLoyaltySettings({
      tiers: values.tiers as LoyaltySettings["tiers"],
      pointsPerDollar: values.pointsPerDollar,
      firstVisitBonus: values.firstVisitBonus,
      referralBonus: values.referralBonus,
      birthdayBonus: values.birthdayBonus,
      redemptionRate: values.redemptionRate,
      minimumRedeem: values.minimumRedeem,
    });

    if (result.success) {
      toast.success("Saved", "Loyalty settings updated successfully.");
      router.refresh();
    } else {
      toast.error("Save failed", result.error);
    }
  }

  const inputClass =
    "mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm focus-visible:ring-primary";

  const tierColors = [
    "text-amber-600 dark:text-amber-400",
    "text-slate-500 dark:text-slate-300",
    "text-yellow-600 dark:text-yellow-400",
    "text-cyan-600 dark:text-cyan-400",
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* ── Tier Configuration ─────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Tier Configuration
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Set names and minimum points for each loyalty tier. The first tier starts at 0.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {([0, 1, 2, 3] as const).map((idx) => (
              <div key={idx} className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <Label
                    htmlFor={`tier-name-${idx}`}
                    className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"
                  >
                    <span className={`w-2 h-2 rounded-full bg-current ${tierColors[idx]}`} />
                    Tier {idx + 1} Name
                  </Label>
                  <Controller
                    name={`tiers.${idx}.name`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        id={`tier-name-${idx}`}
                        {...field}
                        placeholder={["Bronze", "Silver", "Gold", "Platinum"][idx]}
                        className={inputClass}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label
                    htmlFor={`tier-min-${idx}`}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                  >
                    Min Points
                  </Label>
                  <Controller
                    name={`tiers.${idx}.minPoints`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        id={`tier-min-${idx}`}
                        type="number"
                        min={0}
                        step={1}
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        disabled={idx === 0}
                        className={`${inputClass} ${idx === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                      />
                    )}
                  />
                  {idx === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Always starts at 0</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Points Earning Rules ───────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            Points Earning Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Points per dollar */}
            <div>
              <Label
                htmlFor="pointsPerDollar"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                Points per $1 spent
              </Label>
              <Controller
                name="pointsPerDollar"
                control={control}
                render={({ field }) => (
                  <Input
                    id="pointsPerDollar"
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={field.value}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                    className={inputClass}
                  />
                )}
              />
              {errors.pointsPerDollar && (
                <p className="text-destructive text-xs mt-1">{errors.pointsPerDollar.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Default: 1 pt per $1</p>
            </div>

            {/* First visit bonus */}
            <div>
              <Label
                htmlFor="firstVisitBonus"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                First Visit Bonus (pts)
              </Label>
              <Controller
                name="firstVisitBonus"
                control={control}
                render={({ field }) => (
                  <Input
                    id="firstVisitBonus"
                    type="number"
                    min={0}
                    step={1}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    className={inputClass}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">Default: 50 pts</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Referral bonus */}
            <div>
              <Label
                htmlFor="referralBonus"
                className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"
              >
                <Gift className="w-3 h-3" /> Referral Bonus (pts)
              </Label>
              <Controller
                name="referralBonus"
                control={control}
                render={({ field }) => (
                  <Input
                    id="referralBonus"
                    type="number"
                    min={0}
                    step={1}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    className={inputClass}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">Default: 100 pts</p>
            </div>

            {/* Birthday bonus */}
            <div>
              <Label
                htmlFor="birthdayBonus"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                Birthday Bonus (pts)
              </Label>
              <Controller
                name="birthdayBonus"
                control={control}
                render={({ field }) => (
                  <Input
                    id="birthdayBonus"
                    type="number"
                    min={0}
                    step={1}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    className={inputClass}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">Default: 200 pts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Redemption Rules ──────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="w-4 h-4 text-primary" />
            Redemption Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Redemption rate */}
            <div>
              <Label
                htmlFor="redemptionRate"
                className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"
              >
                <DollarSign className="w-3 h-3" /> Points per $1 discount
              </Label>
              <Controller
                name="redemptionRate"
                control={control}
                render={({ field }) => (
                  <Input
                    id="redemptionRate"
                    type="number"
                    min={1}
                    step={1}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 100)}
                    className={inputClass}
                  />
                )}
              />
              {errors.redemptionRate && (
                <p className="text-destructive text-xs mt-1">{errors.redemptionRate.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Default: 100 pts = $1</p>
            </div>

            {/* Minimum to redeem */}
            <div>
              <Label
                htmlFor="minimumRedeem"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                Minimum Points to Redeem
              </Label>
              <Controller
                name="minimumRedeem"
                control={control}
                render={({ field }) => (
                  <Input
                    id="minimumRedeem"
                    type="number"
                    min={0}
                    step={1}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    className={inputClass}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">Default: 500 pts minimum</p>
            </div>
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
          {isSubmitting ? "Saving..." : "Save Loyalty Settings"}
        </Button>
      </div>
    </form>
  );
}
