import React from "react";
import { Seat, SeatStatus } from "@/types";

export function SeatButton({ seat, onSelect }: { seat: Seat; onSelect: (id: number) => void }) {
  const styles: Record<SeatStatus, string> = {
    available:
      "border-2 border-green-500 text-green-600 bg-white hover:bg-green-50 cursor-pointer",
    selected:
      "bg-[#F97316] text-white border-2 border-[#F97316] cursor-pointer shadow-sm scale-105",
    occupied:
      "border-2 border-rose-200 bg-rose-50 text-rose-300 cursor-not-allowed",
    unavailable:
      "border-2 border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed",
  };
  return (
    <button
      className={`w-10 h-10 rounded-xl text-xs font-bold flex items-center justify-center transition-all duration-150 ${styles[seat.status]}`}
      onClick={() =>
        (seat.status === "available" || seat.status === "selected") && onSelect(seat.id)
      }
    >
      {seat.id}
    </button>
  );
}
