"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Cake,
  Heart,
  Send,
  CheckCircle2,
  Users,
  PartyPopper,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendBirthdayWish, sendAllBirthdayWishes } from "@/app/actions/clients";

interface BirthdayClient {
  id: string;
  name: string;
  phone: string | null;
  birthday: Date | null;
  loyaltyPoints: number;
}

interface AnniversaryClient {
  id: string;
  name: string;
  phone: string | null;
  anniversaryDate: Date;
  yearsCount: number;
}

interface Props {
  birthdayClients: BirthdayClient[];
  anniversaryClients: AnniversaryClient[];
  totalBirthdaysThisMonth: number;
  totalAnniversariesThisMonth: number;
  wishesSentToday: number;
}

function isBirthdayToday(birthday: Date | null): boolean {
  if (!birthday) return false;
  const now = new Date();
  const bday = new Date(birthday);
  return bday.getMonth() === now.getMonth() && bday.getDate() === now.getDate();
}

function isAnniversaryToday(anniversaryDate: Date): boolean {
  const now = new Date();
  const d = new Date(anniversaryDate);
  return d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function formatMonthDay(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function BirthdaysPageClient({
  birthdayClients,
  anniversaryClients,
  totalBirthdaysThisMonth,
  totalAnniversariesThisMonth,
  wishesSentToday,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [batchResult, setBatchResult] = useState<null | { sent: number }>(null);

  function handleSendWish(clientId: string) {
    startTransition(async () => {
      const result = await sendBirthdayWish(clientId);
      if (result.success) {
        setSentIds((prev) => new Set([...prev, clientId]));
        router.refresh();
      } else {
        setErrorMap((prev) => ({
          ...prev,
          [clientId]: result.error ?? "Failed to send",
        }));
      }
    });
  }

  function handleSendAll() {
    startTransition(async () => {
      const result = await sendAllBirthdayWishes();
      setBatchResult(result);
      // Mark all birthday clients as sent
      setSentIds(new Set(birthdayClients.map((c) => c.id)));
      router.refresh();
    });
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Cake className="w-6 h-6 text-amber-500" />
          Birthdays &amp; Anniversaries
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Celebrate your clients this month and send personalised wishes.
        </p>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Cake className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {totalBirthdaysThisMonth}
              </p>
              <p className="text-xs text-muted-foreground">Birthdays this month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {totalAnniversariesThisMonth}
              </p>
              <p className="text-xs text-muted-foreground">
                Anniversaries this month
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {wishesSentToday + (batchResult?.sent ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Wishes sent today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Birthday clients ────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Cake className="w-5 h-5 text-amber-500" />
            Birthdays this month
            {birthdayClients.length > 0 && (
              <span className="ml-1 text-xs font-normal px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
                {birthdayClients.length}
              </span>
            )}
            {birthdayClients.length > 0 && (
              <button
                onClick={handleSendAll}
                disabled={isPending}
                className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                <PartyPopper className="w-3.5 h-3.5" />
                Send all birthday wishes
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {batchResult && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              {batchResult.sent === 0
                ? "All wishes already sent today."
                : `Sent ${batchResult.sent} birthday wish${batchResult.sent !== 1 ? "es" : ""}!`}
            </div>
          )}
          {birthdayClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Cake className="w-10 h-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No birthdays this month</p>
            </div>
          ) : (
            <div className="space-y-2">
              {birthdayClients.map((client) => {
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
                        {formatMonthDay(client.birthday)}
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

      {/* ── Anniversary clients ──────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            Client anniversaries this month
            {anniversaryClients.length > 0 && (
              <span className="ml-1 text-xs font-normal px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600">
                {anniversaryClients.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anniversaryClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Users className="w-10 h-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                No client anniversaries this month
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {anniversaryClients.map((client) => {
                const isToday = isAnniversaryToday(client.anniversaryDate);
                return (
                  <div
                    key={client.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isToday
                        ? "bg-rose-500/10 border border-rose-500/30"
                        : "bg-secondary/40 hover:bg-secondary/70"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                        isToday
                          ? "bg-rose-500/20 text-rose-600"
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
                          <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                            TODAY
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatMonthDay(client.anniversaryDate)} &middot;{" "}
                        {client.yearsCount} year
                        {client.yearsCount !== 1 ? "s" : ""} as a client
                        {client.phone && (
                          <span className="ml-2">{client.phone}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600">
                        {client.yearsCount}yr
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
