"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Phone,
  Mail,
  Cake,
  Heart,
  FileText,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateClient, deleteClient } from "@/app/actions/clients";

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  birthday: z.string().optional(),
  notes: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

export type ClientForSheet = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthday: Date | null;
  anniversary: Date | null;
  notes: string | null;
  createdAt: Date;
  loyaltyPoints?: number;
  _count: { appointments: number };
  ledgerBalance: number;
  /** Total amount spent across all appointments (optional — not shown in sheet) */
  totalSpent?: number;
  /** Most recent appointment date as "YYYY-MM-DD" string or null (optional) */
  lastVisit?: string | null;
};

interface ClientDetailSheetProps {
  client: ClientForSheet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export function ClientDetailSheet({
  client,
  open,
  onOpenChange,
}: ClientDetailSheetProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: client.name,
      phone: client.phone ?? "",
      email: client.email ?? "",
      birthday: toDateInputValue(client.birthday),
      notes: client.notes ?? "",
    },
  });

  function startEdit() {
    reset({
      name: client.name,
      phone: client.phone ?? "",
      email: client.email ?? "",
      birthday: toDateInputValue(client.birthday),
      notes: client.notes ?? "",
    });
    setEditing(true);
    setServerError(null);
  }

  function cancelEdit() {
    setEditing(false);
    setServerError(null);
  }

  async function onSubmit(values: EditFormValues) {
    setServerError(null);
    const result = await updateClient(client.id, values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const result = await deleteClient(client.id);
    if (!result.success) {
      setServerError(result.error);
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  const balanceColor =
    client.ledgerBalance > 0
      ? "text-green-600 dark:text-green-400"
      : client.ledgerBalance < 0
      ? "text-destructive"
      : "text-foreground";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#F48E16]/20 flex items-center justify-center text-[#F48E16] font-bold text-lg flex-shrink-0">
              {client.name[0].toUpperCase()}
            </div>
            <div>
              <SheetTitle className="text-lg">{client.name}</SheetTitle>
              <SheetDescription>
                Client since{" "}
                {new Date(client.createdAt).toLocaleDateString("en", {
                  month: "short",
                  year: "numeric",
                })}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Stats row */}
        <div className="px-6 py-4 border-b border-border flex gap-6">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {client._count.appointments}
            </p>
            <p className="text-xs text-muted-foreground">visits</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${balanceColor}`}>
              {client.ledgerBalance >= 0 ? "+" : ""}
              {client.ledgerBalance.toLocaleString("en", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-muted-foreground">balance</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 flex-1">
          {editing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" type="tel" {...register("phone")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-birthday">Birthday</Label>
                <Input id="edit-birthday" type="date" {...register("birthday")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea id="edit-notes" {...register("notes")} />
              </div>

              {serverError && (
                <p className="text-xs text-destructive">{serverError}</p>
              )}

              <div className="flex gap-2 mt-2">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{client.email}</span>
                </div>
              )}
              {client.birthday && (
                <div className="flex items-center gap-3">
                  <Cake className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="text-sm">{formatDate(client.birthday)}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">birthday</span>
                  </div>
                </div>
              )}
              {client.anniversary && (
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="text-sm">{formatDate(client.anniversary)}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">anniversary</span>
                  </div>
                </div>
              )}
              {client.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {client.notes}
                  </p>
                </div>
              )}
              {!client.phone &&
                !client.email &&
                !client.birthday &&
                !client.anniversary &&
                !client.notes && (
                  <p className="text-sm text-muted-foreground">No details added yet.</p>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!editing && (
          <SheetFooter className="border-t border-border">
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={startEdit}
              >
                <Pencil className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : confirmDelete ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm delete
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </Button>
            </div>
            {serverError && (
              <p className="text-xs text-destructive w-full">{serverError}</p>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
