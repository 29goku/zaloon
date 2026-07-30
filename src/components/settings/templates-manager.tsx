"use client";

import * as React from "react";
import {
  MessageSquare,
  Phone,
  Mail,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { MessageTemplate } from "@/app/actions/templates";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/app/actions/templates";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "appointment", label: "Appointment" },
  { value: "reminder", label: "Reminder" },
  { value: "birthday", label: "Birthday" },
  { value: "winback", label: "Win-back" },
  { value: "promotion", label: "Promotion" },
  { value: "followup", label: "Follow-up" },
  { value: "custom", label: "Custom" },
] as const;

const CHANNELS = [
  { value: "all", label: "All" },
  { value: "SMS", label: "SMS" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Email", label: "Email" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  appointment: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30",
  reminder: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  birthday: "bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/30",
  winback: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30",
  promotion: "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30",
  followup: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  custom: "bg-muted text-muted-foreground ring-1 ring-border",
};

const AVAILABLE_VARIABLES = [
  { token: "{{clientName}}", label: "Client Name" },
  { token: "{{salonName}}", label: "Salon Name" },
  { token: "{{date}}", label: "Date" },
  { token: "{{time}}", label: "Time" },
  { token: "{{service}}", label: "Service" },
  { token: "{{staffName}}", label: "Staff Name" },
  { token: "{{bookingLink}}", label: "Booking Link" },
  { token: "{{reviewLink}}", label: "Review Link" },
  { token: "{{price}}", label: "Price" },
];

function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

// ── Channel icon ──────────────────────────────────────────────────────────────

function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
  if (channel === "WhatsApp") return <MessageSquare className={cn("text-emerald-400", className)} />;
  if (channel === "Email") return <Mail className={cn("text-blue-400", className)} />;
  return <Phone className={cn("text-amber-400", className)} />;
}

// ── Template editor modal ─────────────────────────────────────────────────────

interface EditorProps {
  template?: MessageTemplate;
  onClose: () => void;
  onSaved: () => void;
}

