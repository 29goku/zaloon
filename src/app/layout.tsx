import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#B4EFA5",
};

export const metadata: Metadata = {
  title: "Zaloon — Salon Dashboard",
  description: "Modern salon management for professionals worldwide",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Zaloon",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full dark`} suppressHydrationWarning>
      <head>
        {/* Inline script to apply saved theme before first paint — avoids flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('zaloon-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=t||(d?'dark':'light');document.documentElement.classList.toggle('dark',theme==='dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
