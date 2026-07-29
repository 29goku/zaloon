import { prisma } from "@/lib/prisma";
import { CronStatusClient } from "./cron-status-client";

export const dynamic = "force-dynamic";

export default async function CronStatusPage() {
  const pendingCount = await prisma.reminder.count({ where: { status: "PENDING" } });

  return <CronStatusClient pendingCount={pendingCount} />;
}
