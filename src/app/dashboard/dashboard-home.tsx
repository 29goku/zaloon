"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  Users,
  Scissors,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Appt = {
  id: string;
  startTime: string;
  status: string;
  totalAmount: number;
  client: { name: string } | null;
  staff: { name: string };
  services: { service: { name: string } }[];
};

type Props = {
  salonName: string;
  currency: string;
  todayAppts: number;
  totalClients: number;
  totalStaff: number;
  revenue: number;
  todayApptsList: Appt[];
};

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-[#F48E16]/20 text-[#F48E16]",
  COMPLETED: "bg-primary/20 text-primary",
  CANCELLED: "bg-[#F41666]/20 text-[#F41666]",
  NO_SHOW: "bg-muted text-muted-foreground",
};

export function DashboardHome({
  salonName,
  currency,
  todayAppts,
  totalClients,
  totalStaff,
  revenue,
  todayApptsList,
}: Props) {
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
      ? "Good afternoon"
      : "Good evening";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const stats = [
    {
      title: "Today's Bookings",
      value: todayAppts,
      icon: CalendarDays,
      color: "text-[#F48E16]",
      bg: "bg-[#F48E16]/10",
    },
    {
      title: "Total Clients",
      value: totalClients,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Active Staff",
      value: totalStaff,
      icon: Scissors,
      color: "text-[#F41666]",
      bg: "bg-[#F41666]/10",
    },
    {
      title: "Recent Revenue",
      value: fmt(revenue),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {greeting} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening at{" "}
          <span className="text-primary font-medium">{salonName}</span> today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.title} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{s.title}</p>
                <div className={`${s.bg} p-2 rounded-lg`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Appointments */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Today&apos;s Schedule
            <Badge className="ml-auto bg-primary/20 text-primary border-0 font-normal">
              {todayApptsList.length} appointments
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayApptsList.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No appointments today.</p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                New bookings will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayApptsList.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="text-center min-w-[52px]">
                    <p className="text-sm font-semibold text-foreground">
                      {appt.startTime}
                    </p>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {appt.client?.name ?? "Walk-in"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {appt.services.map((s) => s.service.name).join(", ") ||
                        "No services"}{" "}
                      · {appt.staff.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-sm font-medium text-foreground">
                      {fmt(appt.totalAmount)}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        statusColor[appt.status] ??
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
