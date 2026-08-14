"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Icon from '@mdi/react';
import { mdiBusDoubleDecker } from '@mdi/js';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        <Link href="/" className="logo-link">
          <div className="logo-icon">
            <Icon path={mdiBusDoubleDecker} size={1.2} color="var(--color-text-light)" />
          </div>
          <span className="logo-text">RUTA LA SIN RIVAL</span>
        </Link>
        <div className="navbar-actions">
          <Link href="/login" className="btn btn-primary">
            Iniciar Sesión
          </Link>
        </div>
      </div>
      <style jsx>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          transition: all var(--transition-normal);
          background-color: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid transparent;
          padding: var(--space-sm) 0;
        }
        
        .navbar.scrolled {
          padding: 0.5rem 0;
          border-bottom-color: var(--color-border);
          box-shadow: var(--shadow-sm);
        }

        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-link {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }

        .logo-icon {
          background-color: var(--color-primary);
          border-radius: var(--radius-sm);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(254, 125, 34, 0.3);
        }

        .logo-text {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1.25rem;
          color: var(--color-text-main);
          letter-spacing: -0.5px;
        }

        @media (max-width: 768px) {
          .logo-text {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
