import React from "react";

export function UserChip({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right hidden sm:block">
        {name && <p className="text-sm font-semibold text-gray-900 leading-tight">{name}</p>}
        <p className="text-xs text-gray-500">{email}</p>
      </div>
      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
        <span className="text-sm font-black text-[#F97316]">
          {(name || email || "U").charAt(0).toUpperCase()}
        </span>
      </div>
    </div>
  );
}
