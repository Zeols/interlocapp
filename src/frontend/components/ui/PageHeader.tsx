import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}
    >
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}

