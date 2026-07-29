"use client";

import * as React from "react";
import {
  AppointmentsList,
  type AppointmentItem,
} from "./appointments-list";
import {
  AppointmentDetailSheet,
  type AppointmentDetail,
} from "./appointment-detail-sheet";

type Client = { id: string; name: string };
type Staff = { id: string; name: string };
type Service = { id: string; name: string; price: number };

interface AppointmentsListWithSheetProps {
  appointments: AppointmentItem[];
  currency: string;
  clients: Client[];
  staff: Staff[];
  services: Service[];
}

/**
 * Thin client wrapper: renders AppointmentsList and, when a row is clicked,
 * opens AppointmentDetailSheet with that appointment's full data.
 *
 * AppointmentItem already carries the `.services[].service.price` field
 * because the page fetches `include: { service: true }`.
 */
export function AppointmentsListWithSheet({
  appointments,
  currency,
  clients,
  staff,
  services,
}: AppointmentsListWithSheetProps) {
  const [selected, setSelected] = React.useState<AppointmentDetail | null>(null);
  const [open, setOpen] = React.useState(false);

  function handleRowClick(appt: AppointmentItem) {
    // AppointmentItem now includes service.price, so types are compatible.
    setSelected(appt as AppointmentDetail);
    setOpen(true);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTimeout(() => setSelected(null), 300);
    }
  }

  return (
    <>
      <AppointmentsList
        appointments={appointments}
        currency={currency}
        onRowClick={handleRowClick}
      />

      <AppointmentDetailSheet
        appointment={selected}
        open={open}
        onOpenChange={handleOpenChange}
        clients={clients}
        staff={staff}
        services={services}
      />
    </>
  );
}
