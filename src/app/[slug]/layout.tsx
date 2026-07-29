/**
 * Public salon landing layout — always light mode.
 */
export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="min-h-screen bg-white text-gray-900" style={{ colorScheme: "light" }}>
      {children}
    </div>
  );
}
