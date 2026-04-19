import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Datalyze – Instant Data Analytics",
  description: "Upload any CSV, Excel, PDF or Word file and get instant interactive analytics dashboards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
