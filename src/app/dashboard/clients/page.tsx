import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { UserCircle, Plus, Phone, Mail, Cake } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { appointments: true, ledger: true } },
    },
  });

  const today = new Date();

  function isBirthdayThisMonth(birthday: Date | null) {
    if (!birthday) return false;
    return new Date(birthday).getMonth() === today.getMonth();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-24">
          <UserCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No clients yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card
              key={client.id}
              className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#F48E16]/20 flex items-center justify-center text-[#F48E16] font-bold flex-shrink-0">
                    {client.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{client.name}</p>
                      {isBirthdayThisMonth(client.birthday) && (
                        <span title="Birthday this month">🎂</span>
                      )}
                    </div>
                    {client.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {client.phone}
                      </p>
                    )}
                    {client.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="w-3 h-3" /> {client.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 mt-4 pt-3 border-t border-border">
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {client._count.appointments}
                    </p>
                    <p className="text-xs text-muted-foreground">visits</p>
                  </div>
                  {client._count.ledger > 0 && (
                    <div>
                      <p className="text-lg font-bold text-[#F41666]">
                        {client._count.ledger}
                      </p>
                      <p className="text-xs text-muted-foreground">ledger entries</p>
                    </div>
                  )}
                  {client.birthday && (
                    <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      <Cake className="w-3 h-3" />
                      {new Date(client.birthday).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
