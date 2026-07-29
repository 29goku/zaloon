"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cake, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendBirthdayWish } from "@/app/actions/clients";

export interface BirthdayClient {
  id: string;
  name: string;
  phone: string | null;
  birthday: Date | null;
  loyaltyPoints: number;
}

interface BirthdaysWidgetProps {
  clients: BirthdayClient[];
}

function isBirthdayToday(birthday: Date | null): boolean {
  if (!birthday) return false;
  const now = new Date();
  const bday = new Date(birthday);
  return bday.getMonth() === now.getMonth() && bday.getDate() === now.getDate();
}

function formatBirthday(birthday: Date | null): string {
  if (!birthday) return "";
  const bday = new Date(birthday);
  return bday.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function BirthdaysWidget({ clients }: BirthdaysWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  function handleSendWish(clientId: string) {
    startTransition(async () => {
      const result = await sendBirthdayWish(clientId);
      if (result.success) {
        setSentIds((prev) => new Set([...prev, clientId]));
        router.refresh();
      } else {
        setErrorMap((prev) => ({ ...prev, [clientId]: result.error ?? "Failed" }));
      }
    });
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Cake className="w-5 h-5 text-amber-500" />
          Birthdays this month
          {clients.length > 0 && (
            <span className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
              {clients.length} birthday{clients.length !== 1 ? "s" : ""}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Cake className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No birthdays this month</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => {
              const isToday = isBirthdayToday(client.birthday);
              const alreadySent = sentIds.has(client.id);
              const errMsg = errorMap[client.id];

              return (
                <div
                  key={client.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    isToday
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : "bg-secondary/40 hover:bg-secondary/70"
                  }`}
                >
                  {/* Birthday badge */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                      isToday
                        ? "bg-amber-500/20 text-amber-600"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {client.name
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {client.name}
                      {isToday && (
                        <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                          TODAY
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBirthday(client.birthday)}
                      {client.phone && (
                        <span className="ml-2">{client.phone}</span>
                      )}
                    </p>
                    {errMsg && (
                      <p className="text-xs text-destructive mt-0.5">{errMsg}</p>
                    )}
                  </div>

                  {alreadySent ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                      Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendWish(client.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 disabled:opacity-50 transition-colors flex-shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      Send wish
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
