"use client";

import * as React from "react";
import type { KanbanEntry } from "./waitlist-kanban";
import { WaitlistActionButtons } from "@/app/dashboard/waitlist/waitlist-actions";

interface KanbanCardActionsProps {
  entry: KanbanEntry;
  services: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  totalWaiting: number;
  bookingLink?: string;
}

export function KanbanCardActions({
  entry,
  services,
  staff,
  totalWaiting,
  bookingLink,
}: KanbanCardActionsProps) {
  return (
    <WaitlistActionButtons
      id={entry.id}
      currentStatus={entry.status}
      position={entry.displayPosition}
      totalWaiting={totalWaiting}
      entry={{
        name: entry.name,
        phone: entry.phone,
        clientId: entry.clientId ?? null,
        serviceId: entry.serviceId ?? entry.Service?.id ?? null,
        serviceName: entry.Service?.name ?? null,
        staffId: entry.staffId ?? entry.Staff?.id ?? null,
        staffName: entry.Staff?.name ?? null,
        preferredDate: entry.preferredDate,
        preferredTime: entry.preferredTime,
        note: entry.note,
      }}
      services={services}
      staff={staff}
      bookingLink={bookingLink}
    />
  );
}
