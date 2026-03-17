"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RelevanceBadge } from "@/components/RelevanceBadge";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import type { Opportunity, Scan } from "@/lib/types";
import { MOCK_OPPORTUNITIES } from "@/lib/mock-data";
import { triggerScan, getScan, getScanOpportunities, getDemoReplay } from "@/lib/api";

type ScanState = "idle" | "starting" | "running" | "complete" | "failed";

const PORTALS = [
  { value: "sam_gov", label: "SAM.gov" },
  { value: "cal_eprocure", label: "Cal eProcure" },
  { value: "tx_smartbuy", label: "Texas SmartBuy" },
];

function formatValue(opp: Opportunity): string {
  if (opp.value_display) return opp.value_display;
  if (opp.value_min) {
    const fmt = (n: number) =>
      n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;
    if (opp.value_max) return `${fmt(opp.value_min)}–${fmt(opp.value_max)}`;
    return fmt(opp.value_min);
  }
  return "TBD";
}

function formatDeadline(opp: Opportunity): string {
  const d = opp.response_deadline ?? opp.deadline;
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDays(opp: Opportunity): number | null {
  if (opp.days_until_deadline !== undefined && opp.days_until_deadline !== null) {
    return opp.days_until_deadline;
  }
  const d = opp.response_deadline ?? opp.deadline;
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const label = (opp.relevance_label?.toLowerCase() ?? opp.relevance_level ?? "low") as "high" | "medium" | "low";
  const days = getDays(opp);

  return (
    <div className="animate-fade-in-down border border-slate-200 rounded-lg p-3 bg-white hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <RelevanceBadge variant={label} score={opp.relevance_score ?? undefined} />
          <UrgencyBadge daysUntilDeadline={days} />
        </div>
      </div>
      <p className="text-sm font-medium text-slate-900 leading-snug mt-1.5 mb-1">
        {truncate(opp.title, 60)}
      </p>
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-500">{opp.agency}</span>
        <span className="text-slate-300">·</span>
        <span className="font-medium text-slate-700">{formatValue(opp)}</span>
        <span className="text-slate-300">·</span>
        <span
          className={
            days !== null && days <= 2
              ? "text-red-600 font-medium"
              : days !== null && days <= 7
              ? "text-orange-600 font-medium"
              : "text-slate-500"
          }
        >
          {formatDeadline(opp)}
        </span>
      </div>
    </div>
  );
}

function ScanPageContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("replay") === "true";

  const [selectedPortal, setSelectedPortal] = useState("sam_gov");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scan, setScan] = useState<Scan | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [matchCount, setMatchCount] = useState(0);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopAll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  // Auto-start demo on mount
  useEffect(() => {
    if (isDemo) startDemoReplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const startDemoReplay = useCallback(async () => {
    stopAll();
    setScanState("starting");
    setOpportunities([]);
    setMatchCount(0);
    setErrorMsg(null);
    setStreamUrl("https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1");
    setElapsedSeconds(0);

    await new Promise((r) => setTimeout(r, 800));
    setScanState("running");
    startTimer();

    let demoOpps: Opportunity[] = [];
    try { demoOpps = await getDemoReplay(); } catch { demoOpps = MOCK_OPPORTUNITIES; }

    demoOpps.slice(0, 5).forEach((opp, i) => {
      setTimeout(() => {
        setOpportunities((prev) => [opp, ...prev]);
        setMatchCount((c) => c + 1);
      }, (i + 1) * 1500);
    });

    setTimeout(() => {
      setScanState("complete");
      stopAll();
    }, demoOpps.slice(0, 5).length * 1500 + 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAll]);

  const startRealScan = useCallback(async () => {
    stopAll();
    setScanState("starting");
    setOpportunities([]);
    setMatchCount(0);
    setErrorMsg(null);
    setStreamUrl(null);
    setElapsedSeconds(0);

    try {
      const newScan = await triggerScan(selectedPortal);
      setScan(newScan);
      if (newScan.stream_url) setStreamUrl(newScan.stream_url);
      setScanState("running");
      startTimer();

      pollRef.current = setInterval(async () => {
        try {
          const [updatedScan, opps] = await Promise.all([
            getScan(newScan.id),
            getScanOpportunities(newScan.id),
          ]);
          setScan(updatedScan);
          setOpportunities(opps.slice(0, 20));
          setMatchCount(opps.filter((o) => (o.relevance_score ?? 0) >= 0.7).length);
          if (updatedScan.status === "completed" || updatedScan.status === "failed") {
            stopAll();
            setScanState(updatedScan.status === "completed" ? "complete" : "failed");
            if (updatedScan.error_message) setErrorMsg(updatedScan.error_message);
          }
        } catch { /* ignore poll errors */ }
      }, 3000);
    } catch (err) {
      setScanState("failed");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPortal, stopAll]);

  const resetScan = () => {
    stopAll();
    setScanState("idle");
    setOpportunities([]);
    setStreamUrl(null);
    setErrorMsg(null);
    setScan(null);
    setElapsedSeconds(0);
    setMatchCount(0);
  };

  const totalFound = scan?.opportunities_found ?? opportunities.length;
  const portalLabel = PORTALS.find((p) => p.value === selectedPortal)?.label ?? selectedPortal;
  const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const secs = String(elapsedSeconds % 60).padStart(2, "0");

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      {/* Header bar */}
      <header className="flex items-center gap-3 px-5 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Dashboard
        </Link>
        <div className="h-4 w-px bg-slate-700" />
        <span className="font-bold text-white">📡 BidRadar</span>
        <span className="text-slate-500 text-sm">/</span>
        <span className="text-slate-300 text-sm">Live Scan</span>

        <div className="flex-1" />

        {isDemo && (
          <span className="rounded-full bg-purple-950 border border-purple-700 px-3 py-1 text-xs font-medium text-purple-300">
            🎬 Demo Mode
          </span>
        )}

        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          {scanState === "idle" && <span className="text-slate-400">Ready to scan</span>}
          {scanState === "starting" && <span className="text-yellow-400 animate-pulse">⏳ Starting…</span>}
          {scanState === "running" && (
            <>
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 font-medium">{portalLabel} — {mins}:{secs}</span>
              <span className="text-slate-400">· {opportunities.length} found</span>
            </>
          )}
          {scanState === "complete" && (
            <span className="text-green-400">
              ✅ Scan complete — {totalFound} found. {matchCount} match your profile.
            </span>
          )}
          {scanState === "failed" && (
            <span className="text-red-400">
              ❌ Scan failed{errorMsg ? `: ${errorMsg}` : ""}. Using last known results.
            </span>
          )}
        </div>
      </header>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: stream panel (55%) */}
        <div className="flex flex-col border-r border-slate-800" style={{ width: "55%" }}>
          {/* Controls */}
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <select
              value={selectedPortal}
              onChange={(e) => { setSelectedPortal(e.target.value); if (scanState !== "idle") resetScan(); }}
              className="rounded bg-slate-800 border border-slate-700 text-white text-sm px-2 py-1.5 focus:outline-none focus:border-slate-500"
              disabled={scanState === "running" || scanState === "starting"}
            >
              {PORTALS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {(scanState === "idle" || scanState === "failed" || scanState === "complete") ? (
              <>
                <button
                  onClick={startRealScan}
                  className="rounded bg-green-600 hover:bg-green-500 px-4 py-1.5 text-sm font-semibold transition-colors"
                >
                  ▶ Run Scan
                </button>
                <button
                  onClick={startDemoReplay}
                  className="rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 px-3 py-1.5 text-sm font-medium transition-colors"
                >
                  🎬 Demo
                </button>
              </>
            ) : (
              <button
                onClick={resetScan}
                className="rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 px-3 py-1.5 text-sm font-medium transition-colors"
              >
                ✕ Stop
              </button>
            )}
          </div>

          {/* Stream area */}
          <div className="relative flex-1 bg-slate-950 overflow-hidden">
            {scanState === "running" && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white shadow">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
            )}

            {streamUrl ? (
              <iframe
                src={streamUrl}
                className="w-full h-full"
                allow="fullscreen; autoplay"
                frameBorder="0"
                title="Browser stream"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                {(scanState === "running" || scanState === "starting") ? (
                  <>
                    <div className="h-14 w-14 rounded-full border-4 border-slate-700 border-t-green-400 animate-spin" />
                    <p className="text-slate-400 text-sm">🤖 Agent is running — browser view not available</p>
                  </>
                ) : scanState === "idle" ? (
                  <>
                    <span className="text-6xl text-slate-800">📡</span>
                    <p className="text-slate-500 text-sm">Select a portal and click Run Scan</p>
                    <p className="text-slate-600 text-xs">or try 🎬 Demo mode</p>
                  </>
                ) : scanState === "complete" ? (
                  <>
                    <span className="text-5xl">✅</span>
                    <p className="text-slate-300 text-sm font-medium">Scan complete</p>
                    <p className="text-slate-500 text-sm">{totalFound} opportunities found</p>
                  </>
                ) : (
                  <>
                    <span className="text-5xl">❌</span>
                    <p className="text-red-400 text-sm">Scan failed</p>
                    {errorMsg && <p className="text-slate-500 text-xs max-w-xs">{errorMsg}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: results (45%) */}
        <div className="flex flex-col bg-slate-50" style={{ width: "45%" }}>
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
            <h2 className="text-sm font-semibold text-slate-800">
              {scanState === "running"
                ? `${opportunities.length} opportunities found`
                : scanState === "complete"
                ? `${totalFound} found`
                : "Live Results"}
            </h2>
            {opportunities.length > 0 && (
              <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-800">
                View all →
              </Link>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {opportunities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                <span className="text-4xl text-slate-300">📋</span>
                <p className="text-slate-400 text-sm">
                  {scanState === "idle"
                    ? "Start a scan to see results here"
                    : scanState === "starting"
                    ? "Waiting for first results…"
                    : "No results yet"}
                </p>
              </div>
            ) : (
              <>
                {opportunities.map((opp) => (
                  <Link key={opp.id} href={`/dashboard/opportunity/${opp.id}`}>
                    <OpportunityCard opp={opp} />
                  </Link>
                ))}
                {opportunities.length >= 20 && (
                  <div className="text-center py-2">
                    <Link href="/dashboard" className="text-xs text-slate-400 hover:text-slate-700 underline">
                      Load more →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-950 text-white text-sm">Loading…</div>}>
      <ScanPageContent />
    </Suspense>
  );
}
