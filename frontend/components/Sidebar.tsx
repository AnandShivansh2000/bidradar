"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import type { Portal } from "@/lib/types";
import { MOCK_PORTALS } from "@/lib/mock-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("failed");
  return res.json();
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Feed", icon: "📋" },
  { href: "/scan", label: "Live Scan", icon: "🔍" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: portals } = useSWR<Portal[]>(
    `${API_BASE}/api/v1/portals`,
    fetcher,
    { fallbackData: MOCK_PORTALS, refreshInterval: 30000 }
  );

  return (
    <aside
      className="flex h-screen w-60 flex-col bg-slate-900 text-slate-100 shrink-0 fixed left-0 top-0 z-10"
      style={{ minWidth: 240 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
        <span className="text-2xl">📡</span>
        <span className="font-bold text-lg tracking-tight text-white">BidRadar</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Portal Status */}
      <div className="border-t border-slate-800 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Portal Status
        </p>
        <div className="space-y-2.5">
          {(portals ?? MOCK_PORTALS).map((portal) => (
            <div key={portal.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    portal.status === "healthy"
                      ? "bg-green-400"
                      : portal.status === "degraded"
                      ? "bg-yellow-400"
                      : "bg-red-400"
                  }`}
                />
                <span className="text-xs text-slate-300">{portal.display_name}</span>
              </div>
              <span className="text-xs text-slate-500">
                {formatRelativeTime(portal.last_scan_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
