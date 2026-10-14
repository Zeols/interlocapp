"use client";

import React, { useState } from "react";
import Icon from "@mdi/react";
import { mdiBus } from "@mdi/js";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 1 }: LogoProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {!hasError && (
        <img
          src="/logo.png"
          alt="InterlocApp Logo"
          className={`w-10 h-10 object-contain rounded-xl ${loaded ? "block" : "hidden"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
      {(!loaded || hasError) && (
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-xs transition-transform group-hover:-translate-y-0.5">
          <Icon path={mdiBus} size={size} />
        </div>
      )}
    </div>
  );
}
