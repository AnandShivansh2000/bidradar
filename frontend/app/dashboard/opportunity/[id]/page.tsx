"use client";

import { use } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { RelevanceBadge } from "@/components/RelevanceBadge";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { PortalBadge } from "@/components/PortalBadge";
import type { Opportunity } from "@/lib/types";
import { MOCK_OPPORTUNITIES } from "@/lib/mock-data";
import { getOpportunity } from "@/lib/api";

const PORTAL_URLS: Record<string, string> = {
  sam_gov: "SAM.gov",
  cal_eprocure: "Cal eProcure",
  tx_smartbuy: "Texas SmartBuy",
};

const SET_ASIDE_COLORS: Record<string, string> = {
  "8a": "bg-purple-100 text-purple-700 border-purple-200",
  hubzone: "bg-blue-100 text-blue-700 border-blue-200",
  wosb: "bg-pink-100 text-pink-700 border-pink-200",
  sdvosb: "bg-green-100 text-green-700 border-green-200",
  sba: "bg-orange-100 text-orange-700 border-orange-200",
  dvbe: "bg-teal-100 text-teal-700 border-teal-200",
  hubs: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

function formatValue(opp: Opportunity): string {
  if (opp.value_display) return opp.value_display;
  if (opp.value_min) {
    const fmt = (n: number) =>
      n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;
    if (opp.value_max) return `${fmt(opp.value_min)} – ${fmt(opp.value_max)}`;
    return fmt(opp.value_min);
  }
  return "Not specified";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function getDaysUntil(opp: Opportunity): number | null {
  if (opp.days_until_deadline !== undefined && opp.days_until_deadline !== null) {
    return opp.days_until_deadline;
  }
  const d = opp.response_deadline ?? opp.deadline;
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getOpportunity(id)
      .then(setOpp)
      .catch(() => {
        const mock = MOCK_OPPORTUNITIES.find((o) => o.id === id);
        setOpp(mock ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopy = () => {
    if (opp?.solicitation_number) {
      navigator.clipboard.writeText(opp.solicitation_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 ml-60 px-8 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="h-8 w-64 rounded animate-shimmer mb-4" />
            <div className="h-4 w-48 rounded animate-shimmer mb-8" />
            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-3 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-5 rounded animate-shimmer" style={{ width: `${70 + Math.random() * 30}%` }} />
                ))}
              </div>
              <div className="col-span-2">
                <div className="h-48 rounded-lg animate-shimmer" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 ml-60 flex items-center justify-center">
          <div className="text-center">
            <span className="text-5xl">🔍</span>
            <p className="mt-4 text-slate-600">Opportunity not found.</p>
            <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const label = (opp.relevance_label?.toLowerCase() ?? opp.relevance_level ?? "low") as "high" | "medium" | "low";
  const days = getDaysUntil(opp);
  const setAsides = opp.set_asides ?? [];
  const naicsCodes = opp.naics_codes ?? (opp.naics_code ? [opp.naics_code] : []);
  const reasons = opp.relevance_reasons ?? [];
  const portalName = PORTAL_URLS[opp.portal] ?? opp.portal;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 ml-60 min-w-0">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <span>›</span>
          <span className="text-slate-700 truncate max-w-xs">{opp.title}</span>
        </div>

        <div className="px-8 py-6 max-w-6xl">
          <div className="grid grid-cols-5 gap-8">
            {/* Left column (60%) */}
            <div className="col-span-3 space-y-6">
              {/* Title & meta */}
              <div>
                <h1 className="text-2xl font-bold text-slate-900 leading-snug mb-3">{opp.title}</h1>
                <div className="flex items-center gap-3 flex-wrap text-sm text-slate-600">
                  <span className="font-medium">{opp.agency}</span>
                  <span className="text-slate-300">·</span>
                  <PortalBadge portal={opp.portal} />
                  <span className="text-slate-300">·</span>
                  <span>Posted {formatDate(opp.posted_date)}</span>
                </div>
              </div>

              {/* Relevance */}
              <div className="flex items-center gap-3">
                <RelevanceBadge variant={label} score={opp.relevance_score ?? undefined} large />
                <span className="text-sm text-slate-600">
                  {label === "high" ? "High Match" : label === "medium" ? "Medium Match" : "Low Match"}
                  {opp.relevance_score && ` — ${Math.round(opp.relevance_score * 100)}%`}
                </span>
              </div>

              {/* Key details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Contract Value</p>
                  <p className="text-lg font-bold text-slate-900">{formatValue(opp)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Response Deadline</p>
                  <p className="text-lg font-bold text-slate-900">{formatDate(opp.response_deadline ?? opp.deadline)}</p>
                  {days !== null && (
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-sm font-medium ${
                          days <= 2 ? "text-red-600" : days <= 7 ? "text-orange-600" : "text-slate-500"
                        }`}
                      >
                        Closes in {days} day{days !== 1 ? "s" : ""}
                      </span>
                      <UrgencyBadge daysUntilDeadline={days} />
                    </div>
                  )}
                </div>
              </div>

              {/* NAICS */}
              {naicsCodes.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">NAICS Codes</p>
                  <div className="flex flex-wrap gap-2">
                    {naicsCodes.map((code) => (
                      <span key={code} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs text-slate-600 font-mono">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Set-asides */}
              {setAsides.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Set-Asides</p>
                  <div className="flex flex-wrap gap-2">
                    {setAsides.map((sa) => (
                      <span
                        key={sa}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${SET_ASIDE_COLORS[sa.toLowerCase()] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
                      >
                        {sa.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Place of Performance</p>
                <p className="text-slate-700 text-sm">{opp.state ?? "Not specified"}</p>
              </div>

              {/* Solicitation number */}
              {opp.solicitation_number && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Solicitation Number</p>
                  <p className="font-mono text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded px-3 py-2 inline-block">
                    {opp.solicitation_number}
                  </p>
                </div>
              )}

              {/* Description */}
              {opp.description && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Description</p>
                  <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 leading-relaxed">
                    {opp.description}
                  </div>
                </div>
              )}

              {/* External link */}
              {opp.opportunity_url && (
                <a
                  href={opp.opportunity_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 transition-colors"
                >
                  View on {portalName} →
                </a>
              )}
            </div>

            {/* Right column (40%) */}
            <div className="col-span-2 space-y-4">
              {/* Match reasons */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                {reasons.length > 0 ? (
                  <>
                    <h3 className="font-semibold text-green-800 mb-3 text-sm">✅ Why this matches your profile:</h3>
                    <ul className="space-y-2">
                      {reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                          <span className="text-green-500 mt-0.5 shrink-0">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-slate-600 mb-3">Set up your profile to see why this matches</p>
                    <Link
                      href="/profile"
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      → Go to Profile
                    </Link>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="font-semibold text-slate-800 text-sm">Actions</h3>

                {opp.solicitation_number && (
                  <button
                    onClick={handleCopy}
                    className="w-full flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors"
                  >
                    {copied ? "✅ Copied!" : "📋 Copy solicitation #"}
                  </button>
                )}

                {opp.opportunity_url && (
                  <a
                    href={opp.opportunity_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors"
                  >
                    🔗 Open in {portalName}
                  </a>
                )}
              </div>

              {/* Quick stats */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="font-semibold text-slate-800 text-sm mb-1">Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Portal</span>
                    <PortalBadge portal={opp.portal} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">State</span>
                    <span className="text-slate-700">{opp.state ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Posted</span>
                    <span className="text-slate-700">{formatDate(opp.posted_date)}</span>
                  </div>
                  {naicsCodes[0] && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">NAICS</span>
                      <span className="font-mono text-slate-700">{naicsCodes[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
