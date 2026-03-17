"use client";

interface PortalBadgeProps {
  portal: string;
}

const PORTAL_NAMES: Record<string, string> = {
  sam_gov: "SAM.gov",
  cal_eprocure: "Cal eProcure",
  tx_smartbuy: "Texas SmartBuy",
};

export function PortalBadge({ portal }: PortalBadgeProps) {
  const name = PORTAL_NAMES[portal] ?? portal;

  return (
    <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
      {name}
    </span>
  );
}
