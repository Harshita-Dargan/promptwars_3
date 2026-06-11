import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Antigravity Carbon — Weightless Footprint & Ascension Heights",
  description: "Fracture your carbon debt, chip away the heavy physical mass, and float up into the atmosphere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-slate-950">{children}</body>
    </html>
  );
}
