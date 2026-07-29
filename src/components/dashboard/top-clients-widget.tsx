type ClientRow = {
  name: string;
  visits: number;
  spent: number;
};

type Props = {
  clients: ClientRow[];
  currency?: string;
};

const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-[#F48E16]/20 text-[#F48E16]",
  "bg-[#F41666]/20 text-[#F41666]",
  "bg-purple-500/20 text-purple-600",
  "bg-emerald-500/20 text-emerald-600",
];

function ClientAvatar({ name, index }: { name: string; index: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
  const colorClass = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorClass}`}
    >
      {initials || "?"}
    </div>
  );
}

export function TopClientsWidget({ clients, currency = "USD" }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  if (!clients || clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        No client data yet
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Header row */}
      <div className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-3 px-1 pb-2 border-b border-border">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          #
        </span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Client
        </span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">
          Visits
        </span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">
          Spent
        </span>
      </div>

      {/* Rows */}
      {clients.map((client, i) => (
        <div
          key={client.name}
          className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-3 px-1 py-2.5 hover:bg-secondary/40 rounded-lg transition-colors"
        >
          {/* Rank */}
          <span className="text-xs font-bold text-muted-foreground tabular-nums">
            {i + 1}
          </span>

          {/* Avatar + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <ClientAvatar name={client.name} index={i} />
            <span className="text-sm font-medium text-foreground truncate">
              {client.name}
            </span>
          </div>

          {/* Visits */}
          <span className="text-sm font-semibold text-foreground tabular-nums text-right">
            {client.visits}
          </span>

          {/* Spent */}
          <span className="text-sm font-semibold text-foreground tabular-nums text-right">
            {fmt(client.spent)}
          </span>
        </div>
      ))}
    </div>
  );
}
