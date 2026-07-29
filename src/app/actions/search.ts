"use server";

import { prisma } from "@/lib/prisma";

export type SearchClient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export type SearchStaff = {
  id: string;
  name: string;
  phone: string | null;
};

export type SearchService = {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  categoryName: string;
};

export type SearchAppointment = {
  id: string;
  date: string;
  startTime: string;
  status: string;
  clientName: string | null;
  staffName: string;
};

export type SearchInvoice = {
  id: string;
  total: number;
  status: string;
  clientName: string | null;
  createdAt: Date;
};

export type SearchCoupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
};

export type SearchGiftCard = {
  id: string;
  code: string;
  balance: number;
  status: string;
  purchasedBy: string | null;
};

export type GlobalSearchResult = {
  clients: SearchClient[];
  staff: SearchStaff[];
  services: SearchService[];
  appointments: SearchAppointment[];
  invoices: SearchInvoice[];
  coupons: SearchCoupon[];
  giftCards: SearchGiftCard[];
};

// Unified flat result shape used by the command palette
export type ResultType =
  | "client"
  | "staff"
  | "service"
  | "appointment"
  | "invoice"
  | "coupon"
  | "giftCard";

export type SearchResultItem = {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string | null;
  href: string;
  icon: string;
  // Keep legacy aliases so existing code still compiles
  label: string;
  sublabel: string | null;
};

export async function searchClients(
  query: string
): Promise<{ id: string; name: string; phone: string | null }[]> {
  if (!query || query.trim().length === 0) return [];

  const q = query.trim();
  const salon = await prisma.salon.findFirst();
  if (!salon) return [];

  return prisma.client.findMany({
    where: {
      salonId: salon.id,
      OR: [{ name: { contains: q } }, { phone: { contains: q } }],
    },
    select: { id: true, name: true, phone: true },
    take: 5,
    orderBy: { name: "asc" },
  });
}

