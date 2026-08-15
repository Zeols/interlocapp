"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import SeatMap, { Seat } from '@/components/SeatMap';
import PurchaseForm from '@/components/PurchaseForm';
import './compra.css';

// Generar asientos para el ejemplo
const generateSeats = (): Seat[] => {
  const seats: Seat[] = [];
  for (let i = 1; i <= 20; i++) {
    const num = i.toString().padStart(2, '0');
    let status: Seat['status'] = 'available';
    // Algunos ocupados o no disponibles de prueba
    if (i === 3 || i === 7 || i === 12) status = 'occupied';
    if (i === 9 || i === 15) status = 'unavailable';

    seats.push({
      id: `seat-${i}`,
      number: num,
      status
    });
  }
  return seats;
};

export default function CompraPage() {
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
    <>
      <Navbar />
      <main className="compra-layout">
        <div className="container">
          <div className="compra-header">
            <h1>Compra de Boleto</h1>
            <p>Selecciona tu asiento y completa tus datos para viajar con nosotros.</p>
          </div>

          <div className="compra-grid">
            <div className="compra-col left-col">
              <SeatMap
                seats={seats}
                onSeatSelect={handleSeatSelect}
                selectedSeatId={selectedSeatId}
              />
            </div>

            <div className="compra-col right-col">
              <PurchaseForm
                selectedSeatNumber={selectedSeat?.number || null}
                basePrice={150}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
