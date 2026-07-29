"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Gift, Copy, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { issueGiftCard } from "@/app/actions/gift-cards";

const schema = z.object({
  initialValue: z
    .string()
    .min(1, "Value is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
  purchasedBy: z.string().optional(),
  recipientName: z.string().optional(),
  expiresAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function IssueGiftCardDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [generatedCode, setGeneratedCode] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    const result = await issueGiftCard({
      initialValue: Number(values.initialValue),
      purchasedBy: values.purchasedBy || undefined,
      recipientName: values.recipientName || undefined,
      expiresAt: values.expiresAt || undefined,
    });

    if (!result.success) {
      // Surface error inline — could use toast if available
      alert(result.error);
      return;
    }

    setGeneratedCode(result.code);
    router.refresh();
  }

  async function handleCopy() {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setOpen(false);
    // Reset after animation completes
    setTimeout(() => {
      setGeneratedCode(null);
      setCopied(false);
      reset();
    }, 200);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="w-4 h-4 mr-1" />
            Issue Gift Card
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        {generatedCode ? (
          // Success state — show the generated code
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Gift Card Issued!
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Share this code with the recipient. Keep it safe — it can be used at checkout.
              </p>

              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-border bg-muted/50 px-4 py-4 text-center">
                  <span className="text-2xl font-mono font-bold tracking-[0.2em] text-foreground">
                    {generatedCode}
                  </span>
                </div>
                <Button variant="outline" size="icon-sm" onClick={handleCopy} className="flex-shrink-0 h-14 w-14 rounded-xl">
                  {copied ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          // Issue form
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Issue Gift Card
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Initial value */}
              <div className="space-y-1.5">
                <Label htmlFor="initialValue">
                  Value <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id="initialValue"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="50.00"
                    className="pl-7"
                    aria-invalid={!!errors.initialValue}
                    {...register("initialValue")}
                  />
                </div>
                {errors.initialValue && (
                  <p className="text-xs text-destructive">{errors.initialValue.message}</p>
                )}
              </div>

              {/* Purchaser */}
              <div className="space-y-1.5">
                <Label htmlFor="purchasedBy">Purchaser name / email</Label>
                <Input
                  id="purchasedBy"
                  type="text"
                  placeholder="Jane Smith"
                  {...register("purchasedBy")}
                />
              </div>

              {/* Recipient */}
              <div className="space-y-1.5">
                <Label htmlFor="recipientName">Recipient name</Label>
                <Input
                  id="recipientName"
                  type="text"
                  placeholder="John Doe"
                  {...register("recipientName")}
                />
              </div>

              {/* Expiry */}
              <div className="space-y-1.5">
                <Label htmlFor="expiresAt">Expiry date (optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  {...register("expiresAt")}
                />
              </div>
            </div>

            <DialogFooter showCloseButton>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Issuing…
                  </>
                ) : (
                  "Issue Card"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
