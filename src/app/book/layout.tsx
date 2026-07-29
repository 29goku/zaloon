/**
 * Public booking layout — always rendered in light mode regardless of the
 * user's dashboard theme preference.
 *
 * Because the dark variant is defined as `(&:is(.dark *))` in globals.css,
 * elements nested inside `.dark` on <html> inherit dark mode. We break that
 * for this subtree via `color-scheme: light` (browser UI stays light) and
 * by not applying any dark: Tailwind classes in the booking pages themselves.
 * The `data-theme="light"` attribute serves as a clear semantic marker.
 */
export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="light"
      style={{ colorScheme: "light" }}
    >
      {children}
    </div>
  );
}
