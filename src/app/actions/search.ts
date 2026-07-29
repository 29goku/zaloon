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
};

export type SearchAppointment = {
  id: string;
  date: string;
  startTime: string;
  status: string;
  clientName: string | null;
  staffName: string;
};

export type GlobalSearchResult = {
  clients: SearchClient[];
  staff: SearchStaff[];
  services: SearchService[];
  appointments: SearchAppointment[];
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

export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  const empty: GlobalSearchResult = {
    clients: [],
    staff: [],
    services: [],
    appointments: [],
  };

  if (!query || query.trim().length < 1) return empty;

  const q = query.trim();

  const salon = await prisma.salon.findFirst();
  if (!salon) return empty;

  const [clients, staff, services, appointments] = await Promise.all([
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
      take: 5,
      orderBy: { name: "asc" },
    }),

    prisma.staff.findMany({
      where: {
        salonId: salon.id,
        name: { contains: q },
      },
      select: { id: true, name: true, phone: true },
      take: 5,
      orderBy: { name: "asc" },
    }),

    prisma.service.findMany({
      where: {
        salonId: salon.id,
        name: { contains: q },
      },
      select: { id: true, name: true, price: true, durationMins: true },
      take: 5,
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
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    clients,
    staff,
    services,
    appointments: appointments.map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      status: a.status,
      clientName: a.Client?.name ?? null,
      staffName: a.Staff.name,
    })),
  };
}
