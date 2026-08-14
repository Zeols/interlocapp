"use client";

import React, { useState } from 'react';
import Icon from '@mdi/react';
import { mdiPackageVariantClosed, mdiCheckCircle } from '@mdi/js';

interface PassengerFormProps {
  selectedSeatNumber: string | null;
  basePrice: number;
}

export default function PassengerForm({ selectedSeatNumber, basePrice }: PassengerFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    datetime: '',
    status: 'Pendiente'
  });

  const [extraLuggage, setExtraLuggage] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const luggagePrice = 30; // C$ 30 por bulto extra
  const total = basePrice + (extraLuggage * luggagePrice);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.destination.trim()) newErrors.destination = 'El destino es requerido';
    if (!formData.datetime) newErrors.datetime = 'La fecha y hora son requeridas';
    if (!selectedSeatNumber) newErrors.seat = 'Debes seleccionar un asiento';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="passenger-form-container">
      <div className="form-header-row">
        <h3>Datos de Pasajero</h3>
        {selectedSeatNumber ? (
          <div className="seat-badge">Asiento #{selectedSeatNumber}</div>
        ) : (
          <div className="seat-badge empty">Sin asiento</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="passenger-form">
        <div className="form-group">
          <label htmlFor="name">Nombre del Pasajero</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`form-input ${errors.name ? 'error' : ''}`}
            placeholder="Ej. Carlos Martínez"
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="destination">Destino</label>
          <input
            type="text"
            id="destination"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            className={`form-input ${errors.destination ? 'error' : ''}`}
            placeholder="Ej. Managua - León"
          />
          {errors.destination && <span className="error-text">{errors.destination}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="datetime">Fecha y Hora de Viaje</label>
          <input
            type="datetime-local"
            id="datetime"
            name="datetime"
            value={formData.datetime}
            onChange={handleChange}
            className={`form-input ${errors.datetime ? 'error' : ''}`}
          />
          {errors.datetime && <span className="error-text">{errors.datetime}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="status">Estado de Abordaje</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="form-input"
          >
            <option value="Pendiente">Pendiente</option>
            <option value="Abordado">Abordado</option>
            <option value="Ausente">Ausente</option>
          </select>
          <div className={`status-pill pill-${formData.status.toLowerCase()}`}>
            {formData.status === 'Pendiente' ? ' Esperando abordaje' :
              formData.status === 'Abordado' ? ' A bordo' : ' No se presentó'}
          </div>
        </div>

        <div className="luggage-section">
          <h4>Equipaje Registrado</h4>
          <div className="luggage-item">
            <div className="luggage-info">
              <Icon path={mdiPackageVariantClosed} size={1} color="var(--color-primary)" />
              <span>{extraLuggage}x Carga Extra (Bultos)</span>
            </div>
            <span className="luggage-price">C$ {(extraLuggage * luggagePrice).toFixed(2)}</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm add-luggage-btn"
            onClick={() => setExtraLuggage(prev => prev + 1)}
          >
            + Añadir Carga Extra
          </button>
        </div>

        <div className="summary-section">
          <div className="summary-row">
            <span>Boleto Base</span>
            <span>C$ {basePrice.toFixed(2)}</span>
          </div>
          <div className="summary-row total-row">
            <span>Total a Cobrar</span>
            <span>C$ {total.toFixed(2)}</span>
          </div>
        </div>

        {errors.seat && <div className="error-banner">{errors.seat}</div>}

        <button type="submit" className="btn btn-primary submit-btn">
          Confirmar Venta
        </button>

        {isSubmitted && (
          <div className="success-banner">
            <Icon path={mdiCheckCircle} size={1} />
            Boleto registrado exitosamente
          </div>
        )}
      </form>
    </div>
  );
}
