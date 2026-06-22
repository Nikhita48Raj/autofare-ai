import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoFare - Estimate Auto-Rickshaw Fares",
  description: "Calculate official auto-rickshaw fares, dispute overcharging, and view community overcharge analytics across Indian cities.",
  metadataBase: new URL("https://autofare.ai"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex min-h-screen flex-col bg-slate-50 text-slate-950">
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-slate-950 text-lg">
              <span className="bg-blue-600 text-white rounded-xl px-2.5 py-1 text-sm tracking-wide uppercase font-extrabold">Auto</span>
              <span>Fare</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-semibold text-slate-600">
              <Link href="/" className="transition hover:text-slate-950">Calculator</Link>
              <Link href="/dashboard" className="transition hover:text-slate-950">Analytics</Link>
            </nav>
          </div>
        </header>
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
