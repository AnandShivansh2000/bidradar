"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getOpportunity } from "@/lib/api";
import type { Opportunity, RelevanceLevel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatValue(value: number | null, min: number | null, max: number | null): string {
  if (value) return `$${(value / 1000000).toFixed(2)}M`;
  if (min && max) return `$${(min / 1000).toFixed(0)}K – $${(max / 1000).toFixed(0)}K`;
  if (min) return `$${(min / 1000).toFixed(0)}K+`;
  return "Not specified";
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getOpportunity(id)
      .then(setOpp)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-3">😕</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Opportunity not found</h2>
        <Link href="/feed">
          <Button variant="outline">← Back to Feed</Button>
        </Link>
      </div>
    );
  }

  const days = getDaysUntil(opp.deadline);
  const isUrgent = opp.is_urgent || (days !== null && days <= 3);

  const relevanceConfig: Record<RelevanceLevel, { variant: "high" | "medium" | "low"; label: string; color: string }> = {
    high: { variant: "high", label: "High Relevance", color: "bg-green-50 border-green-200" },
    medium: { variant: "medium", label: "Medium Relevance", color: "bg-yellow-50 border-yellow-200" },
    low: { variant: "low", label: "Low Relevance", color: "bg-gray-50 border-gray-200" },
  };
  const rel = opp.relevance_level ? relevanceConfig[opp.relevance_level] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/feed" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          ← Back to Feed
        </Link>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">{opp.title}</h1>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-6 flex-wrap text-sm text-gray-600">
          <Badge variant="secondary">{opp.portal}</Badge>
          <span>{opp.agency}</span>
          {opp.state && <span>📍 {opp.state}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Relevance box */}
          {rel && (
            <Card className={`border ${rel.color}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={rel.variant} className="text-sm px-3 py-1">{rel.label}</Badge>
                  {opp.relevance_score !== null && (
                    <span className="text-2xl font-bold text-gray-900">
                      {opp.relevance_score.toFixed(2)}<span className="text-sm font-normal text-gray-500">/1.0</span>
                    </span>
                  )}
                </div>
                {opp.relevance_reasons.length > 0 && (
                  <ul className="space-y-1">
                    {opp.relevance_reasons.map((reason, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Deadline box */}
          <Card className={isUrgent ? "border-red-200" : ""}>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Deadline</h3>
              {opp.deadline ? (
                <>
                  <p className="text-gray-700 mb-1">
                    {new Date(opp.deadline).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {days !== null && (
                    <p className={`text-lg font-semibold ${isUrgent ? "text-red-600" : days <= 7 ? "text-yellow-600" : "text-gray-700"}`}>
                      ⏰ {days > 0 ? `${days} days remaining` : days === 0 ? "Due today!" : "Deadline passed"}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No deadline specified</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details grid */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Contract Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Value</p>
                <p className="font-semibold text-emerald-700">{formatValue(opp.value, opp.value_min, opp.value_max)}</p>
              </div>
              {opp.naics_code && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">NAICS</p>
                  <p className="font-medium">{opp.naics_code}</p>
                  {opp.naics_description && <p className="text-xs text-gray-500">{opp.naics_description}</p>}
                </div>
              )}
              {opp.set_asides.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Set-Asides</p>
                  <div className="flex flex-wrap gap-1">
                    {opp.set_asides.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {opp.state && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">State</p>
                  <p className="font-medium">{opp.state}</p>
                </div>
              )}
              {opp.solicitation_number && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Solicitation #</p>
                  <p className="font-medium font-mono text-sm">{opp.solicitation_number}</p>
                </div>
              )}
              {opp.posted_date && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Posted</p>
                  <p className="font-medium">{new Date(opp.posted_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {opp.description && (
          <Card className="mb-6">
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{opp.description}</p>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        {opp.opportunity_url && (
          <div className="flex justify-center">
            <a href={opp.opportunity_url} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-8">
                View on {opp.portal} →
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
