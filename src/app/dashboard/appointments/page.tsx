import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-[#F48E16]/20 text-[#F48E16] border-0",
  COMPLETED: "bg-primary/20 text-primary border-0",
  CANCELLED: "bg-[#F41666]/20 text-[#F41666] border-0",
  NO_SHOW: "bg-muted text-muted-foreground border-0",
};

export default async function AppointmentsPage() {
  const today = new Date().toISOString().split("T")[0];

  const appointments = await prisma.appointment.findMany({
    where: { date: today },
    orderBy: { startTime: "asc" },
    include: {
      client: true,
      staff: true,
      services: { include: { service: true } },
    },
  });

  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground mt-1">
            Manage today&apos;s bookings and schedule
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          New Appointment
        </button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="w-5 h-5 text-primary" />
            Today — {new Date().toLocaleDateString("en", { dateStyle: "full" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No appointments today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
