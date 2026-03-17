"use client";

interface UrgencyBadgeProps {
  daysUntilDeadline: number | null | undefined;
}

export function UrgencyBadge({ daysUntilDeadline }: UrgencyBadgeProps) {
  if (daysUntilDeadline === null || daysUntilDeadline === undefined || daysUntilDeadline > 7) {
    return null;
  }

  if (daysUntilDeadline <= 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 animate-pulse">
        🔴 URGENT
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
      🟠 Closing Soon
    </span>
  );
}
