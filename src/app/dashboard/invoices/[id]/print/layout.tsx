/**
 * Standalone layout for the invoice print page.
 * Intentionally bypasses the dashboard shell (sidebar navigation)
 * so the printed page is clean.
 *
 * NOTE: In Next.js App Router only the root app/layout.tsx renders
 * <html> and <body>. Nested layouts must NOT repeat those tags.
 */
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
