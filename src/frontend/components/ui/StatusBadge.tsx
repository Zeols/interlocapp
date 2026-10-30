import React from "react";

export type StatusVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: "sm" | "md";
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

export function StatusBadge({
  label,
  variant = "neutral",
  size = "sm",
  className = "",
}: StatusBadgeProps) {
  const sizeClasses =
    size === "sm"
      ? "text-[10px] px-2 py-0.5"
      : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded border ${variantStyles[variant]} ${sizeClasses} ${className}`}
    >
      {label}
    </span>
  );
}

export function getVariantFromStatus(status: string): StatusVariant {
  const s = (status || "").toUpperCase();
  if (["ACTIVO", "COMPLETADO", "PAGADO", "DISPONIBLE", "VALIDADO"].includes(s)) {
    return "success";
  }
  if (["PROGRAMADO", "EN_TRANSITO", "EN_RUTA", "PENDIENTE", "ABORDANDO"].includes(s)) {
    return "warning";
  }
  if (["CANCELADO", "INACTIVO", "BLOQUEADO", "ANULADO", "OCUPADO"].includes(s)) {
    return "danger";
  }
  if (["REASIGNADO", "TAQUILLA", "WEB"].includes(s)) {
    return "info";
  }
  return "neutral";
}