export async function globalSearch(
  query: string,
  limit = 5
): Promise<GlobalSearchResult> {
  const empty: GlobalSearchResult = {
    clients: [],
    staff: [],
    services: [],
    appointments: [],
    invoices: [],
    coupons: [],
    giftCards: [],
  };

  if (!query || query.trim().length < 1) return empty;

  const q = query.trim();

  const salon = await prisma.salon.findFirst();
  if (!salon) return empty;

  const [clients, staff, services, appointments, invoices, coupons, giftCards] =
    await Promise.all([
      prisma.client.findMany({
        where: {
          salonId: salon.id,
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
          ],
        },
        select: { id: true, name: true, phone: true, email: true },
        take: limit,
        orderBy: { name: "asc" },
      }),

      prisma.staff.findMany({
        where: {
          salonId: salon.id,
          name: { contains: q },
        },
        select: { id: true, name: true, phone: true },
        take: limit,
        orderBy: { name: "asc" },
      }),

      prisma.service.findMany({
        where: {
          salonId: salon.id,
          name: { contains: q },
        },
        select: {
          id: true,
          name: true,
          price: true,
          durationMins: true,
          ServiceCategory: { select: { name: true } },
        },
        take: limit,
        orderBy: { name: "asc" },
      }),

      prisma.appointment.findMany({
        where: {
          salonId: salon.id,
          Client: {
            name: { contains: q },
          },
        },
        select: {
          id: true,
          date: true,
          startTime: true,
          status: true,
          Client: { select: { name: true } },
          Staff: { select: { name: true } },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),

      // Invoices: match by client name. Invoice has no invoice number field;
      // use id prefix as display number.
      prisma.invoice.findMany({
        where: {
          salonId: salon.id,
          OR: [
            { Client: { name: { contains: q } } },
            { id: { contains: q } },
          ],
        },
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
          Client: { select: { name: true } },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),

      // Coupons: match by code
      prisma.coupon.findMany({
        where: {
          salonId: salon.id,
          code: { contains: q },
        },
        select: { id: true, code: true, type: true, value: true, active: true },
        take: limit,
        orderBy: { code: "asc" },
      }),

      // Gift cards: match by code or purchasedBy
      prisma.giftCard.findMany({
        where: {
          salonId: salon.id,
          OR: [
            { code: { contains: q } },
            { purchasedBy: { contains: q } },
          ],
        },
        select: {
          id: true,
          code: true,
          balance: true,
          status: true,
          purchasedBy: true,
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

  return {
    clients,
    staff,
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      durationMins: s.durationMins,
      categoryName: s.ServiceCategory.name,
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      status: a.status,
      clientName: a.Client?.name ?? null,
      staffName: a.Staff.name,
    })),
    invoices: invoices.map((inv) => ({
      id: inv.id,
      total: inv.total,
      status: inv.status,
      clientName: inv.Client?.name ?? null,
      createdAt: inv.createdAt,
    })),
    coupons,
    giftCards,
  };
}

/** Icon name (Lucide) for each result type */
const RESULT_TYPE_ICON: Record<ResultType, string> = {
  client: "UserCircle",
  staff: "Users",
  service: "Scissors",
  appointment: "CalendarDays",
  invoice: "Receipt",
  coupon: "Tag",
  giftCard: "Gift",
};

/**
 * Returns a flat list of SearchResultItem objects, each with a typed href,
 * title/subtitle, and icon name. This is the primary API consumed by the
 * command palette and the full search results page.
 */
export async function globalSearchItems(
  query: string,
  limit = 5
): Promise<SearchResultItem[]> {
  const raw = await globalSearch(query, limit);
  const items: SearchResultItem[] = [];

  for (const c of raw.clients) {
    const title = c.name;
    const subtitle = c.phone ?? c.email ?? null;
    items.push({
      id: c.id,
      type: "client",
      title,
      subtitle,
      href: `/dashboard/clients/${c.id}`,
      icon: RESULT_TYPE_ICON.client,
      label: title,
      sublabel: subtitle,
    });
  }

  for (const s of raw.staff) {
    const title = s.name;
    const subtitle = s.phone ?? null;
    items.push({
      id: s.id,
      type: "staff",
      title,
      subtitle,
      href: `/dashboard/staff/${s.id}`,
      icon: RESULT_TYPE_ICON.staff,
      label: title,
      sublabel: subtitle,
    });
  }

  for (const svc of raw.services) {
    const title = svc.name;
    const subtitle = `${svc.categoryName} · ${svc.durationMins} min · $${svc.price.toFixed(2)}`;
    items.push({
      id: svc.id,
      type: "service",
      title,
      subtitle,
      href: `/dashboard/services`,
      icon: RESULT_TYPE_ICON.service,
      label: title,
      sublabel: subtitle,
    });
  }

  for (const a of raw.appointments) {
    const title = a.clientName ?? "Walk-in";
    const subtitle = `${a.date} ${a.startTime} · ${a.staffName} · ${a.status}`;
    items.push({
      id: a.id,
      type: "appointment",
      title,
      subtitle,
      href: `/dashboard/appointments`,
      icon: RESULT_TYPE_ICON.appointment,
      label: title,
      sublabel: subtitle,
    });
  }

  for (const inv of raw.invoices) {
    const shortId = inv.id.slice(0, 8).toUpperCase();
    const title = `INV-${shortId}`;
    const clientPart = inv.clientName ? ` · ${inv.clientName}` : "";
    const subtitle = `$${inv.total.toFixed(2)}${clientPart} · ${inv.status}`;
    items.push({
      id: inv.id,
      type: "invoice",
      title,
      subtitle,
      href: `/dashboard/invoices/${inv.id}`,
      icon: RESULT_TYPE_ICON.invoice,
      label: title,
      sublabel: subtitle,
    });
  }

  for (const coupon of raw.coupons) {
    const title = coupon.code;
    const discountLabel =
      coupon.type === "PERCENTAGE"
        ? `${coupon.value}% off`
        : `$${coupon.value.toFixed(2)} off`;
    const subtitle = `${discountLabel} · ${coupon.active ? "Active" : "Inactive"}`;
    items.push({
      id: coupon.id,
      type: "coupon",
      title,
      subtitle,
      href: `/dashboard/coupons`,
      icon: RESULT_TYPE_ICON.coupon,
      label: title,
      sublabel: subtitle,
    });
  }

  for (const gc of raw.giftCards) {
    const title = gc.code;
    const buyerPart = gc.purchasedBy ? ` · ${gc.purchasedBy}` : "";
    const subtitle = `$${gc.balance.toFixed(2)} balance${buyerPart} · ${gc.status}`;
    items.push({
      id: gc.id,
      type: "giftCard",
      title,
      subtitle,
      href: `/dashboard/gift-cards`,
      icon: RESULT_TYPE_ICON.giftCard,
      label: title,
      sublabel: subtitle,
    });
  }

  return items;
}
