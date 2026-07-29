import { prisma } from "@/lib/prisma";
import { Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TeamMembersList } from "@/components/settings/team-members-list";
import { InviteUserForm } from "@/components/settings/invite-user-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldHalf, Headphones, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

const ROLE_INFO = [
  {
    role: "OWNER",
    label: "Owner",
    icon: ShieldCheck,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    description: "Full access to all settings, billing, and data. Can manage all team members.",
  },
  {
    role: "MANAGER",
    label: "Manager",
    icon: ShieldHalf,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    description: "Can manage appointments, clients, staff, and most settings. Cannot change billing.",
  },
  {
    role: "RECEPTIONIST",
    label: "Receptionist",
    icon: Headphones,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    description: "Can book appointments, check in clients, and process payments. No settings access.",
  },
  {
    role: "VIEWER",
    label: "Viewer",
    icon: Eye,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    description: "Read-only access to appointments and reports. Cannot make any changes.",
  },
];

export default async function UsersSettingsPage() {
  const salon = await prisma.salon.findFirst({ select: { id: true } });
  const users = salon
    ? await prisma.user.findMany({
        where: { salonId: salon.id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-7 h-7 text-primary" />
          Team &amp; Users
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage who has access to your Zaloon dashboard and what they can do
        </p>
      </div>

      <div className="space-y-6">

        {/* ── Team Members List ───────────────────────────────────────────── */}
        <TeamMembersList users={users} />

        {/* ── Invite New Member ───────────────────────────────────────────── */}
        <InviteUserForm />

        {/* ── Roles Explanation ───────────────────────────────────────────── */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ROLE_INFO.map(({ role, label, icon: Icon, color, bg, description }) => (
                <div key={role} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <Badge variant="outline" className="text-xs px-1.5 py-0 font-mono">
                        {role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
