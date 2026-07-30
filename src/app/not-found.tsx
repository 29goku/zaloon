import Link from "next/link";
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl font-bold text-primary">404</div>
        <h1 className="text-xl font-bold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">The page you are looking for does not exist.</p>
        <Link href="/dashboard" className="inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
