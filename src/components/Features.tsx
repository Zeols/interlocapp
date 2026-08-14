"use client";

import React from 'react';
import Icon from '@mdi/react';
import { mdiTicketConfirmationOutline, mdiSeatOutline, mdiMapMarkerPath, mdiBusClock } from '@mdi/js';

export default function Features() {
  const features = [
    {
      title: "Compra Anticipada",
      description: "Olvídate de las filas en la terminal. Compra o reserva tu boleto desde tu celular de manera rápida y segura.",
      icon: mdiTicketConfirmationOutline,
      span: "col-span-2",
      color: "var(--color-primary)"
    },
    {
      title: "Elige tu Asiento",
      description: "Revisa el mapa del autobús en tiempo real y escoge tu lugar favorito.",
      icon: mdiSeatOutline,
      span: "col-span-1",
      color: "var(--color-secondary)"
    },
    {
      title: "Rastreo en Vivo",
      description: "Conoce la ubicación exacta de tu unidad y los puntos de abordaje sin incertidumbre.",
      icon: mdiMapMarkerPath,
      span: "col-span-1",
      color: "var(--color-accent)"
    },
    {
      title: "Puntualidad y Confort",
      description: "Nuestra moderna flota garantiza salidas a tiempo, viajes seguros y la máxima comodidad.",
      icon: mdiBusClock,
      span: "col-span-2",
      color: "var(--color-text-main)"
    }
  ];

  return (
    <section className="features-section section-padding">
      <div className="container">
        <div className="section-header">
          <h2>Por qué elegir viajar con <span className="highlight">nosotros</span></h2>
          <p>La mejor experiencia de viaje interlocal a tu alcance.</p>
        </div>

        <div className="bento-grid">
          {features.map((feat, i) => (
            <div key={i} className={`bento-card ${feat.span}`}>
              <div className="card-icon" style={{ backgroundColor: feat.color }}>
                <Icon path={feat.icon} size={1.2} color="white" />
              </div>
              <h3>{feat.title}</h3>
              <p>{feat.description}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .features-section {
          background-color: var(--color-bg-subtle);
        }

        .section-header {
          text-align: center;
          margin-bottom: var(--space-lg);
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .section-header h2 {
          font-size: clamp(2rem, 4vw, 2.5rem);
          margin-bottom: var(--space-xs);
        }

        .highlight {
          color: var(--color-primary);
        }

        .section-header p {
          color: var(--color-text-muted);
          font-size: 1.125rem;
        }

        .bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-md);
        }

        .bento-card {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-lg);
          padding: var(--space-md);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
          transition: all var(--transition-normal);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .bento-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-accent);
        }

        .col-span-2 {
          grid-column: span 2;
        }

        .col-span-1 {
          grid-column: span 1;
        }

        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-xs);
        }

        .bento-card h3 {
          font-size: 1.25rem;
        }

        .bento-card p {
          color: var(--color-text-muted);
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .bento-grid {
            grid-template-columns: 1fr;
          }
          .col-span-2, .col-span-1 {
            grid-column: span 1;
          }
        }
      `}</style>
    </section>
  );
}
