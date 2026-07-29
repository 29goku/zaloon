import { Users, Scissors, Star, Target, CreditCard, Wrench } from "lucide-react"

type Props = {
  totalClients: number
  totalStaff: number
  servicesOffered: number
  avgRating: number
  monthlyTargetPct: number
  activeMemberships: number
}

type StatItem = {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
}

export function QuickStatsWidget({
  totalClients,
  totalStaff,
  servicesOffered,
  avgRating,
  monthlyTargetPct,
  activeMemberships,
}: Props) {
  const stats: StatItem[] = [
    {
      label: "Total Clients",
      value: totalClients.toLocaleString(),
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Staff",
      value: totalStaff,
      icon: Scissors,
      color: "text-[#F41666]",
      bg: "bg-[#F41666]/10",
    },
    {
      label: "Services",
      value: servicesOffered,
      icon: Wrench,
      color: "text-[#F48E16]",
      bg: "bg-[#F48E16]/10",
    },
    {
      label: "Avg Rating",
      value: avgRating > 0 ? avgRating.toFixed(1) : "—",
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Monthly Target",
      value: `${monthlyTargetPct}%`,
      icon: Target,
      color: monthlyTargetPct >= 100 ? "text-emerald-500" : "text-primary",
      bg: monthlyTargetPct >= 100 ? "bg-emerald-500/10" : "bg-primary/10",
    },
    {
      label: "Memberships",
      value: activeMemberships,
      icon: CreditCard,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors"
        >
          <div className={`${stat.bg} p-2 rounded-lg flex-shrink-0`}>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground tabular-nums leading-tight">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
