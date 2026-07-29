import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

async function getSalonAndClient(slug: string, clientId: string) {
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, logo: true, city: true, slug: true },
  });
  if (!salon) return null;

  const client = await prisma.client.findFirst({
    where: { id: clientId, salonId: salon.id },
    select: { id: true, name: true },
  });
  if (!client) return null;

  return { salon, client };
}

// ─── NavLink helper ───────────────────────────────────────────────────────────

function NavTab({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors min-w-[56px]"
    >
      <span className="w-5 h-5 shrink-0">{icon}</span>
      <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
    </Link>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default async function ClientPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; clientId: string }>;
}) {
  const { slug, clientId } = await params;
  const data = await getSalonAndClient(slug, clientId);

  if (!data) notFound();

  const { salon } = data;

  return (
    <div
      data-theme="light"
      style={{ colorScheme: "light" }}
      className="min-h-screen bg-gray-50 text-gray-900 flex flex-col"
    >
      {/* ── Top header ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-stone-100 shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          {/* Salon identity */}
          <Link
            href={`/portal/${slug}/${clientId}`}
            className="flex items-center gap-2.5 min-w-0 shrink-0"
          >
            {salon.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={salon.logo}
                alt={salon.name}
                className="h-9 w-9 rounded-xl object-cover shadow-sm shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-rose-200 shrink-0 select-none">
                {salon.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 hidden sm:block">
              <p className="font-bold text-stone-900 leading-tight text-sm truncate">
                {salon.name}
              </p>
              {salon.city && (
                <p className="text-xs text-stone-400 truncate">{salon.city}</p>
              )}
            </div>
          </Link>

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

        {/* ── Tab nav ── */}
        <div className="border-t border-stone-100 bg-white">
          <nav className="mx-auto max-w-lg px-2 flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            <NavTab
              href={`/portal/${slug}/${clientId}`}
              label="Home"
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              }
            />
            <NavTab
              href={`/portal/${slug}/${clientId}#appointments`}
              label="Appointments"
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              }
            />
            <NavTab
              href={`/portal/${slug}/${clientId}#loyalty`}
              label="Loyalty"
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              }
            />
            <NavTab
              href={`/portal/${slug}/${clientId}/invoices`}
              label="Invoices"
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              }
            />
            <NavTab
              href={`/portal/${slug}/${clientId}/profile`}
              label="Profile"
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
            />
            <NavTab
              href={`/portal/${slug}/${clientId}/rebook`}
              label="Book Again"
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              }
            />
          </nav>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-100 bg-white mt-16">
        <div className="mx-auto max-w-lg px-4 py-6 text-center space-y-1">
          <p className="text-xs text-stone-400 font-medium">{salon.name}</p>
          <p className="text-xs text-stone-300">
            Powered by{" "}
            <span className="font-semibold text-stone-400">Zaloon</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
