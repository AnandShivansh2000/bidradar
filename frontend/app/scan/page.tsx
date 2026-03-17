"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { triggerScan, getScan, getScanOpportunities, getDemoReplay } from "@/lib/api";
import type { Opportunity, ScanStatus } from "@/lib/types";

type Portal = "sam_gov" | "cal_eprocure" | "tx_smartbuy";

const PORTAL_LABELS: Record<Portal, string> = {
  sam_gov: "SAM.gov",
  cal_eprocure: "Cal eProcure",
  tx_smartbuy: "TX SmartBuy",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatValue(value: number | null, min: number | null, max: number | null): string {
  if (value) return `$${(value / 1000000).toFixed(1)}M`;
  if (min) return `$${(min / 1000).toFixed(0)}K+`;
  if (max) return `Up to $${(max / 1000).toFixed(0)}K`;
  return "N/A";
}

function ResultCard({ opp, index }: { opp: Opportunity; index: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 150);
    return () => clearTimeout(timer);
  }, [index]);

  const title = opp.title.length > 45 ? opp.title.slice(0, 45) + "…" : opp.title;
  const days = opp.deadline
    ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      className={`transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
    >
      <Link href={`/opportunities/${opp.id}`}>
        <div className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-sm hover:border-emerald-200 transition-all cursor-pointer mb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1 flex-wrap">
                {opp.relevance_level === "high" && (
                  <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5">High</span>
                )}
                {opp.relevance_level === "medium" && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5">Medium</span>
                )}
                {opp.is_urgent && (
                  <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">🔴 Urgent</span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900 leading-snug">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opp.agency}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-emerald-700">
                {formatValue(opp.value, opp.value_min, opp.value_max)}
              </p>
              {days !== null && (
                <p className={`text-xs mt-0.5 ${days <= 3 ? "text-red-600" : "text-gray-500"}`}>
                  {days}d
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function ScanPageInner() {
  const searchParams = useSearchParams();

  const [portal, setPortal] = useState<Portal>("sam_gov");
  const [scanId, setScanId] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [results, setResults] = useState<Opportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isReplay, setIsReplay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Ready to scan");
  const [isPulsing, setIsPulsing] = useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startReplay = useCallback(async () => {
    setIsReplay(true);
    setIsScanning(false);
    setStreamUrl(null);
    setScanStatus(null);
    setResults([]);
    setError(null);
    setStatusText("Loading demo replay…");
    setIsPulsing(true);

    try {
      const opps = await getDemoReplay();
      for (let i = 0; i < opps.length; i++) {
        await new Promise((res) => setTimeout(res, 1000));
        setResults((prev) => [...prev, opps[i]]);
        setStatusText(`Replaying opportunity ${i + 1} of ${opps.length}…`);
      }
      setStatusText("Demo replay complete");
      setIsPulsing(false);
    } catch {
      setStatusText("Demo replay failed");
      setIsPulsing(false);
    }
  }, []);

  const startScan = useCallback(async () => {
    stopPolling();
    setResults([]);
    setError(null);
    setIsReplay(false);
    setIsScanning(true);
    setStreamUrl(null);
    setScanStatus("pending");
    setStatusText("Starting scan…");
    setIsPulsing(true);

    try {
      const scan = await triggerScan(portal);
      setScanId(scan.id);
      setStreamUrl(scan.stream_url || null);
      setScanStatus(scan.status);
      setStatusText(`Scanning ${PORTAL_LABELS[portal]}…`);

      pollRef.current = setInterval(async () => {
        try {
          const [updatedScan, opps] = await Promise.all([
            getScan(scan.id),
            getScanOpportunities(scan.id),
          ]);
          setScanStatus(updatedScan.status);
          setResults(opps);

          if (updatedScan.status === "completed") {
            stopPolling();
            setIsScanning(false);
            setIsPulsing(false);
            setStatusText("Scan complete");
          } else if (updatedScan.status === "failed") {
            stopPolling();
            setIsScanning(false);
            setIsPulsing(false);
            setError(updatedScan.error_message || "Scan failed");
            setStatusText("Scan failed");
            setTimeout(() => startReplay(), 2000);
          } else {
            setStatusText(`Scanning… ${opps.length} found so far`);
          }
        } catch {
          stopPolling();
          setIsScanning(false);
          setIsPulsing(false);
          setError("Connection error");
          setTimeout(() => startReplay(), 2000);
        }
      }, 3000);
    } catch {
      setIsScanning(false);
      setIsPulsing(false);
      setError("Failed to start scan");
      setStatusText("Failed to start scan");
      setTimeout(() => startReplay(), 2000);
    }
  }, [portal, stopPolling, startReplay]);

  // suppress unused variable warning
  void scanId;

  useEffect(() => {
    if (searchParams.get("replay") === "true") {
      startReplay();
    }
    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Top Nav */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between shrink-0">
        <Link href="/feed" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← Back to Feed
        </Link>
        <span className="text-white font-bold">🎯 BidRadar — Live Scan</span>
        <Link href="/feed">
          <span className="text-emerald-400 text-sm hover:text-emerald-300 cursor-pointer">View Feed →</span>
        </Link>
      </div>

      {/* Split screen */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL — 55% */}
        <div className="w-[55%] flex flex-col border-r border-gray-700 bg-gray-950">
          {/* Left header */}
          <div className="px-6 py-4 border-b border-gray-700 bg-gray-900 shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${isPulsing ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
              <h2 className="text-white font-semibold">🤖 Live Agent</h2>
            </div>
            <p className="text-gray-400 text-sm ml-5">
              {isScanning ? `Scanning ${PORTAL_LABELS[portal]}` : isReplay ? "Demo Replay Mode" : "Ready"}
            </p>
          </div>

          {/* Portal selector + buttons */}
          <div className="px-6 py-4 border-b border-gray-700 bg-gray-900 shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={portal}
                onChange={(e) => setPortal(e.target.value as Portal)}
                disabled={isScanning}
                className="bg-gray-800 text-white border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              >
                <option value="sam_gov">SAM.gov</option>
                <option value="cal_eprocure">Cal eProcure</option>
                <option value="tx_smartbuy">TX SmartBuy</option>
              </select>

              <button
                onClick={startScan}
                disabled={isScanning}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors"
              >
                {isScanning ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Scanning…
                  </>
                ) : (
                  "▶ Start Scan"
                )}
              </button>

              <button
                onClick={startReplay}
                disabled={isScanning}
                className="flex items-center gap-2 border border-gray-600 hover:border-gray-400 disabled:opacity-50 text-gray-300 hover:text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                🔄 Replay Demo
              </button>
            </div>
          </div>

          {/* Terminal / iframe area */}
          <div className="flex-1 overflow-hidden relative">
            {isScanning && streamUrl ? (
              <iframe
                src={streamUrl}
                className="w-full h-full border-0 bg-gray-950"
                title="Live agent stream"
              />
            ) : isReplay ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 p-8">
                <div className="border border-gray-700 rounded-lg p-6 text-center max-w-sm">
                  <div className="inline-flex items-center gap-2 bg-yellow-900/50 border border-yellow-600/50 text-yellow-400 rounded-full px-3 py-1 text-xs font-medium mb-4">
                    📹 Demo Mode — Pre-recorded scan
                  </div>
                  <div className="text-gray-500 font-mono text-xs text-left space-y-1">
                    <p className="text-green-400">$ bidradar-agent --portal demo</p>
                    <p className="text-gray-400">Loading pre-recorded session…</p>
                    <p className="text-emerald-400 animate-pulse">{statusText}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-950">
                <div className="text-center p-8">
                  <div className="text-gray-600 font-mono text-sm mb-4">
                    <p className="text-gray-500">$ bidradar-agent --portal {portal}</p>
                    <p className="text-gray-600 mt-2">Click Start Scan to launch agent</p>
                    <p className="text-emerald-800 mt-1 animate-pulse">_</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="px-6 py-3 border-t border-gray-700 bg-gray-900 shrink-0">
            <div className="flex items-center gap-2">
              {isPulsing && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
              <span className="text-gray-400 text-xs font-mono">{statusText}</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — 45% */}
        <div className="w-[45%] flex flex-col bg-white">
          {/* Right header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
            <h2 className="font-semibold text-gray-900">📊 Results</h2>
            <p className="text-sm text-gray-500">{results.length} opportunit{results.length !== 1 ? "ies" : "y"} found</p>
          </div>

          {/* Results area */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Error state */}
            {error && !isReplay && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-sm font-medium">❌ {error}</p>
                <p className="text-red-600 text-xs mt-1">Auto-launching demo replay…</p>
                <button
                  onClick={startReplay}
                  className="mt-2 text-xs text-red-600 underline hover:text-red-800"
                >
                  Retry Demo
                </button>
              </div>
            )}

            {/* Scanning spinner */}
            {isScanning && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 text-sm">Results appearing live…</p>
              </div>
            )}

            {/* Success banner */}
            {scanStatus === "completed" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-700 text-sm font-semibold">
                  ✅ Scan complete — {results.length} new opportunit{results.length !== 1 ? "ies" : "y"} found
                </p>
                <Link href="/feed">
                  <button className="mt-2 text-xs text-emerald-600 font-medium underline hover:text-emerald-800">
                    View in Feed →
                  </button>
                </Link>
              </div>
            )}

            {/* Replay complete */}
            {isReplay && !isPulsing && results.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <p className="text-emerald-700 text-sm font-semibold">
                  ✅ Demo complete — {results.length} opportunit{results.length !== 1 ? "ies" : "y"} shown
                </p>
                <Link href="/feed">
                  <button className="mt-2 text-xs text-emerald-600 font-medium underline hover:text-emerald-800">
                    View in Feed →
                  </button>
                </Link>
              </div>
            )}

            {/* Results list */}
            {results.map((opp, i) => (
              <ResultCard key={opp.id} opp={opp} index={i} />
            ))}

            {/* Empty state (not scanning, not replay, no results) */}
            {!isScanning && !isReplay && results.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3">📡</div>
                <p className="text-gray-500 text-sm">Start a scan to see opportunities</p>
                <p className="text-gray-400 text-xs mt-1">or try the Demo Replay</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-gray-900" />}>
      <ScanPageInner />
    </Suspense>
  );
}
