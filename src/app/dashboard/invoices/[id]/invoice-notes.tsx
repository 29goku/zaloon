"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, StickyNote, User } from "lucide-react";
import { addInvoiceNote } from "@/app/actions/invoices";

interface Props {
  invoiceId: string;
  initialInternalNotes: string | null;
  initialClientNotes: string | null;
}

export function InvoiceNotes({ invoiceId, initialInternalNotes, initialClientNotes }: Props) {
  const router = useRouter();
  const [internalNotes, setInternalNotes] = useState(initialInternalNotes ?? "");
  const [clientNotes, setClientNotes] = useState(initialClientNotes ?? "");
  const [savingInternal, startSavingInternal] = useTransition();
  const [savingClient, startSavingClient] = useTransition();
  const [internalSaved, setInternalSaved] = useState(false);
  const [clientSaved, setClientSaved] = useState(false);

  function saveInternal() {
    startSavingInternal(async () => {
      const res = await addInvoiceNote(invoiceId, internalNotes, true);
      if (res.success) {
        setInternalSaved(true);
        setTimeout(() => setInternalSaved(false), 2000);
        router.refresh();
      } else {
        alert(res.error ?? "Failed to save note");
      }
    });
  }

  function saveClient() {
    startSavingClient(async () => {
      const res = await addInvoiceNote(invoiceId, clientNotes, false);
      if (res.success) {
        setClientSaved(true);
        setTimeout(() => setClientSaved(false), 2000);
        router.refresh();
      } else {
        alert(res.error ?? "Failed to save note");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Internal notes */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <StickyNote className="w-4 h-4 text-primary" />
          Internal Notes
          <span className="text-xs font-normal text-muted-foreground ml-1">(staff only, not printed)</span>
        </div>
        <textarea
          className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
          placeholder="Add internal notes for staff..."
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
        />
        <div className="flex items-center justify-end gap-2">
          {internalSaved && (
            <span className="text-xs text-primary">Saved!</span>
          )}
          <button
            type="button"
            onClick={saveInternal}
            disabled={savingInternal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {savingInternal ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Client-facing notes */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="w-4 h-4 text-primary" />
          Client Notes
          <span className="text-xs font-normal text-muted-foreground ml-1">(shown on invoice PDF)</span>
        </div>
        <textarea
          className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
          placeholder="Add a note visible to the client on printed invoices..."
          value={clientNotes}
          onChange={(e) => setClientNotes(e.target.value)}
        />
        <div className="flex items-center justify-end gap-2">
          {clientSaved && (
            <span className="text-xs text-primary">Saved!</span>
          )}
          <button
            type="button"
            onClick={saveClient}
            disabled={savingClient}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {savingClient ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
