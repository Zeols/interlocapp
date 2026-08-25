import React from "react";
import { cn } from "@/lib/utils";

// Placeholder para un componente de SeatMap (Mapa de Asientos)
// En el futuro, se puede integrar una solución interactiva de 21st.dev
// por ejemplo, una cuadrícula interactiva con framer-motion.

interface SeatMapProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SeatMap({ className, ...props }: SeatMapProps) {
  // Simulamos un bus de 4 filas x 10 columnas
  const seats = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    isAvailable: Math.random() > 0.3,
  }));

  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-4 p-8 bg-gray-50 rounded-3xl border border-gray-200 shadow-sm max-w-sm mx-auto",
        className
      )}
      {...props}
    >
      {/* Indicadores */}
      <div className="col-span-4 flex justify-between mb-4 border-b pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
        <span>Ventana</span>
        <span>Pasillo</span>
      </div>
      
      {seats.map((seat, index) => (
        <React.Fragment key={seat.id}>
          {/* Espacio para el pasillo central */}
          {index > 0 && index % 2 === 0 && index % 4 !== 0 && (
             <div className="w-4" /> // Espaciador de pasillo
          )}
          
          <button
            disabled={!seat.isAvailable}
            className={cn(
              "w-12 h-12 rounded-t-xl rounded-b-md flex items-center justify-center text-sm font-bold transition-all duration-300",
              seat.isAvailable
                ? "bg-white border-2 border-primary/20 text-gray-700 hover:border-primary hover:bg-primary/5 cursor-pointer hover:-translate-y-1"
                : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
            )}
          >
            {seat.id}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
