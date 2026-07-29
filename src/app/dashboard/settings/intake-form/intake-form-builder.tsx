"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  CheckSquare,
  ListChecks,
  ChevronDown,
  GripVertical,
  Trash2,
  Plus,
  Shield,
  ChevronUp,
  Save,
  Loader2,
} from "lucide-react";
import type { IntakeField } from "@/app/actions/intake";
import { saveIntakeFormFields } from "@/app/actions/intake";
import { AddFieldDialog } from "@/components/intake/add-field-dialog";

const TYPE_ICONS: Record<IntakeField["type"], React.ReactNode> = {
  text: <Type className="w-3.5 h-3.5" />,
  longtext: <AlignLeft className="w-3.5 h-3.5" />,
  number: <Hash className="w-3.5 h-3.5" />,
  date: <Calendar className="w-3.5 h-3.5" />,
  boolean: <CheckSquare className="w-3.5 h-3.5" />,
  choice: <ListChecks className="w-3.5 h-3.5" />,
  dropdown: <ChevronDown className="w-3.5 h-3.5" />,
};

const TYPE_LABELS: Record<IntakeField["type"], string> = {
  text: "Text",
  longtext: "Long Text",
  number: "Number",
  date: "Date",
  boolean: "Yes/No",
  choice: "Multiple Choice",
  dropdown: "Dropdown",
};

interface IntakeFormBuilderProps {
  initialFields: IntakeField[];
}

export function IntakeFormBuilder({ initialFields }: IntakeFormBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fields, setFields] = useState<IntakeField[]>(initialFields);
  const [showDialog, setShowDialog] = useState(false);
  const [saved, setSaved] = useState(false);

  const customFields = fields.filter((f) => !f.isDefault);
  const defaultFields = fields.filter((f) => f.isDefault);

  function moveField(id: string, dir: "up" | "down") {
    const idx = customFields.findIndex((f) => f.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === customFields.length - 1) return;

    const newCustom = [...customFields];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [newCustom[idx], newCustom[swapIdx]] = [newCustom[swapIdx]!, newCustom[idx]!];

    // Re-number orders for custom fields starting after defaults
    const baseOrder = defaultFields.length;
    const reordered = newCustom.map((f, i) => ({ ...f, order: baseOrder + i }));
    setFields([...defaultFields, ...reordered]);
  }

  function deleteField(id: string) {
    setFields(fields.filter((f) => f.id !== id));
  }

  function toggleRequired(id: string) {
    setFields(fields.map((f) => f.id === id ? { ...f, required: !f.required } : f));
  }

  function handleAddField(field: IntakeField) {
    const newField = { ...field, order: defaultFields.length + customFields.length };
    setFields([...fields, newField]);
    setShowDialog(false);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveIntakeFormFields(fields);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="space-y-6">
        {/* Default fields */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Default Fields (always shown)
            </h3>
          </div>
          <div className="space-y-2">
            {defaultFields.map((field) => (
              <div
                key={field.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3"
              >
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground opacity-40">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                  {TYPE_ICONS[field.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{field.label}</span>
                  {field.required && (
                    <span className="ml-2 text-xs text-red-400">*required</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                  {TYPE_LABELS[field.type]}
                </span>
                <span className="text-xs text-muted-foreground italic">locked</span>
              </div>
            ))}
          </div>
        </div>

        {/* Custom fields */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Custom Fields
            </h3>
            <span className="text-xs text-muted-foreground">{customFields.length} fields</span>
          </div>

          {customFields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center">
              <Plus className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No custom fields yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click &ldquo;Add Field&rdquo; to build your form</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/20 transition-colors"
                >
                  {/* Up/Down arrows */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveField(field.id, "up")}
                      disabled={idx === 0}
                      className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-20 disabled:pointer-events-none"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(field.id, "down")}
                      disabled={idx === customFields.length - 1}
                      className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-20 disabled:pointer-events-none"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {TYPE_ICONS[field.type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{field.label}</p>
                    {field.options && field.options.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {field.options.join(", ")}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                    {TYPE_LABELS[field.type]}
                  </span>

                  {/* Required toggle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">Required</span>
                    <button
                      type="button"
                      onClick={() => toggleRequired(field.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        field.required ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          field.required ? "translate-x-[18px]" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => deleteField(field.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:border-primary/60 hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 ml-auto"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <>Saved!</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Form
              </>
            )}
          </button>
        </div>
      </div>

      {showDialog && (
        <AddFieldDialog
          onAdd={handleAddField}
          onClose={() => setShowDialog(false)}
          nextOrder={defaultFields.length + customFields.length}
        />
      )}
    </>
  );
}
