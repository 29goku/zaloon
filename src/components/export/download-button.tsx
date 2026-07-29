"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

export interface DownloadButtonProps {
  label: string;
  action: () => Promise<{ filename: string; csv: string }>;
  variant?: "outline" | "default";
  size?: "default" | "sm" | "xs";
  className?: string;
}

export function DownloadButton({
  label,
  action,
  variant = "outline",
  size = "sm",
  className,
}: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const { filename, csv } = await action();
      if (!csv) {
        toast.info("No data", "Nothing to export for this selection.");
        return;
      }
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Downloaded", filename);
    } catch (err) {
      console.error("[DownloadButton]", err);
      toast.error("Export failed", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      {label}
    </Button>
  );
}
