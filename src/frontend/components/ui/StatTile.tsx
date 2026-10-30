import React from "react";

interface StatTileProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: "default" | "accent";
  badge?: React.ReactNode;
  className?: string;
}

export function StatTile({
  label,
  value,
  subtext,
  variant = "default",
  badge,
  className = "",
}: StatTileProps) {
  const isAccent = variant === "accent";

  return (
    <div
      className={`bg-white rounded-xl p-4 sm:p-5 border transition-all shadow-2xs ${
        isAccent
          ? "border-orange-500/40 ring-1 ring-orange-500/20"
          : "border-slate-200"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
          {label}
        </span>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
        {value}
      </div>

      {subtext && (
        <p className="text-xs text-slate-500 mt-1 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
}

