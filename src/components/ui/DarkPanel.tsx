import React from "react";

export function DarkPanel({ title, subtitle }: { title: React.ReactNode; subtitle: string }) {
  return (
    <div className="relative bg-black h-screen overflow-hidden flex items-center border-r border-gray-800">
      <div className="relative z-10 px-14">
        <h2 className="text-4xl font-black text-white leading-tight mb-4">{title}</h2>
        <p className="text-gray-400 text-sm leading-relaxed max-w-xs">{subtitle}</p>
      </div>
    </div>
  );
}
