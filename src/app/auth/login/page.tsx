import { GoogleSignInButton } from "./google-sign-in-button";
import { DevBypassForm } from "./dev-bypass-form";

export const metadata = {
  title: "Sign in — Zaloon",
};

export default function LoginPage() {
  const isDev = process.env.NODE_ENV === "development";
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F48E16] mb-4">
            <span className="text-white font-bold text-2xl">Z</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Zaloon</h1>
          <p className="text-zinc-400 text-sm mt-1">Salon management for professionals</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="text-lg font-medium text-zinc-100 mb-1">Sign in to Zaloon</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Use your Google account to access the dashboard.
          </p>
          <GoogleSignInButton />
          {isDev && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-zinc-900 px-2 text-zinc-500">Dev bypass</span>
                </div>
              </div>
              <DevBypassForm />
            </>
          )}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Access is restricted to authorised team members.
        </p>
      </div>
    </main>
  );
}
