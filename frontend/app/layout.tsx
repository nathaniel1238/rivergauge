import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ErrorBoundary from "@/components/ErrorBoundary";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a1128",
};

export const metadata: Metadata = {
  title: { default: "River Gauge", template: "%s · River Gauge" },
  description: "Real-time river level monitoring dashboard",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="bg-surface h-full">
        <Sidebar />
        <main
          className="min-h-screen px-4 sm:px-7 pt-6 sm:pt-8"
          style={{
            marginLeft: "var(--sidebar-width)",
            paddingBottom: "calc(var(--bottom-nav-height) + max(env(safe-area-inset-bottom), 2rem))",
          }}
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </body>
    </html>
  );
}
