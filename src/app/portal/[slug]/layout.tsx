import Link from "next/link";
import { prisma } from "@/lib/prisma";

// ─── Salon logo placeholder ───────────────────────────────────────────────────

async function getSalon(slug: string) {
  return prisma.salon.findUnique({
    where: { slug },
    select: { name: true, city: true, logo: true },
  });
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default async function PortalSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getSalon(slug);

  return (
    <div
      data-theme="light"
      style={{ colorScheme: "light" }}
      className="min-h-screen bg-white text-stone-900 flex flex-col"
    >
      {/* ── Top nav ── */}
      <header className="border-b border-stone-100 bg-white shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-4 flex items-center gap-3">
          <Link href={`/portal/${slug}`} className="flex items-center gap-3 min-w-0">
            {salon?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={salon.logo}
                alt={salon?.name ?? "Salon"}
                className="h-10 w-10 rounded-xl object-cover shadow-sm shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-rose-200 shrink-0 select-none">
                {salon ? salon.name.charAt(0).toUpperCase() : "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-stone-900 leading-tight truncate">
                {salon?.name ?? "Salon Portal"}
              </p>
              {salon?.city && (
                <p className="text-xs text-stone-400 truncate">{salon.city}</p>
              )}
            </div>
          </Link>

          <div className="ml-auto shrink-0">
            <Link
              href={`/book/${slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
            >
              Book now
            </Link>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-100 bg-white mt-16">
        <div className="mx-auto max-w-lg px-4 py-6 text-center space-y-1">
          {salon && (
            <p className="text-xs text-stone-400 font-medium">{salon.name}</p>
          )}
          <p className="text-xs text-stone-300">
            Powered by{" "}
            <span className="font-semibold text-stone-400">Zaloon</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
