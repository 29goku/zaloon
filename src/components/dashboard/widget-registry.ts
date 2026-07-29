export const WIDGETS = {
  kpis: { id: 'kpis', label: 'KPI Cards', defaultVisible: true },
  todaySchedule: { id: 'todaySchedule', label: "Today's Schedule", defaultVisible: true },
  upcoming: { id: 'upcoming', label: 'Upcoming Appointments', defaultVisible: true },
  revenue: { id: 'revenue', label: 'Revenue Chart', defaultVisible: true },
  staffUtilization: { id: 'staffUtilization', label: 'Staff Utilization', defaultVisible: true },
  topClients: { id: 'topClients', label: 'Top Clients', defaultVisible: false },
  activityFeed: { id: 'activityFeed', label: 'Activity Feed', defaultVisible: true },
  nextHour: { id: 'nextHour', label: 'Next Hour Alerts', defaultVisible: true },
  apptFunnel: { id: 'apptFunnel', label: 'Appointment Funnel', defaultVisible: false },
  quickStats: { id: 'quickStats', label: 'Quick Stats', defaultVisible: false },
} as const

export type WidgetId = keyof typeof WIDGETS
