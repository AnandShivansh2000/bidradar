"use client";

interface RelevanceBadgeProps {
  variant: "high" | "medium" | "low";
  score?: number;
  large?: boolean;
}

export function RelevanceBadge({ variant, score, large }: RelevanceBadgeProps) {
  const config = {
    high: {
      dot: "🟢",
      label: "High",
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    },
    medium: {
      dot: "🟡",
      label: "Medium",
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-200",
    },
    low: {
      dot: "⚪",
      label: "Low",
      bg: "bg-slate-50",
      text: "text-slate-500",
      border: "border-slate-200",
    },
  }[variant];

  const scoreStr = score !== undefined ? ` (${Math.round(score * 100)}%)` : "";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${config.bg} ${config.text} ${config.border} ${large ? "text-sm px-3 py-1" : "text-xs"}`}
    >
      <span>{config.dot}</span>
      {config.label}{scoreStr}
    </span>
  );
}
