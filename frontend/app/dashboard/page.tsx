"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Sidebar } from "@/components/Sidebar";
import { RelevanceBadge } from "@/components/RelevanceBadge";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { PortalBadge } from "@/components/PortalBadge";
import type { Opportunity } from "@/lib/types";
import { MOCK_OPPORTUNITIES } from "@/lib/mock-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const SET_ASIDE_OPTIONS = [
  { value: "all", label: "All Set-Asides" },
  { value: "8a", label: "8(a)" },
  { value: "hubzone", label: "HUBZone" },
  { value: "wosb", label: "WOSB" },
  { value: "sdvosb", label: "SDVOSB" },
  { value: "sba", label: "SBA" },
  { value: "dvbe", label: "DVBE" },
  { value: "hubs", label: "HUBs" },
];

const PORTAL_OPTIONS = [
  { value: "all", label: "All Portals" },
  { value: "sam_gov", label: "SAM.gov" },
  { value: "cal_eprocure", label: "Cal eProcure" },
  { value: "tx_smartbuy", label: "Texas SmartBuy" },
];

const RELEVANCE_OPTIONS = [
  { value: "all", label: "All Relevance" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("failed");
  return res.json();
}

function formatValue(opp: Opportunity): string {
  if (opp.value_display) return opp.value_display;
  if (opp.value_min) {
    const fmt = (n: number) =>
      n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;
    if (opp.value_max) return `${fmt(opp.value_min)}–${fmt(opp.value_max)}`;
    return fmt(opp.value_min);
  }
  return "—";
}

function formatDeadline(opp: Opportunity): { text: string; days: number | null } {
  const d = opp.response_deadline ?? opp.deadline;
  if (!d) return { text: "—", days: null };
  const days = opp.days_until_deadline !== undefined && opp.days_until_deadline !== null
    ? opp.days_until_deadline
    : Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  const text = new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { text, days };
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-4 rounded animate-shimmer" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function DashboardPage() {
  const [portal, setPortal] = useState("all");
  const [relevance, setRelevance] = useState("all");
  const [setAside, setSetAside] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [allOpps, setAllOpps] = useState<Opportunity[]>([]);

  const params = new URLSearchParams({ limit: "50", offset: String(offset) });
  if (portal !== "all") params.set("portal", portal);
  if (relevance !== "all") params.set("relevance", relevance);
  if (setAside !== "all") params.set("set_aside", setAside);
  if (stateFilter !== "all") params.set("state", stateFilter);
  if (urgentOnly) params.set("urgent_only", "true");

  const { data, isLoading } = useSWR<Opportunity[]>(
    `${API_BASE}/api/v1/opportunities?${params.toString()}`,
    fetcher,
    { fallbackData: MOCK_OPPORTUNITIES, revalidateOnFocus: false }
  );

  // Accumulate rows on load more
  useEffect(() => {
    if (data) {
      if (offset === 0) {
        setAllOpps(data);
      } else {
        setAllOpps((prev) => {
          const existingIds = new Set(prev.map((o) => o.id));
          return [...prev, ...data.filter((o) => !existingIds.has(o.id))];
        });
      }
    }
  }, [data, offset]);

  // Reset on filter change
  useEffect(() => {
    setOffset(0);
    setAllOpps([]);
  }, [portal, relevance, setAside, stateFilter, urgentOnly]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return allOpps;
    const q = search.toLowerCase();
    return allOpps.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.agency.toLowerCase().includes(q)
    );
  }, [allOpps, search]);

  // Sort: relevance DESC then deadline ASC
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ra = a.relevance_score ?? 0;
      const rb = b.relevance_score ?? 0;
      if (rb !== ra) return rb - ra;
      const da = a.response_deadline ?? a.deadline ?? "";
      const db = b.response_deadline ?? b.deadline ?? "";
      return da.localeCompare(db);
    });
  }, [filtered]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 ml-60 min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-bold text-slate-900">Opportunities Feed</h1>
        </div>

        {/* Sticky filter bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-3">
          <select
            value={portal}
            onChange={(e) => setPortal(e.target.value)}
            className="rounded-md border border-slate-200 bg-white text-sm px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-blue-400"
          >
            {PORTAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={relevance}
            onChange={(e) => setRelevance(e.target.value)}
            className="rounded-md border border-slate-200 bg-white text-sm px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-blue-400"
          >
            {RELEVANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={setAside}
            onChange={(e) => setSetAside(e.target.value)}
            className="rounded-md border border-slate-200 bg-white text-sm px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-blue-400"
          >
            {SET_ASIDE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white text-sm px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-blue-400"
          >
            <option value="all">All States</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={urgentOnly}
              onChange={(e) => setUrgentOnly(e.target.checked)}
              className="rounded border-slate-300 text-red-500 focus:ring-red-400"
            />
            <span>🔴 Urgent Only</span>
          </label>

          <input
            type="search"
            placeholder="Search title or agency…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto rounded-md border border-slate-200 bg-white text-sm px-3 py-1.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 w-56"
          />
        </div>

        {/* Count */}
        <div className="px-6 py-3 text-sm text-slate-500">
          {isLoading && allOpps.length === 0
            ? "Loading…"
            : `Showing ${sorted.length}${(data?.length ?? 0) === 50 ? "+" : ""} opportunities`}
        </div>

        {/* Table */}
        <div className="px-6 pb-8 overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Relevance</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-44">Agency</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Portal</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Value</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Deadline</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">State</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Set-Aside</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && allOpps.length === 0
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : sorted.length === 0
                ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">📭</span>
                        <p>No opportunities match your filters.</p>
                        <button
                          onClick={() => { setPortal("all"); setRelevance("all"); setSetAside("all"); setStateFilter("all"); setUrgentOnly(false); setSearch(""); }}
                          className="text-sm text-blue-600 hover:underline mt-1"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )
                : sorted.map((opp) => {
                  const label = (opp.relevance_label?.toLowerCase() ?? opp.relevance_level ?? "low") as "high" | "medium" | "low";
                  const { text: deadlineText, days } = formatDeadline(opp);
                  const setAsides = opp.set_asides ?? [];
                  const firstSetAside = setAsides[0];
                  const extraCount = setAsides.length - 1;

                  return (
                    <tr key={opp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3">
                        <RelevanceBadge variant={label} score={opp.relevance_score ?? undefined} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/opportunity/${opp.id}`}
                            className="text-slate-900 font-medium hover:text-blue-600 transition-colors"
                          >
                            {opp.title.length > 60 ? opp.title.slice(0, 60) + "…" : opp.title}
                          </Link>
                          <UrgencyBadge daysUntilDeadline={days} />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 text-xs">{opp.agency}</td>
                      <td className="px-3 py-3">
                        <PortalBadge portal={opp.portal} />
                      </td>
                      <td className="px-3 py-3 text-slate-700 font-medium text-xs">{formatValue(opp)}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`text-xs font-medium ${
                            days !== null && days <= 2
                              ? "text-red-600"
                              : days !== null && days <= 7
                              ? "text-orange-600"
                              : "text-slate-600"
                          }`}
                        >
                          {deadlineText}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{opp.state ?? "—"}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {firstSetAside ? (
                          <span>
                            {firstSetAside.toUpperCase()}
                            {extraCount > 0 && <span className="text-slate-400 ml-1">+{extraCount} more</span>}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {/* Load more */}
          {(data?.length ?? 0) >= 50 && !isLoading && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setOffset((prev) => prev + 50)}
                className="rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
