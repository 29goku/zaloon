"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Loader2, Check } from "lucide-react";
import { updateClientTags } from "@/app/actions/clients";

const COMMON_TAGS = [
  "Regular",
  "VIP",
  "Walk-in",
  "Referral",
  "Online",
  "Birthday",
  "Student",
  "Senior",
  "Staff",
];

interface ClientTagsInputProps {
  clientId: string;
  initialTags: string[];
  /** All tags used by other clients – loaded server-side for autocomplete */
  allTags?: string[];
}

export function ClientTagsInput({
  clientId,
  initialTags,
  allTags = [],
}: ClientTagsInputProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Deduplicated suggestion list: common tags + DB tags, minus already applied
  const suggestions = Array.from(
    new Set([...COMMON_TAGS, ...allTags])
  )
    .filter((t) => !tags.includes(t))
    .filter((t) =>
      inputValue.trim()
        ? t.toLowerCase().includes(inputValue.toLowerCase())
        : true
    )
    .slice(0, 10);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function saveTags(nextTags: string[]) {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    const res = await updateClientTags(clientId, nextTags);
    setIsSaving(false);
    if (res.success) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(res.error);
    }
  }

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setInputValue("");
    setShowDropdown(false);
    saveTags(next);
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    saveTags(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  function handleBlur() {
    // Delay to allow dropdown click to fire first
    setTimeout(() => setShowDropdown(false), 150);
  }

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Tag pills row */}
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="hover:opacity-70 transition-opacity ml-0.5"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs text-muted-foreground self-center">
            No tags yet
          </span>
        )}
      </div>

      {/* Input + autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Add tag… (Enter to confirm)"
            className="flex-1 h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            onClick={() => addTag(inputValue)}
            disabled={!inputValue.trim() || isSaving}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
          >
            <Plus className="size-3" />
            Add
          </button>
        </div>

        {/* Dropdown suggestions */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card shadow-lg overflow-hidden">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur before click
                  addTag(suggestion);
                }}
                className="flex w-full items-center px-3 py-1.5 text-sm text-foreground hover:bg-primary/10 transition-colors text-left"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="h-4">
        {isSaving && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" /> Saving…
          </p>
        )}
        {saved && !isSaving && (
          <p className="text-xs text-primary flex items-center gap-1">
            <Check className="size-3" /> Saved
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
