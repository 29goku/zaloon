"use client";

import { useState } from "react";
import { randomUUID } from "crypto";
import type { IntakeField } from "@/app/actions/intake";
import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  CheckSquare,
  ListChecks,
  ChevronDown,
  X,
  Plus,
  Check,
} from "lucide-react";

interface AddFieldDialogProps {
  onAdd: (field: IntakeField) => void;
  onClose: () => void;
  nextOrder: number;
}

const FIELD_TYPES: {
  value: IntakeField["type"];
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  { value: "text", label: "Text", icon: <Type className="w-4 h-4" />, description: "Single-line text" },
  { value: "longtext", label: "Long Text", icon: <AlignLeft className="w-4 h-4" />, description: "Multi-line textarea" },
  { value: "number", label: "Number", icon: <Hash className="w-4 h-4" />, description: "Numeric input" },
  { value: "date", label: "Date", icon: <Calendar className="w-4 h-4" />, description: "Date picker" },
  { value: "boolean", label: "Yes/No", icon: <CheckSquare className="w-4 h-4" />, description: "Checkbox" },
  { value: "choice", label: "Multiple Choice", icon: <ListChecks className="w-4 h-4" />, description: "Pick one option" },
  { value: "dropdown", label: "Dropdown", icon: <ChevronDown className="w-4 h-4" />, description: "Select from list" },
];

export function AddFieldDialog({ onAdd, onClose, nextOrder }: AddFieldDialogProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<IntakeField["type"]>("text");
  const [placeholder, setPlaceholder] = useState("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>(["Option 1", "Option 2"]);
  const [newOption, setNewOption] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const needsOptions = type === "choice" || type === "dropdown";

  function addOption() {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  }

  function removeOption(idx: number) {
    setOptions(options.filter((_, i) => i !== idx));
  }

  function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!label.trim()) newErrors.label = "Label is required";
    if (needsOptions && options.length < 1) newErrors.options = "Add at least one option";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const field: IntakeField = {
      id: randomUUID(),
      label: label.trim(),
      type,
      placeholder: placeholder.trim() || undefined,
      required,
      options: needsOptions ? options : undefined,
      isDefault: false,
      order: nextOrder,
    };
    onAdd(field);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Add Custom Field</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Label */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Field Label *
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => { setLabel(e.target.value); setErrors((p) => ({ ...p, label: "" })); }}
              placeholder="e.g. Allergies, Preferred style"
              className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
            />
            {errors.label && <p className="mt-1 text-xs text-red-400">{errors.label}</p>}
          </div>

          {/* Field type */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Field Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setType(ft.value)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors text-sm ${
                    type === ft.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/20 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {ft.icon}
                  <div>
                    <p className="font-medium text-xs">{ft.label}</p>
                    <p className="text-xs opacity-60 leading-tight">{ft.description}</p>
                  </div>
                  {type === ft.value && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Placeholder */}
          {type !== "boolean" && type !== "date" && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Placeholder Text
              </label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Hint text shown inside the field"
                className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
              />
            </div>
          )}

          {/* Options editor for choice/dropdown */}
          {needsOptions && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Options *
              </label>
              <div className="space-y-2 mb-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="flex-1 rounded-lg border border-border bg-secondary/20 px-3 py-1.5 text-sm text-foreground">
                      {opt}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                  placeholder="New option"
                  className="flex-1 rounded-lg border border-border bg-secondary/30 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary/60 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
              {errors.options && <p className="mt-1 text-xs text-red-400">{errors.options}</p>}
            </div>
          )}

          {/* Required toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20">
            <div>
              <p className="text-sm font-medium text-foreground">Required</p>
              <p className="text-xs text-muted-foreground">Clients must answer this field</p>
            </div>
            <button
              type="button"
              onClick={() => setRequired(!required)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                required ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  required ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border bg-secondary/30 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Add Field
          </button>
        </div>
      </div>
    </div>
  );
}
