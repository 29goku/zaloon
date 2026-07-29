"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  Mail,
  Cake,
  Trash2,
  Download,
  Megaphone,
  Loader2,
  CheckSquare,
  Square,
  Crown,
  PhoneOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ClientForSheet } from "./client-detail-sheet";
import { LoyaltyBadge } from "./loyalty-badge";
import { ExportClientsButton } from "./export-clients-button";
import { deleteClients } from "@/app/actions/clients";
import { toast } from "@/components/ui/sonner";

interface ClientsGridProps {
  clients: ClientForSheet[];
}

function isBirthdayThisMonth(birthday: Date | null): boolean {
  if (!birthday) return false;
  return new Date(birthday).getMonth() === new Date().getMonth();
}

export function ClientsGrid({ clients }: ClientsGridProps) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const allSelected = selected.size === clients.length && clients.length > 0;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelected(new Set());
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(clients.map((c) => c.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (!selected.size || deleting) return;
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      const result = await deleteClients(ids);
      if (!result.success) {
        toast.error("Delete failed", result.error);
        return;
      }
      toast.success(`Deleted ${result.deleted} client${result.deleted !== 1 ? "s" : ""}`);
      setSelected(new Set());
      setSelectMode(false);
      router.refresh();
    } catch {
      toast.error("Delete failed", "An unexpected error occurred.");
    } finally {
      setDeleting(false);
    }
  }

  function handleCampaign() {
    toast.info("Feature coming soon", "Campaign support will be available shortly.");
  }

  const selectedClients = clients.filter((c) => selected.has(c.id));

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSelectMode}
          className="flex items-center gap-2"
        >
          {selectMode ? (
            <>
              <Square className="w-4 h-4" />
              Cancel selection
            </>
          ) : (
            <>
              <CheckSquare className="w-4 h-4" />
              Select
            </>
          )}
        </Button>

        {selectMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              readOnly
              className="pointer-events-none"
            />
            {allSelected ? "Deselect all" : "Select all"}
          </Button>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectMode && selected.size > 0 && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 flex-wrap">
          <span className="text-sm font-medium text-foreground mr-2">
            {selected.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="flex items-center gap-2"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCampaign}
            className="flex items-center gap-2"
          >
            <Megaphone className="w-4 h-4" />
            Add to campaign
          </Button>
          <ExportClientsButton clients={selectedClients} />
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((client) => {
          const isSelected = selected.has(client.id);

          const cardContent = (
            <Card
              className={[
                "bg-card border-border hover:border-primary/30 transition-colors cursor-pointer h-full",
                selectMode && isSelected ? "border-primary bg-primary/5" : "",
              ].join(" ")}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {selectMode && (
                    <div
                      className="flex-shrink-0 mt-0.5"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleOne(client.id);
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        readOnly
                        className="pointer-events-none"
                      />
                    </div>
                  )}
                  <div className="w-11 h-11 rounded-full bg-[#F48E16]/20 flex items-center justify-center text-[#F48E16] font-bold flex-shrink-0">
                    {client.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground truncate">
                        {client.name}
                      </p>
                      {isBirthdayThisMonth(client.birthday) && (
                        <span title="Birthday this month">🎂</span>
                      )}
                      {client.isVip && (
                        <span
                          title="VIP"
                          className="inline-flex items-center gap-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600 dark:text-yellow-400"
                        >
                          <Crown className="w-2.5 h-2.5" />
                          VIP
                        </span>
                      )}
                      {client.doNotContact && (
                        <span
                          title="Do Not Contact"
                          className="inline-flex items-center gap-0.5 rounded-full bg-[#F41666]/15 border border-[#F41666]/30 px-1.5 py-0.5 text-[10px] font-medium text-[#F41666]"
                        >
                          <PhoneOff className="w-2.5 h-2.5" />
                          DNC
                        </span>
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
                    {/* Tag pills */}
                    {(() => {
                      let tags: string[] = [];
                      try {
                        tags = JSON.parse(client.tags ?? "[]") as string[];
                      } catch {
                        tags = [];
                      }
                      if (!tags.length) return null;
                      const shown = tags.slice(0, 3);
                      const extra = tags.length - shown.length;
                      return (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {shown.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                          {extra > 0 && (
                            <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
                              +{extra} more
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex gap-4 mt-4 pt-3 border-t border-border items-end">
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {client._count.Appointment}
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
          );

          if (selectMode) {
            return (
              <div
                key={client.id}
                className="block"
                onClick={() => toggleOne(client.id)}
              >
                {cardContent}
              </div>
            );
          }

          return (
            <Link key={client.id} href={`/dashboard/clients/${client.id}`} className="block">
              {cardContent}
            </Link>
          );
        })}
      </div>
    </>
  );
}
