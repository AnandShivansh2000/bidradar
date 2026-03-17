"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getOpportunities, getPortals } from "@/lib/api";
import type { Opportunity, Portal, OpportunityFilters, RelevanceLevel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatValue(value: number | null, min: number | null, max: number | null): string {
  if (value) return `$${(value / 1000000).toFixed(1)}M`;
  if (min && max) return `$${(min / 1000).toFixed(0)}K–$${(max / 1000).toFixed(0)}K`;
  if (min) return `$${(min / 1000).toFixed(0)}K+`;
  return "N/A";
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getLastScannedText(portals: Portal[]): string {
  const dates = portals
    .map((p) => p.last_scan_at)
    .filter(Boolean)
    .map((d) => new Date(d!).getTime());
  if (!dates.length) return "Never scanned";
  const latest = Math.max(...dates);
  const hours = Math.round((Date.now() - latest) / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}

function RelevanceBadge({ level }: { level: RelevanceLevel | null }) {
  if (!level) return null;
  const map: Record<RelevanceLevel, { variant: "high" | "medium" | "low"; label: string }> = {
    high: { variant: "high", label: "High" },
    medium: { variant: "medium", label: "Medium" },
    low: { variant: "low", label: "Low" },
  };
  const { variant, label } = map[level];
  return <Badge variant={variant}>{label}</Badge>;
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const days = getDaysUntil(opp.deadline);
  const isUrgent = opp.is_urgent || (days !== null && days <= 3);
  const isClosingSoon = !isUrgent && days !== null && days <= 7;

  return (
    <Link href={`/opportunities/${opp.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <RelevanceBadge level={opp.relevance_level} />
                {isUrgent && <Badge variant="urgent">🔴 URGENT</Badge>}
                {isClosingSoon && <Badge variant="closing">⚡ Closing Soon</Badge>}
                <Badge variant="secondary" className="text-xs">{opp.portal}</Badge>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 truncate">
                {opp.title.length > 60 ? opp.title.slice(0, 60) + "…" : opp.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <span>{opp.agency}</span>
                {opp.state && <span>📍 {opp.state}</span>}
                {opp.naics_code && <span>NAICS: {opp.naics_code}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-semibold text-emerald-700 text-sm">
                {formatValue(opp.value, opp.value_min, opp.value_max)}
              </div>
              {opp.deadline && (
                <div className={`text-xs mt-1 ${isUrgent ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                  {days !== null ? `${days}d left` : new Date(opp.deadline).toLocaleDateString()}
                </div>
              )}
              <div className="text-xs text-emerald-600 mt-1">View Details →</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FeedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);

  const relevance = (searchParams.get("relevance") || "all") as RelevanceLevel | "all";
  const portal = searchParams.get("portal") || "all";
  const urgentOnly = searchParams.get("urgent_only") === "true";
  const sort = (searchParams.get("sort") || "relevance") as "relevance" | "date";

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "all" || value === "false") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/feed?${params.toString()}`);
    },
    [searchParams, router]
  );

  useEffect(() => {
    setLoading(true);
    const filters: OpportunityFilters = { relevance, portal, urgent_only: urgentOnly, sort };
    Promise.all([getOpportunities(filters), getPortals()])
      .then(([opps, pts]) => {
        setOpportunities(opps);
        setPortals(pts);
      })
      .catch(() => {
        setOpportunities([]);
        setPortals([]);
      })
      .finally(() => setLoading(false));
  }, [relevance, portal, urgentOnly, sort]);

  const portalStatusColor = (status: string) => {
    if (status === "healthy") return "bg-green-100 text-green-700 border-green-200";
    if (status === "degraded") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/feed" className="text-xl font-bold text-gray-900">
                🎯 BidRadar
              </Link>
              <div className="hidden md:flex items-center gap-2">
                {portals.map((p) => (
                  <span
                    key={p.id}
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${portalStatusColor(p.status)}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${p.status === "healthy" ? "bg-green-500" : p.status === "degraded" ? "bg-yellow-500" : "bg-gray-400"}`} />
                    {p.display_name || p.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {portals.length > 0 && (
                <span className="hidden sm:block">Last scanned: {getLastScannedText(portals)}</span>
              )}
              <Link href="/scan">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  ⚡ Scan Now
                </Button>
              </Link>
              <Link href="/profile">
                <Button size="sm" variant="outline">Profile</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-[57px] z-30">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Relevance pills */}
            <div className="flex items-center gap-1">
              {(["all", "high", "medium", "low"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setFilter("relevance", r)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    relevance === r
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-gray-200" />

            {/* Portal pills */}
            <div className="flex items-center gap-1">
              {(["all", "SAM.gov", "Cal eProcure", "TX SmartBuy"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter("portal", p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    portal === p
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {p === "all" ? "All Portals" : p}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-gray-200" />

            {/* Urgent toggle */}
            <button
              onClick={() => setFilter("urgent_only", urgentOnly ? "false" : "true")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                urgentOnly
                  ? "bg-red-100 text-red-700 border-red-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              ⚡ Urgent Only
            </button>

            {/* Sort */}
            <div className="ml-auto flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setFilter("sort", e.target.value)}
                className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="date">Sort: Date Posted</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {!loading && (
          <p className="text-sm text-gray-500 mb-4">
            Showing {opportunities.length} opportunit{opportunities.length !== 1 ? "ies" : "y"}
          </p>
        )}

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No opportunities found</h3>
            <p className="text-gray-500 text-sm mb-4">Try adjusting your filters or run a new scan.</p>
            <Link href="/scan">
              <Button>⚡ Run a Scan</Button>
            </Link>
          </div>
        ) : (
          opportunities.map((opp) => <OpportunityCard key={opp.id} opp={opp} />)
        )}
      </main>
    </div>
  );
}
