"use client";

import React, { useState } from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: number; // Multiplicador de escala (por defecto 1 = 40px)
  variant?: "default" | "onDark";
  showText?: boolean;
}

export function Logo({
  className = "",
  size = 1,
  variant = "default",
  showText = false,
}: LogoProps) {
  const [hasError, setHasError] = useState(false);
  const pxSize = Math.round(40 * size);

  const logoImg = (
    <img
      src={hasError ? "/Logo InterlocApp.svg" : "/logo.svg"}
      alt="InterlocApp"
      width={pxSize}
      height={pxSize}
      className="w-full h-full object-contain"
      onError={() => {
        if (!hasError) setHasError(true);
      }}
    />
  );

  return (
    <div className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      {variant === "onDark" ? (
        <div
          className="relative flex items-center justify-center shrink-0 bg-white rounded-xl p-1.5 shadow-sm transition-transform duration-200 group-hover:scale-105"
          style={{ width: `${pxSize + 8}px`, height: `${pxSize + 8}px` }}
        >
          {logoImg}
        </div>
      ) : (
        <div
          className="relative flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{ width: `${pxSize}px`, height: `${pxSize}px` }}
        >
          {logoImg}
        </div>
      )}

      {showText && (
        <span
          className={`font-extrabold tracking-tight ${
            variant === "onDark" ? "text-white" : "text-gray-900"
          }`}
          style={{ fontSize: `${Math.max(16, Math.round(18 * size))}px` }}
        >
          InterlocApp
        </span>
      )}
    </div>
  );
}
