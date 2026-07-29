"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scissors } from "lucide-react";
import { StaffDetailSheet } from "@/components/staff/staff-detail-sheet";
import Link from "next/link";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface Shift {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface StaffService {
  serviceId: string;
  Service: { id: string; name: string };
}

interface StaffMember {
  id: string;
  name: string;
  phone: string | null;
  commissionPct: number;
  Shift: Shift[];
  StaffService: StaffService[];
  _count: { Appointment: number };
}

interface Service {
  id: string;
  name: string;
}

interface StaffListProps {
  staff: StaffMember[];
  allServices: Service[];
}

export function StaffList({ staff, allServices }: StaffListProps) {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {staff.map((member) => (
          <Link key={member.id} href={`/dashboard/staff/${member.id}`} className="block">
          <Card
            className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => setSelectedStaff(member)}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {member.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.phone ?? "No phone"}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xl font-bold text-foreground">
                    {member._count.Appointment}
                  </p>
                  <p className="text-xs text-muted-foreground">appts</p>
                </div>
              </div>

              {/* Shift schedule */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">Schedule</p>
                <div className="flex gap-1 flex-wrap">
                  {DAYS.map((day, i) => {
                    const shift = member.Shift.find((s) => s.dayOfWeek === i);
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
              {member.StaffService.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Scissors className="w-3 h-3" /> Services
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {member.StaffService.slice(0, 3).map((ss) => (
                      <Badge
                        key={ss.serviceId}
                        variant="secondary"
                        className="text-xs border-0 bg-secondary"
                      >
                        {ss.Service.name}
                      </Badge>
                    ))}
                    {member.StaffService.length > 3 && (
                      <Badge
                        variant="secondary"
                        className="text-xs border-0 bg-secondary"
                      >
                        +{member.StaffService.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </Link>
        ))}
      </div>

      {selectedStaff && (
        <StaffDetailSheet
          staff={selectedStaff}
          allServices={allServices}
          open={selectedStaff !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setSelectedStaff(null);
          }}
        />
      )}
    </>
  );
}