function TemplateEditor({ template, onClose, onSaved }: EditorProps) {
  const isEditing = !!template;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState(template?.name ?? "");
  const [category, setCategory] = React.useState<MessageTemplate["category"]>(
    template?.category ?? "custom"
  );
  const [channel, setChannel] = React.useState<MessageTemplate["channel"]>(
    template?.channel ?? "SMS"
  );
  const [subject, setSubject] = React.useState(template?.subject ?? "");
  const [body, setBody] = React.useState(template?.body ?? "");
  const [isActive, setIsActive] = React.useState(template?.isActive ?? true);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  function insertVariable(token: string) {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => prev + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    // Restore cursor after the inserted token
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + token.length;
      el.selectionEnd = start + token.length;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!body.trim()) { setError("Message body is required"); return; }
    setError(null);
    setPending(true);

    const variables = extractVariables(body);

    const payload = {
      name: name.trim(),
      category,
      channel,
      subject: channel === "Email" ? subject.trim() : undefined,
      body: body.trim(),
      variables,
      isActive,
    };

    try {
      let result;
      if (isEditing) {
        result = await updateTemplate(template.id, payload);
      } else {
        result = await createTemplate(payload);
      }

      if (result.success) {
        onSaved();
      } else {
        setError((result as { success: false; error?: string }).error ?? "Failed to save");
      }
    } catch {
      setError("Unexpected error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">
              {isEditing ? "Edit Template" : "New Template"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Appointment Reminder 24h"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Category + Channel row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MessageTemplate["category"])}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {CATEGORIES.slice(1).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as MessageTemplate["channel"])}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {CHANNELS.slice(1).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Email subject */}
          {channel === "Email" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Your appointment reminder — {{salonName}}"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {/* Variable chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Variables — click to insert at cursor
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertVariable(v.token)}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors"
                  title={v.label}
                >
                  {v.token}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Message Body
              </label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {body.length} chars
              </span>
            </div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              required
              placeholder="Hi {{clientName}}! Your appointment is on {{date}} at {{time}}…"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono"
            />
            {body && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {extractVariables(body).map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-mono"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-sm font-medium">Active</p>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50",
                isActive ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                  isActive ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {pending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><Check className="w-4 h-4" /> {isEditing ? "Save Changes" : "Create Template"}</>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: MessageTemplate;
  onEdit: (t: MessageTemplate) => void;
  onDelete: (id: string) => void;
  onUse: (t: MessageTemplate) => void;
}

function TemplateCard({ template, onEdit, onDelete, onUse }: TemplateCardProps) {
  const [deleting, setDeleting] = React.useState(false);
  const preview =
    template.body.length > 100
      ? template.body.slice(0, 100) + "…"
      : template.body;

  async function handleDelete() {
    if (!confirm(`Delete "${template.name}"?`)) return;
    setDeleting(true);
    await onDelete(template.id);
    setDeleting(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors group">
      {/* Top row */}
      <div className="flex items-start gap-2">
        <ChannelIcon channel={template.channel} className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{template.name}</p>
            {template.isDefault && (
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
                Default
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                CATEGORY_COLORS[template.category] ?? CATEGORY_COLORS.custom
              )}
            >
              {template.category}
            </span>
            <span className="text-[10px] text-muted-foreground">{template.channel}</span>
            {!template.isActive && (
              <span className="text-[10px] text-muted-foreground italic">inactive</span>
            )}
          </div>
        </div>
      </div>

      {/* Body preview */}
      <p className="text-xs text-muted-foreground leading-relaxed">{preview}</p>

      {/* Variables */}
      {template.variables.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {template.variables.map((v) => (
            <span
              key={v}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
            >
              {`{{${v}}}`}
            </span>
          ))}
        </div>
      )}

      {/* Usage */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Used {template.usageCount} time{template.usageCount !== 1 ? "s" : ""}</span>
        {template.lastUsedAt && (
          <span>· Last: {new Date(template.lastUsedAt).toLocaleDateString()}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1 border-t border-border">
        <button
          type="button"
          onClick={() => onUse(template)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          Use Template
        </button>
        <button
          type="button"
          onClick={() => onEdit(template)}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          aria-label="Edit template"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {!template.isDefault && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors disabled:opacity-50"
            aria-label="Delete template"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Use template toast ────────────────────────────────────────────────────────

function UseTemplateToast({ template, onClose }: { template: MessageTemplate; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-border bg-card p-4 shadow-2xl space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Template Selected</p>
          <p className="text-xs text-muted-foreground">{template.name}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="rounded-lg bg-muted/50 p-2">
        <p className="text-xs font-mono text-muted-foreground leading-relaxed line-clamp-3">
          {template.body}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Go to <strong>Reminders</strong> or <strong>Campaigns</strong> to use this template.
      </p>
      <button
        onClick={onClose}
        className="w-full rounded-lg bg-primary text-primary-foreground text-xs font-semibold py-2 hover:bg-primary/90 transition-colors"
      >
        Got it
      </button>
    </div>
  );
}

// ── Main TemplatesManager ─────────────────────────────────────────────────────

interface TemplatesManagerProps {
  initialTemplates: MessageTemplate[];
}

export function TemplatesManager({ initialTemplates }: TemplatesManagerProps) {
  const router = useRouter();
  const [templates, setTemplates] = React.useState<MessageTemplate[]>(initialTemplates);
  const [activeCat, setActiveCat] = React.useState("all");
  const [activeChan, setActiveChan] = React.useState("all");
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<MessageTemplate | undefined>();
  const [usedTemplate, setUsedTemplate] = React.useState<MessageTemplate | null>(null);

  const filtered = templates.filter((t) => {
    if (activeCat !== "all" && t.category !== activeCat) return false;
    if (activeChan !== "all" && t.channel !== activeChan) return false;
    return true;
  });

  function handleEdit(t: MessageTemplate) {
    setEditingTemplate(t);
    setEditorOpen(true);
  }

  function handleCreate() {
    setEditingTemplate(undefined);
    setEditorOpen(true);
  }

  async function handleSaved() {
    setEditorOpen(false);
    setEditingTemplate(undefined);
    const { getTemplates } = await import("@/app/actions/templates");
    const fresh = await getTemplates();
    setTemplates(fresh);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteTemplate(id);
    if (result.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  }

  function handleUse(t: MessageTemplate) {
    setUsedTemplate(t);
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveCat(cat.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                activeCat === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Channel filter */}
          <div className="relative">
            <select
              value={activeChan}
              onChange={(e) => setActiveChan(e.target.value)}
              className="appearance-none rounded-xl border border-border bg-background pl-3 pr-8 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          </div>

          {/* Create button */}
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Template
          </button>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} template{filtered.length !== 1 ? "s" : ""}
        {activeCat !== "all" ? ` in ${activeCat}` : ""}
        {activeChan !== "all" ? ` via ${activeChan}` : ""}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <BookOpen className="mx-auto w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No templates found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different filter or create a new template.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUse={handleUse}
            />
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editorOpen && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => { setEditorOpen(false); setEditingTemplate(undefined); }}
          onSaved={handleSaved}
        />
      )}

      {/* Use template toast */}
      {usedTemplate && (
        <UseTemplateToast
          template={usedTemplate}
          onClose={() => setUsedTemplate(null)}
        />
      )}
    </div>
  );
}

// ── Template picker dropdown (for inline use in other forms) ─────────────────

interface TemplatePickerProps {
  templates: MessageTemplate[];
  category?: string;
  channel?: string;
  onSelect: (body: string, subject?: string) => void;
  label?: string;
}

export function TemplatePicker({
  templates,
  category,
  channel,
  onSelect,
  label = "Use Template",
}: TemplatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = templates.filter((t) => {
    if (category && category !== "all" && t.category !== category) return false;
    if (channel && channel !== "all" && t.channel !== channel) return false;
    return true;
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5" />
        {label}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-72 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground px-1">Select a template</p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                No templates available
              </p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelect(t.body, t.subject);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={t.channel} className="w-3.5 h-3.5 flex-shrink-0" />
                    <p className="text-xs font-medium text-foreground truncate">{t.name}</p>
                    <span
                      className={cn(
                        "ml-auto flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize",
                        CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.custom
                      )}
                    >
                      {t.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 pl-5">
                    {t.body}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
