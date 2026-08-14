"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Icon from '@mdi/react';
import { mdiBusDoubleDecker, mdiEmailOutline, mdiLockOutline, mdiArrowRight } from '@mdi/js';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call for now
    setTimeout(() => {
      setIsLoading(false);
      router.push('/compra');
    }, 1000);
  };

  return (
    <div className="login-layout">
      <div className="login-visual">
        <div className="visual-content">
          <h1>Tu viaje comienza aquí</h1>
          <p>Inicia sesión para comprar tus boletos, elegir tus asientos y llevar un registro de todos tus viajes.</p>
        </div>
        <div className="decoration-blob blob-orange"></div>
        <div className="decoration-blob blob-red"></div>
      </div>
      
      <div className="login-form-container">
        <Link href="/" className="back-link">
          &larr; Volver al inicio
        </Link>
        
        <div className="form-box">
          <div className="form-header">
            <div className="logo-icon">
              <Icon path={mdiBusDoubleDecker} size={1.5} color="var(--color-text-light)" />
            </div>
            <h2>Iniciar Sesión</h2>
            <p>Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="email">Correo electrónico</label>
              <div className="input-wrapper">
                <Icon path={mdiEmailOutline} size={1} color="var(--color-text-muted)" className="input-icon" />
                <input 
                  type="email" 
                  id="email" 
                  placeholder="ejemplo@cooperativa.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <div className="input-wrapper">
                <Icon path={mdiLockOutline} size={1} color="var(--color-text-muted)" className="input-icon" />
                <input 
                  type="password" 
                  id="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="form-actions">
              <Link href="#" className="forgot-password">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
              {isLoading ? 'Iniciando sesión...' : 'Entrar'}
              {!isLoading && <Icon path={mdiArrowRight} size={0.8} />}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .login-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
          background-color: var(--color-bg-main);
        }

        .login-visual {
          background-color: var(--color-text-main);
          color: var(--color-text-light);
          padding: var(--space-xl) var(--space-lg);
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .visual-content {
          position: relative;
          z-index: 10;
          max-width: 480px;
          margin: 0 auto;
        }

        .visual-content h1 {
          font-size: clamp(2rem, 4vw, 3rem);
          margin-bottom: var(--space-sm);
        }

        .visual-content p {
          font-size: 1.125rem;
          color: #a0a0a0;
          line-height: 1.6;
        }

        .decoration-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 1;
          opacity: 0.6;
        }

        .blob-orange {
          width: 400px;
          height: 400px;
          background-color: var(--color-primary);
          top: -100px;
          left: -100px;
        }

        .blob-red {
          width: 300px;
          height: 300px;
          background-color: var(--color-secondary);
          bottom: 10%;
          right: -50px;
        }

        .login-form-container {
          padding: var(--space-lg);
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .back-link {
          position: absolute;
          top: var(--space-md);
          left: var(--space-lg);
          color: var(--color-text-muted);
          font-weight: 500;
          transition: color var(--transition-fast);
        }

        .back-link:hover {
          color: var(--color-primary);
        }

        .form-box {
          margin: auto;
          width: 100%;
          max-width: 400px;
        }

        .form-header {
          text-align: center;
          margin-bottom: var(--space-lg);
        }

        .logo-icon {
          width: 64px;
          height: 64px;
          background-color: var(--color-primary);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto var(--space-sm);
          box-shadow: var(--shadow-md);
        }

        .form-header h2 {
          font-size: 2rem;
          margin-bottom: var(--space-xs);
        }

        .form-header p {
          color: var(--color-text-muted);
        }

        .input-group {
          margin-bottom: var(--space-md);
        }

        .input-group label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--color-text-main);
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper :global(.input-icon) {
          position: absolute;
          left: 1rem;
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 3rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-family: var(--font-body);
          font-size: 1rem;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          background-color: var(--color-bg-subtle);
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(254, 125, 34, 0.2);
          background-color: var(--color-bg-main);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: var(--space-lg);
        }

        .forgot-password {
          font-size: 0.875rem;
          color: var(--color-primary);
          font-weight: 500;
        }

        .forgot-password:hover {
          text-decoration: underline;
        }

        .login-btn {
          width: 100%;
          padding: 1rem;
          justify-content: center;
        }

        @media (max-width: 992px) {
          .login-layout {
            grid-template-columns: 1fr;
          }
          .login-visual {
            display: none;
          }
          .form-box {
            margin-top: 4rem;
          }
        }
      `}</style>
    </div>
  );
}
