"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, Cake } from "lucide-react";
import { ClientForSheet } from "./client-detail-sheet";
import { LoyaltyBadge } from "./loyalty-badge";

interface ClientsGridProps {
  clients: ClientForSheet[];
}

function isBirthdayThisMonth(birthday: Date | null): boolean {
  if (!birthday) return false;
  return new Date(birthday).getMonth() === new Date().getMonth();
}

export function ClientsGrid({ clients }: ClientsGridProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((client) => (
          <Link key={client.id} href={`/dashboard/clients/${client.id}`} className="block">
          <Card
            className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer h-full"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-[#F48E16]/20 flex items-center justify-center text-[#F48E16] font-bold flex-shrink-0">
                  {client.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">
                      {client.name}
                    </p>
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

              <div className="flex gap-4 mt-4 pt-3 border-t border-border items-end">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {client._count.appointments}
                  </p>
                  <p className="text-xs text-muted-foreground">visits</p>
                </div>
                <div>
                  <p
                    className={`text-lg font-bold ${
                      client.ledgerBalance > 0
                        ? "text-green-600 dark:text-green-400"
                        : client.ledgerBalance < 0
                        ? "text-[#F41666]"
                        : "text-foreground"
                    }`}
                  >
                    {client.ledgerBalance >= 0 ? "+" : ""}
                    {client.ledgerBalance.toLocaleString("en", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">balance</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {client.birthday && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Cake className="w-3 h-3" />
                      {new Date(client.birthday).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  <LoyaltyBadge points={client.loyaltyPoints ?? 0} variant="compact" />
                </div>
              </div>
            </CardContent>
          </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
