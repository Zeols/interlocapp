import React from "react";
import { Check } from "lucide-react";

export function FilterCheck({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center gap-2.5 w-full text-left group"
    >
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          checked
            ? "bg-[#F97316] border-[#F97316]"
            : "border-gray-300 group-hover:border-orange-400"
        }`}
      >
        {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </div>
      <div>
        <p className={`text-sm font-semibold leading-tight ${checked ? "text-gray-900" : "text-gray-600"}`}>
          {label}
        </p>
        {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
      </div>
    </button>
  );
}
