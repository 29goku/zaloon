"use client";

type Props = {
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

export function AppointmentFunnel({ scheduled, completed, cancelled, noShow }: Props) {
  const total = scheduled + completed + cancelled + noShow;
  const completionRate =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">
        No appointments this month
      </div>
    );
  }

  // Donut SVG config
  const R = 42;          // outer radius
  const r = 28;          // inner radius (hole)
  const CX = 52;
  const CY = 52;
  const size = 104;

  type Segment = { value: number; color: string; label: string };
  const segments: Segment[] = [
    { value: completed, color: "var(--color-primary, #6366f1)", label: "Completed" },
    { value: scheduled, color: "#F48E16", label: "Scheduled" },
    { value: cancelled, color: "#F41666", label: "Cancelled" },
    { value: noShow, color: "#94a3b8", label: "No-show" },
  ].filter((s) => s.value > 0);

  // Build arc paths
  function polarToXY(angleDeg: number, radius: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: CX + radius * Math.cos(rad),
      y: CY + radius * Math.sin(rad),
    };
  }

  function arcPath(startDeg: number, endDeg: number) {
    const large = endDeg - startDeg > 180 ? 1 : 0;
    const outerStart = polarToXY(startDeg, R);
    const outerEnd = polarToXY(endDeg, R);
    const innerStart = polarToXY(endDeg, r);
    const innerEnd = polarToXY(startDeg, r);
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${R} ${R} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${r} ${r} 0 ${large} 0 ${innerEnd.x} ${innerEnd.y}`,
      "Z",
    ].join(" ");
  }

  let cursor = 0;
  const arcs = segments.map((seg) => {
    const sweep = (seg.value / total) * 360;
    const path = arcPath(cursor, cursor + sweep);
    cursor += sweep;
    return { ...seg, path };
  });

  return (
    <div className="flex items-center gap-5">
      {/* Donut */}
      <div className="relative flex-shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-label="Appointment status donut chart"
        >
          {arcs.map((arc) => (
            <path key={arc.label} d={arc.path} fill={arc.color} />
          ))}
        </svg>
        {/* Center rate label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold text-foreground leading-none">
            {completionRate}%
          </span>
          <span className="text-[9px] text-muted-foreground leading-tight mt-0.5">
            done
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 min-w-0">
        {[
          { label: "Completed", value: completed, color: "bg-primary" },
          { label: "Scheduled", value: scheduled, color: "bg-[#F48E16]" },
          { label: "Cancelled", value: cancelled, color: "bg-[#F41666]" },
          { label: "No-show", value: noShow, color: "bg-slate-400" },
        ]
          .filter((item) => item.value > 0)
          .map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`}
              />
              <span className="text-muted-foreground truncate">{item.label}</span>
              <span className="ml-auto font-semibold text-foreground tabular-nums pl-2">
                {item.value}
              </span>
            </div>
          ))}
        <div className="border-t border-border mt-1 pt-1 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Total</span>
          <span className="ml-auto font-bold text-foreground tabular-nums pl-2">
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}
