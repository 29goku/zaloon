import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Scissors } from "lucide-react";

export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function StaffPage() {
  const staff = await prisma.staff.findMany({
    include: {
      shifts: true,
      services: { include: { service: true } },
      _count: { select: { appointments: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff</h1>
          <p className="text-muted-foreground mt-1">
            {staff.length} team member{staff.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-24">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No staff members yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map((member) => (
            <Card
              key={member.id}
              className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                    {member.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.phone ?? "No phone"}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xl font-bold text-foreground">
                      {member._count.appointments}
                    </p>
                    <p className="text-xs text-muted-foreground">appts</p>
                  </div>
                </div>

                {/* Shift schedule */}
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-2">Schedule</p>
                  <div className="flex gap-1 flex-wrap">
                    {DAYS.map((day, i) => {
                      const shift = member.shifts.find((s) => s.dayOfWeek === i);
                      return (
                        <div
                          key={day}
                          className={`text-xs px-2 py-1 rounded-md ${
                            shift
                              ? "bg-primary/20 text-primary font-medium"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Services */}
                {member.services.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Scissors className="w-3 h-3" /> Services
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {member.services.slice(0, 3).map((ss) => (
                        <Badge
                          key={ss.serviceId}
                          variant="secondary"
                          className="text-xs border-0 bg-secondary"
                        >
                          {ss.service.name}
                        </Badge>
                      ))}
                      {member.services.length > 3 && (
                        <Badge variant="secondary" className="text-xs border-0 bg-secondary">
                          +{member.services.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
