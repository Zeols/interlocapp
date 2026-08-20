"use client";

import React from 'react';
import Link from 'next/link';
import Icon from '@mdi/react';
import { mdiArrowRight, mdiTicketConfirmationOutline, mdiMapMarkerPath } from '@mdi/js';

export default function Hero() {
  return (
    <section className="hero-section section-padding">
      <div className="container hero-grid">

        <div className="hero-content">
          <h1 className="hero-title">
            Viaja cómodo y seguro a tu destino sin hacer <span className="highlight">filas</span>
          </h1>
          <p className="hero-description">
            Compra tus boletos interurbanos en línea, elige tu asiento favorito de antemano y viaja en la mejor flota de la región.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn btn-primary hero-btn">
              Comprar Boleto
              <Icon path={mdiArrowRight} size={0.8} />
            </Link>
            <div className="stats-row">
              <div className="stat">
                <span className="stat-number">0</span>
                <span className="stat-label">Pasajeros actuales</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat">
                <span className="stat-number">30m</span>
                <span className="stat-label">Salidas puntuales</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="bento-mockup">
            <div className="mockup-header">
              <div className="dots">
                <i></i><i></i><i></i>
              </div>
            </div>
            <div className="mockup-body">
              <div className="mockup-card primary-card">
                <Icon path={mdiTicketConfirmationOutline} size={1.5} color="var(--color-primary)" />
                <h4>Asiento #12</h4>
                <p>Managua - León</p>
                <div className="progress-bar"><div className="progress-fill"></div></div>
              </div>
              <div className="mockup-grid">
                <div className="mockup-card small-card">
                  <Icon path={mdiMapMarkerPath} size={1.2} color="var(--color-secondary)" />
                  <h5>Boleto #8942</h5>
                  <span>Comprado</span>
                </div>
                <div className="mockup-card small-card dark-card">
                  <h2>Confirmado</h2>
                  <span>Listo para viajar</span>
                </div>
              </div>
            </div>
          </div>
          <div className="decoration-blob blob-1"></div>
          <div className="decoration-blob blob-2"></div>
        </div>

      </div>

      <style jsx>{`
        .hero-section {
          overflow: hidden;
          position: relative;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: var(--space-lg);
          align-items: center;
        }

        .hero-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          color: var(--color-text-main);
          letter-spacing: -0.03em;
          margin-bottom: var(--space-sm);
        }

        .highlight {
          color: var(--color-primary);
          position: relative;
        }

        .highlight::after {
          content: '';
          position: absolute;
          bottom: 5px;
          left: 0;
          width: 100%;
          height: 8px;
          background-color: var(--color-accent);
          opacity: 0.4;
          z-index: -1;
          border-radius: 4px;
        }

        .hero-description {
          font-size: 1.125rem;
          color: var(--color-text-muted);
          max-width: 90%;
          margin-bottom: var(--space-md);
        }

        .hero-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .hero-btn {
          align-self: flex-start;
          padding: 1rem 2rem;
          font-size: 1.125rem;
        }

        .stats-row {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat-number {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-main);
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background-color: var(--color-border);
        }

        /* Mockup Visual */
        .hero-visual {
          position: relative;
          perspective: 1000px;
        }

        .bento-mockup {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          position: relative;
          z-index: 10;
          transform: rotateY(-5deg) rotateX(5deg);
          transition: transform var(--transition-normal);
        }

        .bento-mockup:hover {
          transform: rotateY(0) rotateX(0);
        }

        .mockup-header {
          padding: 1rem;
          border-bottom: 1px solid var(--color-border);
          background-color: var(--color-bg-subtle);
        }

        .dots {
          display: flex;
          gap: 6px;
        }
        
        .dots i {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #e5e5e5;
        }
        .dots i:nth-child(1) { background-color: var(--color-secondary); }
        .dots i:nth-child(2) { background-color: var(--color-accent); }
        .dots i:nth-child(3) { background-color: #22c55e; }

        .mockup-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background-color: var(--color-bg-subtle);
        }

        .mockup-card {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          box-shadow: var(--shadow-sm);
        }

        .primary-card h4 {
          margin-top: 1rem;
          font-size: 1.25rem;
        }
        .primary-card p {
          color: var(--color-text-muted);
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .progress-bar {
          height: 8px;
          background-color: var(--color-bg-subtle);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          width: 65%;
          background-color: var(--color-primary);
          border-radius: 4px;
        }

        .mockup-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .small-card {
          padding: 1rem;
        }

        .small-card h5 { margin-top: 0.5rem; margin-bottom: 0.25rem; }
        .small-card span { font-size: 0.75rem; color: var(--color-text-muted); }

        .dark-card {
          background-color: var(--color-text-main);
          color: var(--color-text-light);
        }
        .dark-card h2 { color: var(--color-text-light); margin-bottom: 0.25rem; }
        .dark-card span { color: #a0a0a0; }

        .decoration-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          z-index: 1;
          opacity: 0.5;
        }

        .blob-1 {
          width: 300px;
          height: 300px;
          background-color: var(--color-primary);
          top: -50px;
          right: -50px;
        }

        .blob-2 {
          width: 200px;
          height: 200px;
          background-color: var(--color-accent);
          bottom: -50px;
          left: -50px;
        }

        @media (max-width: 992px) {
          .hero-grid {
            grid-template-columns: 1fr;
          }
          .hero-visual {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
