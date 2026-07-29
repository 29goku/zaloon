import { prisma } from "@/lib/prisma";
import { getKioskDashboardData } from "@/app/actions/kiosk";
import { KioskDashboardClient } from "./kiosk-dashboard-client";
import { Monitor, Users, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kiosk View — Zaloon",
};

export default async function KioskDashboardPage() {
  const [data, salon] = await Promise.all([
    getKioskDashboardData(),
    prisma.salon.findFirst({ select: { name: true, slug: true } }),
  ]);

  return (
    <div className="p-4 md:p-8">
      {/* ── Header ── */}
      <div className="flex items-start sm:items-center justify-between mb-6 md:mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <Monitor className="w-7 h-7 text-primary" />
            Kiosk View
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Live check-ins and walk-in queue</p>
        </div>

        {salon?.slug && (
          <Link
            href={`/kiosk/${salon.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Monitor className="w-4 h-4" />
            Open Kiosk Screen
          </Link>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground font-medium">Checked in today</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{data.checkedInToday}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground font-medium">In queue now</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {data.waitlist.filter((e) => e.status === "WAITING").length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-muted-foreground font-medium">Est. total wait</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {data.waitlist.reduce((sum, e) => sum + e.serviceDurationMins, 0)} min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Live queue ── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Walk-in Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <KioskDashboardClient
            waitlist={data.waitlist}
            staffList={data.staffList}
          />
        </CardContent>
      </Card>
    </div>
  );
}
