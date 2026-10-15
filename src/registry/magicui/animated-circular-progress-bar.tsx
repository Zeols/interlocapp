"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/frontend/lib/utils";

export interface AnimatedCircularProgressBarProps {
  max?: number;
  min?: number;
  value?: number;
  gaugePrimaryColor?: string;
  gaugeSecondaryColor?: string;
  className?: string;
}

export function AnimatedCircularProgressBar({
  max = 100,
  min = 0,
  value = 0,
  gaugePrimaryColor = "rgb(79 70 229)",
  gaugeSecondaryColor = "rgba(0, 0, 0, 0.1)",
  className,
}: AnimatedCircularProgressBarProps) {
  const circumference = 2 * Math.PI * 45;
  const normalizedValue = Math.min(Math.max(value, min), max);
  const currentPercent = Math.round(
    ((normalizedValue - min) / (max - min)) * 100
  );
  const strokeDashoffset = circumference - (currentPercent / 100) * circumference;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center size-36 text-2xl font-semibold",
        className
      )}
    >
      <svg
        fill="none"
        className="size-full -rotate-90 transform"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          strokeWidth="9"
          className="transition-all duration-300 ease-linear"
          style={{
            stroke: gaugeSecondaryColor,
          }}
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          strokeWidth="9"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-in-out"
          style={{
            stroke: gaugePrimaryColor,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
        <span
          data-current-value={currentPercent}
          className="font-bold text-gray-900 transition-all duration-500 text-2xl tracking-tight"
        >
          {currentPercent}%
        </span>
      </div>
    </div>
  );
}

export function AnimatedCircularProgressBarDemo() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const handleIncrement = (prev: number) => {
      if (prev === 100) {
        return 0;
      }
      return prev + 10;
    };
    setValue(handleIncrement);
    const interval = setInterval(() => setValue(handleIncrement), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatedCircularProgressBar
      value={value}
      gaugePrimaryColor="rgb(79 70 229)"
      gaugeSecondaryColor="rgba(0, 0, 0, 0.1)"
    />
  );
}
