"use client";

import * as React from "react";
import { Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SendMessageForm, type SendMessageFormClient } from "@/components/reminders/send-message-form";
import type { MessageTemplate } from "@/app/actions/templates";

interface Props {
  clients: SendMessageFormClient[];
  templates?: MessageTemplate[];
}

export function SendMessageFormServer({ clients, templates = [] }: Props) {
  const [selectedClientId, setSelectedClientId] = React.useState<string>("");

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Send className="size-4 text-muted-foreground" />
        <h2 className="font-semibold text-sm">Send Message Now</h2>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        {/* Client picker */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Select Client (optional)</Label>
          <Select
            value={selectedClientId || "none"}
            onValueChange={(v) => setSelectedClientId(v === "none" ? "" : (v ?? ""))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a client…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No client (enter phone manually)</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.phone && (
                    <span className="text-muted-foreground ml-2 text-xs">{c.phone}</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Send form — renders with selected client */}
        <SendMessageForm
          client={selectedClient}
          compact={false}
          templates={templates}
          onSuccess={() => {
            setSelectedClientId("");
          }}
        />
      </div>
    </div>
  );
}
