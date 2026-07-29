"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import {
  AppointmentDetailSheet,
  type AppointmentDetail,
} from "./appointment-detail-sheet";

type Client = { id: string; name: string };
type Staff = { id: string; name: string };
type Service = { id: string; name: string; price: number };

interface AppointmentListProps {
  appointments: AppointmentDetail[];
  clients: Client[];
  staff: Staff[];
  services: Service[];
  currency?: string;
}

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-[#F48E16]/20 text-[#F48E16] border-0",
  COMPLETED: "bg-primary/20 text-primary border-0",
  CANCELLED: "bg-[#F41666]/20 text-[#F41666] border-0",
  NO_SHOW: "bg-muted text-muted-foreground border-0",
};

export function AppointmentList({
  appointments,
  clients,
  staff,
  services,
  currency = "USD",
}: AppointmentListProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<AppointmentDetail | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  function handleRowClick(appt: AppointmentDetail) {
    setSelectedAppointment(appt);
    setSheetOpen(true);
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) {
      // Keep appointment in state briefly so sheet can animate out
      setTimeout(() => setSelectedAppointment(null), 300);
    }
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-16">
        <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No appointments today</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {appointments.map((appt) => (
          <div
            key={appt.id}
            role="button"
            tabIndex={0}
            onClick={() => handleRowClick(appt)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleRowClick(appt);
              }
            }}
            className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
          >
            <div className="min-w-[60px] text-center">
              <p className="text-sm font-bold text-foreground">{appt.startTime}</p>
            </div>
            <div className="w-px h-12 bg-border flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">
                {appt.client?.name ?? "Walk-in"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {appt.services.map((s) => s.service.name).join(", ") || "—"}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-medium text-muted-foreground">
                {appt.staff.name}
              </p>
            </div>
            <div className="text-right flex-shrink-0 min-w-[70px]">
              <p className="text-sm font-bold text-foreground">{fmt(appt.totalAmount)}</p>
            </div>
            <Badge className={statusColor[appt.status] ?? "border-0"}>
              {appt.status}
            </Badge>
          </div>
        ))}
      </div>

      <AppointmentDetailSheet
        appointment={selectedAppointment}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        clients={clients}
        staff={staff}
        services={services}
      />
    </>
  );
}
