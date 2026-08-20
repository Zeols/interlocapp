"use client";

import React from 'react';
import Icon from '@mdi/react';
import { mdiSteering } from '@mdi/js';

export type SeatStatus = 'available' | 'occupied' | 'selected' | 'unavailable';

export interface Seat {
  id: string;
  number: string;
  status: SeatStatus;
}

interface SeatMapProps {
  seats: Seat[];
  onSeatSelect: (seatId: string) => void;
  selectedSeatId: string | null;
}

export default function SeatMap({ seats, onSeatSelect, selectedSeatId }: SeatMapProps) {
  const totalSeats = seats.length;
  const availableSeats = seats.filter(s => s.status === 'available' || s.status === 'selected').length;
  const percentage = (availableSeats / totalSeats) * 100;

  // Split seats into columns for the 5-column grid (col 1, col 2, aisle, col 3, col 4)
  // But wait, the standard bus layout usually has seats ordered per row: [1, 2, aisle, 3, 4]
  // We can just render them in a CSS Grid with 5 columns where the 3rd column is always empty (pasillo).

  return (
    <div className="seat-map-container">
      <div className="seat-map-header">
        <div>
          <h2>Selección de Asientos</h2>
          <p>Toca un asiento disponible para seleccionarlo</p>
        </div>
        <div className="availability-stats">
          <span className="stats-text"><strong>{availableSeats}/{totalSeats}</strong> disponibles</span>
          <div className="progress-bar-small">
            <div className="progress-fill-small" style={{ width: `${percentage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="bus-front-indicator">
        <Icon path={mdiSteering} size={0.8} />
        Frente del autobús
      </div>

      <div className="bus-layout">
        <div className="pasillo-label">PASILLO</div>
        <div className="seats-grid">
          {seats.map((seat, index) => {
            const isSelected = seat.id === selectedSeatId;
            // We use our custom classes matching our orange/coral theme in components.css
            let statusClass = seat.status;
            if (isSelected) statusClass = 'selected';

            return (
              <button
                key={seat.id}
                className={`seat-btn ${statusClass}`}
                disabled={seat.status === 'occupied' || seat.status === 'unavailable'}
                onClick={() => onSeatSelect(seat.id)}
              >
                {seat.number}
              </button>
            );
          })}
        </div>
      </div>

      <div className="seat-legend">
        <div className="legend-item">
          <span className="legend-dot available"></span> Disponible
        </div>
        <div className="legend-item">
          <span className="legend-dot occupied"></span> Ocupado
        </div>
        <div className="legend-item">
          <span className="legend-dot selected"></span> Seleccionado
        </div>
        <div className="legend-item">
          <span className="legend-dot unavailable"></span> No disponible
        </div>
      </div>
    </div>
  );
}
