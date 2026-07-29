export interface ActivityItem {
  id: string;
  type:
    | "appointment_created"
    | "appointment_completed"
    | "appointment_cancelled"
    | "client_added"
    | "invoice_paid"
    | "staff_added"
    | "review_received"
    | "membership_started"
    | "gift_card_purchased"
    | "campaign_sent";
  entityId: string;
  entityName: string;
  detail?: string;
  amount?: number;
  timestamp: string;
  icon?: string;
  color?: string;
}

export function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function activityLabel(item: ActivityItem): string {
  switch (item.type) {
    case "appointment_created":
      return `New appointment for ${item.entityName}`;
    case "appointment_completed":
      return `Appointment completed with ${item.entityName}`;
    case "appointment_cancelled":
      return `Appointment cancelled for ${item.entityName}`;
    case "client_added":
      return `New client added: ${item.entityName}`;
    case "invoice_paid":
      return `Invoice paid by ${item.entityName}`;
    case "staff_added":
      return `New staff member: ${item.entityName}`;
    case "review_received":
      return `Review received from ${item.entityName}`;
    case "membership_started":
      return `Membership started for ${item.entityName}`;
    case "gift_card_purchased":
      return `Gift card purchased by ${item.entityName}`;
    case "campaign_sent":
      return `Campaign sent: ${item.entityName}`;
  }
}

export function activityLink(item: ActivityItem): string | null {
  switch (item.type) {
    case "appointment_created":
    case "appointment_completed":
    case "appointment_cancelled":
      return `/dashboard/appointments`;
    case "client_added":
      return `/dashboard/clients/${item.entityId}`;
    case "invoice_paid":
      return `/dashboard/invoices`;
    case "staff_added":
      return `/dashboard/staff`;
    case "review_received":
      return `/dashboard/reviews`;
    case "membership_started":
      return `/dashboard/memberships`;
    case "gift_card_purchased":
      return `/dashboard/gift-cards`;
    case "campaign_sent":
      return `/dashboard/campaigns/${item.entityId}`;
    default:
      return null;
  }
}
