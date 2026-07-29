/**
 * Portal layout — always light mode.
 * Mirrors the pattern used by the /book layout.
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="light"
      style={{ colorScheme: "light" }}
      className="min-h-screen bg-background text-foreground"
    >
      {children}
    </div>
  );
}
