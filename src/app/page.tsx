import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zaloon — Run Your Salon, Effortlessly",
  description:
    "Modern salon management software. Appointments, clients, staff, payments, and reports — all in one place.",
};

const features = [
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Appointments",
    description: "Schedule and manage bookings",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Client Management",
    description: "Know every client by name",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
        <path d="M19 8h2M3 8h2" />
      </svg>
    ),
    title: "Staff Management",
    description: "Track your team's schedule",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    title: "Quick Pay",
    description: "Collect payments instantly",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: "Reports",
    description: "Understand your business",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: "Ledger",
    description: "Track client balances",
  },
];

const stats = [
  { label: "Used by salons" },
  { label: "Manage clients" },
  { label: "Track revenue" },
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <span className="landing-logo">zaloon</span>
          <Link href="/dashboard" className="landing-header-cta">
            Dashboard <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="landing-hero">
          <div className="landing-container landing-hero-inner">
            <div className="landing-badge">Salon Management</div>
            <h1 className="landing-headline">
              Run Your Salon,
              <br />
              <span className="landing-headline-accent">Effortlessly.</span>
            </h1>
            <p className="landing-subtext">
              Everything you need to manage appointments, clients, staff, and
              payments — in one elegant dashboard built for modern salons.
            </p>
            <Link href="/dashboard" className="landing-cta-btn">
              Open Dashboard <span aria-hidden="true">→</span>
            </Link>
          </div>
          {/* decorative gradient orb */}
          <div className="landing-hero-orb" aria-hidden="true" />
        </section>

        {/* ── Stats bar ──────────────────────────────────────────────── */}
        <div className="landing-stats-bar">
          <div className="landing-container landing-stats-inner">
            {stats.map((s, i) => (
              <div key={s.label} className="landing-stat-item">
                {i > 0 && <span className="landing-stat-dot" aria-hidden="true" />}
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Features ──────────────────────────────────────────────── */}
        <section className="landing-features-section">
          <div className="landing-container">
            <h2 className="landing-section-title">Everything in one place</h2>
            <p className="landing-section-sub">
              Purpose-built tools for every part of your salon workflow.
            </p>
            <div className="landing-features-grid">
              {features.map((f) => (
                <div key={f.title} className="landing-feature-card">
                  <div className="landing-feature-icon">{f.icon}</div>
                  <h3 className="landing-feature-title">{f.title}</h3>
                  <p className="landing-feature-desc">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────────────── */}
        <section className="landing-bottom-cta">
          <div className="landing-container">
            <h2 className="landing-bottom-title">Ready to get started?</h2>
            <p className="landing-bottom-sub">
              Your salon dashboard is waiting.
            </p>
            <Link href="/dashboard" className="landing-cta-btn">
              Open Dashboard <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <span className="landing-logo landing-logo-sm">zaloon</span>
          <span className="landing-footer-copy">
            © {new Date().getFullYear()} Zaloon. All rights reserved.
          </span>
        </div>
      </footer>

      <style>{`
        /* ── Reset / scope ──────────────────────────────────────── */
        .landing-page {
          min-height: 100vh;
          background: #020502;
          color: #f0f0f0;
          font-family: var(--font-outfit, system-ui, sans-serif);
          position: relative;
          overflow-x: hidden;
        }

        /* ── Layout helpers ─────────────────────────────────────── */
        .landing-container {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        /* ── Header ─────────────────────────────────────────────── */
        .landing-header {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(180,239,165,0.10);
          background: rgba(2,5,2,0.82);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .landing-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }
        .landing-logo {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #B4EFA5;
        }
        .landing-logo-sm {
          font-size: 1rem;
        }
        .landing-header-cta {
          font-size: 0.875rem;
          font-weight: 500;
          color: #B4EFA5;
          text-decoration: none;
          padding: 0.4rem 1rem;
          border: 1px solid rgba(180,239,165,0.35);
          border-radius: 9999px;
          transition: background 0.18s, border-color 0.18s;
        }
        .landing-header-cta:hover {
          background: rgba(180,239,165,0.12);
          border-color: rgba(180,239,165,0.65);
        }

        /* ── Hero ───────────────────────────────────────────────── */
        .landing-hero {
          position: relative;
          padding: 7rem 0 6rem;
          text-align: center;
          overflow: hidden;
        }
        .landing-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }
        .landing-hero-orb {
          position: absolute;
          top: -160px;
          left: 50%;
          transform: translateX(-50%);
          width: 720px;
          height: 520px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(58,138,42,0.28) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .landing-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.3rem 0.85rem;
          border-radius: 9999px;
          border: 1px solid rgba(180,239,165,0.30);
          background: rgba(180,239,165,0.07);
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #B4EFA5;
        }
        .landing-headline {
          font-size: clamp(2.6rem, 7vw, 5rem);
          font-weight: 800;
          line-height: 1.07;
          letter-spacing: -0.04em;
          color: #f0f0f0;
          margin: 0;
          max-width: 16ch;
        }
        .landing-headline-accent {
          color: #B4EFA5;
        }
        .landing-subtext {
          font-size: clamp(1rem, 2vw, 1.2rem);
          line-height: 1.65;
          color: #8a9a8a;
          max-width: 44ch;
          margin: 0;
        }
        .landing-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.85rem 2rem;
          border-radius: 9999px;
          background: #B4EFA5;
          color: #020502;
          font-size: 1rem;
          font-weight: 700;
          text-decoration: none;
          letter-spacing: -0.01em;
          transition: background 0.18s, transform 0.15s, box-shadow 0.18s;
          box-shadow: 0 0 0 0 rgba(180,239,165,0);
          margin-top: 0.5rem;
        }
        .landing-cta-btn:hover {
          background: #caf6ba;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(180,239,165,0.25);
        }
        .landing-cta-btn:active {
          transform: translateY(0);
        }

        /* ── Stats bar ──────────────────────────────────────────── */
        .landing-stats-bar {
          border-top: 1px solid rgba(180,239,165,0.10);
          border-bottom: 1px solid rgba(180,239,165,0.10);
          padding: 1.1rem 0;
          background: rgba(13,18,13,0.60);
        }
        .landing-stats-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .landing-stat-item {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          font-size: 0.92rem;
          font-weight: 500;
          color: #8a9a8a;
          letter-spacing: 0.01em;
        }
        .landing-stat-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(180,239,165,0.35);
          flex-shrink: 0;
        }

        /* ── Features ───────────────────────────────────────────── */
        .landing-features-section {
          padding: 6rem 0;
          text-align: center;
        }
        .landing-section-title {
          font-size: clamp(1.8rem, 4vw, 2.75rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #f0f0f0;
          margin: 0 0 0.75rem;
        }
        .landing-section-sub {
          font-size: 1.05rem;
          color: #8a9a8a;
          margin: 0 0 3.5rem;
        }
        .landing-features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        .landing-feature-card {
          text-align: left;
          padding: 1.75rem;
          border-radius: 1.1rem;
          border: 1px solid rgba(180,239,165,0.10);
          background: rgba(13,18,13,0.70);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          transition: border-color 0.2s, background 0.2s, transform 0.18s;
        }
        .landing-feature-card:hover {
          border-color: rgba(180,239,165,0.30);
          background: rgba(13,18,13,0.90);
          transform: translateY(-3px);
        }
        .landing-feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 0.65rem;
          background: rgba(180,239,165,0.10);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #B4EFA5;
          flex-shrink: 0;
        }
        .landing-feature-title {
          font-size: 1rem;
          font-weight: 600;
          color: #f0f0f0;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .landing-feature-desc {
          font-size: 0.9rem;
          color: #8a9a8a;
          margin: 0;
          line-height: 1.55;
        }

        /* ── Bottom CTA ──────────────────────────────────────────── */
        .landing-bottom-cta {
          padding: 6rem 0;
          text-align: center;
          border-top: 1px solid rgba(180,239,165,0.08);
          background: radial-gradient(ellipse 70% 50% at 50% 100%, rgba(58,138,42,0.14) 0%, transparent 70%);
        }
        .landing-bottom-title {
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #f0f0f0;
          margin: 0 0 0.75rem;
        }
        .landing-bottom-sub {
          font-size: 1.05rem;
          color: #8a9a8a;
          margin: 0 0 2rem;
        }

        /* ── Footer ─────────────────────────────────────────────── */
        .landing-footer {
          padding: 1.75rem 0;
          border-top: 1px solid rgba(180,239,165,0.08);
        }
        .landing-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .landing-footer-copy {
          font-size: 0.82rem;
          color: #5a6e5a;
        }

        /* ── Responsive ─────────────────────────────────────────── */
        @media (max-width: 640px) {
          .landing-hero {
            padding: 5rem 0 4rem;
          }
          .landing-features-grid {
            grid-template-columns: 1fr;
          }
          .landing-stats-inner {
            gap: 1rem;
          }
          .landing-footer-inner {
            justify-content: center;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
