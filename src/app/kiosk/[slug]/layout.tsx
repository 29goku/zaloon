/**
 * Kiosk slug layout — full-screen, touch-optimised, no scrollbars, light theme.
 */
export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="light"
      className="min-h-screen bg-white overflow-hidden touch-manipulation"
    >
      {children}
    </div>
  );
}
