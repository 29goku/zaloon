"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getIntakeFormFields, saveClientIntakeResponse } from "@/app/actions/intake";
import type { IntakeField } from "@/app/actions/intake";
import {
  ClipboardList,
  Edit2,
  Check,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";

export interface ClientCustomFieldsProps {
  clientId: string;
  preferences: string | null;
}

export function ClientCustomFields({ clientId, preferences }: ClientCustomFieldsProps) {
  const router = useRouter();
  const [fields, setFields] = useState<IntakeField[]>([]);
  const [prefs, setPrefs] = useState<Record<string, unknown>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string | boolean>("");
  const [isPending, startTransition] = useTransition();
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    void getIntakeFormFields().then((f) => {
      // Only show custom (non-default) fields
      setFields(f.filter((field) => !field.isDefault));
    });
    try {
      setPrefs(JSON.parse(preferences ?? "{}") as Record<string, unknown>);
    } catch {
      setPrefs({});
    }
  }, [preferences]);

  function startEdit(field: IntakeField) {
    const current = prefs[field.id];
    if (field.type === "boolean") {
      setEditValue(current === true || current === "true");
    } else {
      setEditValue(typeof current === "string" ? current : typeof current === "number" ? String(current) : "");
    }
    setEditingId(field.id);
  }

  function handleSave(field: IntakeField) {
    startTransition(async () => {
      const response: Record<string, string | boolean | number> = {};
      if (field.type === "boolean") {
        response[field.id] = editValue as boolean;
      } else if (field.type === "number") {
        response[field.id] = Number(editValue);
      } else {
        response[field.id] = editValue as string;
      }

      const result = await saveClientIntakeResponse(clientId, response);
      if (result.success) {
        setPrefs((p) => ({ ...p, [field.id]: response[field.id] }));
        setSavedId(field.id);
        setTimeout(() => setSavedId(null), 1500);
        router.refresh();
      }
      setEditingId(null);
    });
  }

  function renderValue(field: IntakeField) {
    const val = prefs[field.id];
    if (val === undefined || val === null || val === "") {
      return <span className="text-muted-foreground italic text-xs">Not provided</span>;
    }
    if (field.type === "boolean") {
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            val === true || val === "true"
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {val === true || val === "true" ? "Yes" : "No"}
        </span>
      );
    }
    return <span className="text-sm text-foreground">{String(val)}</span>;
  }

  function renderEditor(field: IntakeField) {
    if (field.type === "longtext") {
      return (
        <textarea
          value={typeof editValue === "string" ? editValue : ""}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          autoFocus
        />
      );
    }
    if (field.type === "boolean") {
      return (
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={editValue === true}
            onChange={(e) => setEditValue(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-sm text-foreground">Yes</span>
        </label>
      );
    }
    if (field.type === "choice" && field.options) {
      return (
        <div className="space-y-1.5">
          {field.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name={`edit-${field.id}`}
                value={opt}
                checked={editValue === opt}
                onChange={() => setEditValue(opt)}
                className="w-4 h-4 border-border"
              />
              <span className="text-sm text-foreground">{opt}</span>
            </label>
          ))}
        </div>
      );
    }
    if (field.type === "dropdown" && field.options) {
      return (
        <div className="relative">
          <select
            value={typeof editValue === "string" ? editValue : ""}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none pr-8"
          >
            <option value="">Select...</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      );
    }
    return (
      <input
        type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
        value={typeof editValue === "string" ? editValue : ""}
        onChange={(e) => setEditValue(e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        autoFocus
      />
    );
  }

  if (fields.length === 0) {
    return (
      <div className="py-6 text-center">
        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground">No custom intake fields configured.</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add fields in <a href="/dashboard/settings/intake-form" className="underline hover:text-foreground">Settings &rarr; Intake Form</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fields.map((field) => {
        const isEditing = editingId === field.id;
        const isSaved = savedId === field.id;

        return (
          <div key={field.id} className="rounded-xl border border-border bg-secondary/10 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </span>

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => startEdit(field)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                {renderEditor(field)}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(field)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {renderValue(field)}
                {isSaved && (
                  <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
