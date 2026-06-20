import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoFare",
  description: "Estimate fair auto-rickshaw fares across Indian cities.",
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
        {children}
      </body>
    </html>
  );
}
