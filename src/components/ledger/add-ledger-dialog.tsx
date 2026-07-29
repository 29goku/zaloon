"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createLedgerEntry } from "@/app/actions/ledger";

const formSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  type: z.enum(["CREDIT", "DEBIT"]),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Client {
  id: string;
  name: string;
}

interface AddLedgerDialogProps {
  clients: Client[];
}

export function AddLedgerDialog({ clients }: AddLedgerDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "CREDIT",
    },
  });

  const selectedClientId = watch("clientId");
  const selectedType = watch("type");

  const filteredClients = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, search]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset();
      setSearch("");
    }
  }

  async function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createLedgerEntry({
        clientId: values.clientId,
        type: values.type,
        amount: Number(values.amount),
        note: values.note || undefined,
      });

      if (result.success) {
        setOpen(false);
        reset();
        setSearch("");
        router.refresh();
      } else {
        // Surface error — could use toast here
        alert(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" />
        }
      >
        <Plus className="w-4 h-4" />
        Add Entry
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Ledger Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Client searchable picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Client</label>
            <Input
              placeholder="Search clients…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                // Clear selection when user types to search again
                if (selectedClient && e.target.value !== selectedClient.name) {
                  setValue("clientId", "", { shouldValidate: false });
                }
              }}
              className="h-9"
            />
            {/* Show list only when not yet selected or search is active */}
            {(!selectedClientId || search !== selectedClient?.name) &&
              filteredClients.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
                  {filteredClients.slice(0, 20).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => {
                        setValue("clientId", c.id, { shouldValidate: true });
                        setSearch(c.name);
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            {selectedClientId && search === selectedClient?.name && (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selectedClient.name}</span>
              </p>
            )}
            {errors.clientId && (
              <p className="text-xs text-destructive">{errors.clientId.message}</p>
            )}
          </div>

          {/* Type toggle */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValue("type", "CREDIT", { shouldValidate: true })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === "CREDIT"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                Credit
              </button>
              <button
                type="button"
                onClick={() => setValue("type", "DEBIT", { shouldValidate: true })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === "DEBIT"
                    ? "bg-[#F41666] text-white"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                Debit
              </button>
            </div>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="h-9"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Note (optional)</label>
            <Input
              placeholder="e.g. Advance payment, refund…"
              className="h-9"
              {...register("note")}
            />
          </div>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending} className="min-w-24">
              {isPending ? "Saving…" : "Add Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
