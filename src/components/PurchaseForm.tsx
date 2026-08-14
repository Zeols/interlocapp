"use client";

import React, { useState } from 'react';
import Icon from '@mdi/react';
import { mdiPackageVariantClosed, mdiCheckCircle, mdiCreditCardOutline } from '@mdi/js';

interface PurchaseFormProps {
  selectedSeatNumber: string | null;
  basePrice: number;
}

export default function PurchaseForm({ selectedSeatNumber, basePrice }: PurchaseFormProps) {
  const [formData, setFormData] = useState({
    route: '',
    name: '',
    email: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });
  
  const [extraLuggage, setExtraLuggage] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const luggagePrice = 30; // C$ 30 por bulto extra
  const total = basePrice + (extraLuggage * luggagePrice);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.route) newErrors.route = 'Selecciona una ruta';
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Correo electrónico válido requerido';
    if (!formData.cardNumber.trim() || formData.cardNumber.length < 16) newErrors.cardNumber = 'Número de tarjeta inválido';
    if (!formData.expiry.trim()) newErrors.expiry = 'Fecha requerida';
    if (!formData.cvc.trim() || formData.cvc.length < 3) newErrors.cvc = 'CVC inválido';
    if (!selectedSeatNumber) newErrors.seat = 'Debes seleccionar un asiento en el mapa';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsSubmitted(true);
      // Simulación de redirección o reseteo
      setTimeout(() => setIsSubmitted(false), 4000);
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
    <div className="purchase-form-container">
      <div className="form-header-row">
        <h3>Detalles de tu Viaje</h3>
        {selectedSeatNumber ? (
          <div className="seat-badge">Asiento #{selectedSeatNumber}</div>
        ) : (
          <div className="seat-badge empty">Asiento no seleccionado</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="purchase-form">
        {/* Ruta */}
        <div className="form-group">
          <label htmlFor="route">Ruta del Viaje</label>
          <select
            id="route"
            name="route"
            value={formData.route}
            onChange={handleChange}
            className={`form-input ${errors.route ? 'error' : ''}`}
          >
            <option value="">Selecciona tu ruta...</option>
            <option value="managua-leon">Managua ➔ León</option>
            <option value="leon-managua">León ➔ Managua</option>
            <option value="managua-esteli">Managua ➔ Estelí</option>
          </select>
          {errors.route && <span className="error-text">{errors.route}</span>}
        </div>

        {/* Datos Personales */}
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="name">Nombre Completo</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="Ej. Juan Pérez"
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico (Recibo)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="juan@correo.com"
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>
        </div>

        {/* Equipaje */}
        <div className="luggage-section">
          <h4>¿Llevas equipaje extra?</h4>
          <p className="luggage-desc">1 maleta de mano incluida gratis.</p>
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

        {/* Datos de Tarjeta */}
        <div className="payment-section">
          <h4 className="payment-title">
            <Icon path={mdiCreditCardOutline} size={1} />
            Método de Pago
          </h4>
          <div className="form-group">
            <label htmlFor="cardNumber">Número de Tarjeta</label>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleChange}
              maxLength={16}
              className={`form-input ${errors.cardNumber ? 'error' : ''}`}
              placeholder="0000 0000 0000 0000"
            />
            {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="expiry">Vencimiento</label>
              <input
                type="text"
                id="expiry"
                name="expiry"
                value={formData.expiry}
                onChange={handleChange}
                maxLength={5}
                className={`form-input ${errors.expiry ? 'error' : ''}`}
                placeholder="MM/AA"
              />
              {errors.expiry && <span className="error-text">{errors.expiry}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="cvc">CVC</label>
              <input
                type="text"
                id="cvc"
                name="cvc"
                value={formData.cvc}
                onChange={handleChange}
                maxLength={4}
                className={`form-input ${errors.cvc ? 'error' : ''}`}
                placeholder="123"
              />
              {errors.cvc && <span className="error-text">{errors.cvc}</span>}
            </div>
          </div>
        </div>

        <div className="summary-section">
          <div className="summary-row">
            <span>Boleto Base</span>
            <span>C$ {basePrice.toFixed(2)}</span>
          </div>
          <div className="summary-row total-row">
            <span>Total a Pagar</span>
            <span>C$ {total.toFixed(2)}</span>
          </div>
        </div>

        {errors.seat && <div className="error-banner">{errors.seat}</div>}
        
        <button type="submit" className="btn btn-primary submit-btn">
          Pagar Boleto
        </button>

        {isSubmitted && (
          <div className="success-banner mt-3">
            <Icon path={mdiCheckCircle} size={1} />
            ¡Pago exitoso! Te hemos enviado el boleto al correo.
          </div>
        )}
      </form>
    </div>
  );
}
