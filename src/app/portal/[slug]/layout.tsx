import Link from "next/link";
import { prisma } from "@/lib/prisma";

// ─── Salon data ───────────────────────────────────────────────────────────────

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
      className="min-h-screen bg-gray-50 text-gray-900 flex flex-col"
    >
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-20 border-b border-stone-100 bg-white shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          {/* Salon identity */}
          <Link href={`/portal/${slug}`} className="flex items-center gap-2.5 min-w-0 shrink-0">
            {salon?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={salon.logo}
                alt={salon?.name ?? "Salon"}
                className="h-9 w-9 rounded-xl object-cover shadow-sm shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-rose-200 shrink-0 select-none">
                {salon ? salon.name.charAt(0).toUpperCase() : "?"}
              </div>
            )}
            <div className="min-w-0 hidden sm:block">
              <p className="font-bold text-stone-900 leading-tight text-sm truncate">
                {salon?.name ?? "Salon Portal"}
              </p>
              {salon?.city && (
                <p className="text-xs text-stone-400 truncate">{salon.city}</p>
              )}
            </div>
          </Link>

          {/* Section anchor nav */}
          <nav className="flex items-center gap-1 ml-2 flex-1 overflow-x-auto scrollbar-none">
            <a
              href="#appointments"
              className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              My Appointments
            </a>
            <a
              href="#loyalty"
              className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Loyalty Points
            </a>
            <Link
              href={`/book/${slug}`}
              className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Book Again
            </Link>
          </nav>

          {/* Book CTA */}
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
