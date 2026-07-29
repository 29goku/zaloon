/**
 * Kiosk layout — standalone full-screen mode for tablets.
 * Forces light mode, removes all sidebar/header chrome, and ensures
 * large tap targets throughout by inheriting base font size on large text.
 */
export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="light"
      style={{ colorScheme: "light" }}
      className="min-h-screen bg-white text-stone-900 antialiased"
    >
      {children}
    </div>
  );
}
