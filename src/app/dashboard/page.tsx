"use client";

import React, { useState } from 'react';
import SeatMap, { Seat } from '@/components/SeatMap';
import PassengerForm from '@/components/PassengerForm';

// Generar 20 asientos (ajustable hasta 40)
const generateSeats = (): Seat[] => {
  const seats: Seat[] = [];
  for (let i = 1; i <= 20; i++) {
    const num = i.toString().padStart(2, '0');
    let status: Seat['status'] = 'available';
    // Algunos ocupados o no disponibles de prueba para coincidir con la UI
    if (i === 3 || i === 7) status = 'occupied';
    if (i === 9 || i === 15) status = 'unavailable';
    
    seats.push({
      id: `seat-${i}`,
      number: num,
      status
    });
  }
  return seats;
};

export default function DashboardPage() {
  const [seats, setSeats] = useState<Seat[]>(generateSeats());
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

  const handleSeatSelect = (seatId: string) => {
    setSeats(prevSeats => prevSeats.map(seat => {
      // Si el asiento clicado ya estaba seleccionado, lo deseleccionamos
      if (seat.id === seatId && seat.status === 'selected') {
        setSelectedSeatId(null);
        return { ...seat, status: 'available' };
      }
      // Si clicamos otro asiento disponible, lo seleccionamos y limpiamos el anterior
      if (seat.id === seatId && seat.status === 'available') {
        setSelectedSeatId(seatId);
        return { ...seat, status: 'selected' };
      }
      // Si el asiento actual era el seleccionado anteriormente, lo marcamos disponible
      if (seat.status === 'selected' && seat.id !== seatId) {
        return { ...seat, status: 'available' };
      }
      return seat;
    }));
  };

  const selectedSeat = seats.find(s => s.id === selectedSeatId);

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1>Venta de Boletos</h1>
        <p>Gestiona la asignación de asientos y pasajeros del próximo viaje.</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col left-col">
          <SeatMap 
            seats={seats} 
            onSeatSelect={handleSeatSelect} 
            selectedSeatId={selectedSeatId} 
          />
        </div>
        
        <div className="dashboard-col right-col">
          <PassengerForm 
            selectedSeatNumber={selectedSeat?.number || null}
            basePrice={150} // C$ 150 boleto base
          />
        </div>
      </div>
    </div>
  );
}
