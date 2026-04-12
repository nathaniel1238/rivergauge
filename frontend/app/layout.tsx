import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: { default: "River Gauge", template: "%s · River Gauge" },
  description: "Real-time river level monitoring dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="bg-surface h-full">
        <Sidebar />
        <main
          className="min-h-screen px-7 py-8"
          style={{ marginLeft: "var(--sidebar-width)" }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
