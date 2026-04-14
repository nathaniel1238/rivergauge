"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconFn = (cls: string) => React.ReactNode;

const navItems: { label: string; href: string; icon: IconFn }[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (cls) => (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: (cls) => (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (cls) => (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const filteredItems = navItems.filter(
    (item) => item.href !== "/alerts" || process.env.NEXT_PUBLIC_FEATURE_ALERTS === "true"
  );

  return (
    <>
      {/* ── Desktop sidebar (≥1024px) ─────────────────────────────────── */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 h-full bg-[#0a1128] border-r border-white/10 flex-col z-20"
        style={{ width: "var(--sidebar-width)" }}
      >
        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div className="flex items-center h-[60px] border-b border-white/10 flex-shrink-0 overflow-hidden px-0 pt-1.5">
          <img
            src="/logo2.jpg"
            alt="River Gauge"
            className="w-full h-full object-cover"
          />
        </div>

        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {filteredItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? "bg-[#1b3a8a] text-white border-l-2 border-[#3b6cf5] pl-[10px] pr-3"
                    : "text-[#94a3b8] hover:bg-white/5 hover:text-[#f1f5f9] px-3"
                }`}
              >
                <span className={`transition-colors ${active ? "text-white" : "text-[#64748b]"}`}>
                  {item.icon("w-[15px] h-[15px]")}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[11px] text-[#64748b]">All systems online</span>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar (<1024px) ──────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0a1128] border-t border-white/10 flex items-stretch"
        style={{
          height: "var(--bottom-nav-height)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {filteredItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
                active ? "text-white" : "text-[#64748b]"
              }`}
            >
              {item.icon("w-5 h-5")}
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
