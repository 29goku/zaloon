"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Scissors, Calendar, DollarSign } from "lucide-react";
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
  avatar: string | null;
  Shift: Shift[];
  StaffService: StaffService[];
  _count: { Appointment: number };
  Appointment: { id: string }[];
}

interface Service {
  id: string;
  name: string;
}

interface Props {
  staff: StaffMember[];
  allServices: Service[];
}

// ─── Profile completeness ─────────────────────────────────────────────────────

interface CompletenessResult {
  pct: number;
  missing: string[];
}

function profileCompleteness(member: StaffMember): CompletenessResult {
  let pct = 0;
  const missing: string[] = [];

  if (member.phone) {
    pct += 20;
  } else {
    missing.push("Add phone number");
  }

  if (member.Shift.length > 0) {
    pct += 30;
  } else {
    missing.push("Set working schedule");
  }

  if (member.StaffService.length > 0) {
    pct += 30;
  } else {
    missing.push("Assign services");
  }

  if (member.commissionPct > 0) {
    pct += 20;
  } else {
    missing.push("Set commission rate");
  }

  return { pct, missing };
}

function pctColor(pct: number): string {
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  violet: { bg: "bg-violet-500/20", text: "text-violet-500" },
  blue: { bg: "bg-blue-500/20", text: "text-blue-500" },
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-500" },
  rose: { bg: "bg-rose-500/20", text: "text-rose-500" },
  amber: { bg: "bg-amber-500/20", text: "text-amber-500" },
  cyan: { bg: "bg-cyan-500/20", text: "text-cyan-500" },
};

function avatarClasses(member: StaffMember): { bg: string; text: string } {
  try {
    const parsed = JSON.parse(member.avatar ?? "{}");
    if (parsed.color && COLOR_MAP[parsed.color]) {
      return COLOR_MAP[parsed.color];
    }
  } catch {
    // fall through
  }
  // Deterministic fallback from name
  const keys = Object.keys(COLOR_MAP);
  let hash = 0;
  for (let i = 0; i < member.name.length; i++)
    hash = member.name.charCodeAt(i) + ((hash << 5) - hash);
  return COLOR_MAP[keys[Math.abs(hash) % keys.length]];
}

function staffRole(member: StaffMember): string | null {
  try {
    const parsed = JSON.parse(member.avatar ?? "{}");
    return parsed.role || null;
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StaffListEnhanced({ staff, allServices }: Props) {
  // We keep the detail sheet for backwards compat (clicking the card opens the sheet
  // but the entire card is also a Link — the Link takes precedence on direct click)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  return (
    <TooltipProvider>
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map((member) => {
            const { pct, missing } = profileCompleteness(member);
            const colors = avatarClasses(member);
            const role = staffRole(member);
            const initials = member.name[0]?.toUpperCase() ?? "?";
            const todayAppts = member.Appointment.length;
            const serviceCount = member.StaffService.length;

            return (
              <Link
                key={member.id}
                href={`/dashboard/staff/${member.id}`}
                className="block group"
              >
                <Card className="bg-card border-border group-hover:border-primary/30 transition-colors cursor-pointer h-full">
                  <CardContent className="p-5">
                    {/* Header row */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${colors.bg} ${colors.text}`}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{member.name}</p>
                        {role ? (
                          <p className="text-xs text-muted-foreground">{role}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {member.phone ?? "No phone"}
                          </p>
                        )}
                      </div>

                      {/* Appointment count */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-foreground">
                          {member._count.Appointment}
                        </p>
                        <p className="text-xs text-muted-foreground">appts</p>
                      </div>
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {/* Commission badge */}
                      <Badge
                        variant="secondary"
                        className="text-xs gap-1 border-0"
                      >
                        <DollarSign className="w-3 h-3" />
                        {member.commissionPct}%
                      </Badge>

                      {/* Services count */}
                      <Badge
                        variant="secondary"
                        className="text-xs gap-1 border-0"
                      >
                        <Scissors className="w-3 h-3" />
                        {serviceCount} service{serviceCount !== 1 ? "s" : ""}
                      </Badge>

                      {/* Today's appointments */}
                      {todayAppts > 0 && (
                        <Badge
                          className="text-xs gap-1 border-0 bg-primary/20 text-primary"
                        >
                          <Calendar className="w-3 h-3" />
                          {todayAppts} appt{todayAppts !== 1 ? "s" : ""} today
                        </Badge>
                      )}
                    </div>

                    {/* Shift schedule */}
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-1.5">Schedule</p>
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

                    {/* Services preview */}
                    {serviceCount > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
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
                          {serviceCount > 3 && (
                            <Badge
                              variant="secondary"
                              className="text-xs border-0 bg-secondary"
                            >
                              +{serviceCount - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Profile completeness */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Tooltip>
                          <TooltipTrigger render={<button type="button" className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-default" onClick={(e) => e.preventDefault()} />}>
                            Profile {pct}% complete
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px]">
                            {missing.length === 0 ? (
                              <p className="text-xs">Profile is complete!</p>
                            ) : (
                              <div>
                                <p className="text-xs font-semibold mb-1">Complete your profile:</p>
                                <ul className="text-xs space-y-0.5">
                                  {missing.map((m) => (
                                    <li key={m} className="flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-current inline-block" />
                                      {m}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="relative w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${pctColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
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
    </TooltipProvider>
  );
}
