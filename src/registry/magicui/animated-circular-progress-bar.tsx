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
  textClassName?: string;
  strokeWidth?: number;
  showPercentSymbol?: boolean;
}

export function AnimatedCircularProgressBar({
  max = 100,
  min = 0,
  value = 0,
  gaugePrimaryColor = "rgb(79 70 229)",
  gaugeSecondaryColor = "rgba(0, 0, 0, 0.08)",
  className,
  textClassName,
  strokeWidth = 8,
  showPercentSymbol = true,
}: AnimatedCircularProgressBarProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const normalizedValue = Math.min(Math.max(value, min), max);
  const currentPercent = Math.round(
    ((normalizedValue - min) / (max - min)) * 100
  );
  const strokeDashoffset = circumference - (currentPercent / 100) * circumference;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center size-24 font-bold select-none",
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
          r={radius}
          strokeWidth={strokeWidth}
          className="transition-all duration-300 ease-linear"
          style={{
            stroke: gaugeSecondaryColor,
          }}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
          style={{
            stroke: gaugePrimaryColor,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          data-current-value={currentPercent}
          className={cn(
            "font-extrabold text-gray-900 tracking-tight leading-none text-sm transition-all duration-300",
            textClassName
          )}
        >
          {currentPercent}
          {showPercentSymbol && <span className="text-[75%] font-bold ml-0.5">%</span>}
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
