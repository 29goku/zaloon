import { prisma } from "@/lib/prisma";
import { UserCircle } from "lucide-react";
import { AddClientDialog } from "@/components/clients/add-client-dialog";
import { ClientsGrid } from "@/components/clients/clients-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientFilters } from "@/components/clients/client-filters";
import { ExportClientsButton } from "@/components/clients/export-clients-button";
import { ImportClientsDialog } from "@/components/clients/import-clients-dialog";

export const dynamic = "force-dynamic";

type SearchParams = {
  search?: string;
  sortBy?: string;
  filter?: string;
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { search, sortBy, filter } = await searchParams;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  // Format as "YYYY-MM-DD" to compare against the stored string date
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);
  const currentMonth = now.getMonth(); // 0-indexed

  const rawClients = await prisma.client.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy:
      sortBy === "name" || !sortBy ? { name: "asc" } : { createdAt: "asc" },
    include: {
      _count: { select: { Appointment: true } },
      Appointment: {
        select: { totalAmount: true, date: true },
        orderBy: { date: "desc" },
      },
      LedgerEntry: { select: { type: true, amount: true } },
    },
  });

  // Compute derived fields and apply post-query filters
  let clients = rawClients.map((c) => {
    const ledgerBalance = c.LedgerEntry.reduce((sum, entry) => {
      return entry.type === "CREDIT"
        ? sum + entry.amount
        : sum - entry.amount;
    }, 0);

    const totalSpent = c.Appointment.reduce((sum, a) => sum + a.totalAmount, 0);
    const lastVisit =
      c.Appointment.length > 0 ? c.Appointment[0].date : null;

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      birthday: c.birthday,
      anniversary: c.anniversary,
      notes: c.notes,
      createdAt: c.createdAt,
      loyaltyPoints: c.loyaltyPoints,
      isVip: c.isVip,
      doNotContact: c.doNotContact,
      tags: c.tags,
      _count: { Appointment: c._count.Appointment ?? 0 },
      ledgerBalance,
      totalSpent,
      lastVisit,
    };
  });

  // Apply filter
  if (filter === "active") {
    clients = clients.filter(
      (c) => c.lastVisit !== null && c.lastVisit >= thirtyDaysAgoStr
    );
  } else if (filter === "inactive") {
    clients = clients.filter(
      (c) => c.lastVisit === null || c.lastVisit < thirtyDaysAgoStr
    );
  } else if (filter === "birthday") {
    clients = clients.filter(
      (c) =>
        c.birthday !== null &&
        new Date(c.birthday).getMonth() === currentMonth
    );
  }

  // Apply sort (fields that require post-processing)
  if (sortBy === "visits") {
    clients.sort((a, b) => b._count.Appointment - a._count.Appointment);
  } else if (sortBy === "balance") {
    clients.sort((a, b) => b.ledgerBalance - a.ledgerBalance);
  } else if (sortBy === "lastVisit") {
    clients.sort((a, b) => {
      if (!a.lastVisit && !b.lastVisit) return 0;
      if (!a.lastVisit) return 1;
      if (!b.lastVisit) return -1;
      return b.lastVisit.localeCompare(a.lastVisit);
    });
  }
  // sortBy === "name" is handled by Prisma orderBy above

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
            {(search || filter) && rawClients.length !== clients.length
              ? ` of ${rawClients.length} total`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ClientFilters />
          <ExportClientsButton />
          <ImportClientsDialog />
          <AddClientDialog />
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<UserCircle className="w-8 h-8" />}
          title={search || filter ? "No matching clients" : "No clients yet"}
          description={
            search || filter
              ? "Try adjusting your search or filters to find what you're looking for."
              : "Add your first client to start tracking appointments and history."
          }
          action={<AddClientDialog />}
        />
      ) : (
        <ClientsGrid clients={clients} />
      )}
    </div>
  );
}
