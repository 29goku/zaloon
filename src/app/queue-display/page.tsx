import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "./auto-refresh";

export const dynamic = "force-dynamic";

// Standalone display page — no sidebar or dashboard layout.
// Exported from outside the dashboard layout segment by placing at
// /dashboard/queue/display but with its own full-page layout.

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default async function QueueDisplayPage() {
  const today = new Date().toISOString().split("T")[0];

  const appointments = await prisma.appointment.findMany({
    where: {
      date: today,
      status: { in: ["IN_PROGRESS", "SCHEDULED"] },
    },
    orderBy: { startTime: "asc" },
    include: {
      Client: { select: { name: true } },
      Staff: { select: { name: true } },
      AppointmentService: {
        include: {
          Service: { select: { name: true } },
        },
      },
    },
  });

  const nowServing = appointments.filter((a) => a.status === "IN_PROGRESS");
  const upNext = appointments.filter((a) => a.status === "SCHEDULED").slice(0, 3);

  const salon = await prisma.salon.findFirst({
    select: { name: true },
  });

  const timeString = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <AutoRefresh intervalMs={30_000} />

      {/* Header */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {salon?.name ?? "Salon"}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Queue Display</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold tabular-nums text-white">{timeString}</p>
          <p className="text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col gap-8 px-10 py-8">

        {/* Now Serving */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-xl font-semibold text-amber-400 uppercase tracking-widest">
              Now Serving
            </h2>
          </div>

          {nowServing.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-10 py-8">
              <p className="text-3xl font-medium text-gray-500">
                No active appointments
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nowServing.map((appt) => (
                <div
                  key={appt.id}
                  className="rounded-2xl bg-amber-500/10 border border-amber-500/30 px-8 py-7"
                >
                  <p className="text-4xl font-bold text-white leading-tight">
                    {appt.Client?.name ?? "Walk-in"}
                  </p>
                  <p className="text-lg text-amber-300 mt-2">
                    {appt.AppointmentService.map((as) => as.Service.name).join(", ") || "—"}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-gray-400 text-base">
                      with <span className="text-white font-medium">{appt.Staff.name}</span>
                    </p>
                    <p className="text-gray-400 text-base tabular-nums">
                      {formatTime(appt.startTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Up Next */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-3 h-3 rounded-full bg-blue-400" />
            <h2 className="text-xl font-semibold text-blue-400 uppercase tracking-widest">
              Up Next
            </h2>
          </div>

          {upNext.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-10 py-6">
              <p className="text-2xl font-medium text-gray-500">
                No upcoming appointments
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upNext.map((appt, idx) => (
                <div
                  key={appt.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-8 py-5 flex items-center gap-6"
                >
                  <span className="text-3xl font-bold text-gray-600 w-8 tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-semibold text-white truncate">
                      {appt.Client?.name ?? "Walk-in"}
                    </p>
                    <p className="text-base text-gray-400 mt-0.5 truncate">
                      {appt.AppointmentService.map((as) => as.Service.name).join(", ") || "—"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-medium text-white tabular-nums">
                      {formatTime(appt.startTime)}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">{appt.Staff.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="px-10 py-4 border-t border-white/10 flex items-center justify-between">
        <p className="text-gray-600 text-sm">Auto-refreshes every 30 seconds</p>
        <p className="text-gray-600 text-sm">
          <a href="/dashboard/queue" className="hover:text-gray-400 transition-colors">
            ← Back to Dashboard
          </a>
        </p>
      </footer>
    </div>
  );
}
