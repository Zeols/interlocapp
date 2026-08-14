"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@mdi/react';
import {
  mdiHomeOutline,
  mdiMapMarkerPath,
  mdiAccountGroupOutline,
  mdiSeatOutline,
  mdiMapMarkerRadiusOutline,
  mdiAlertCircleOutline,
  mdiCashRegister,
  mdiBusMultiple,
  mdiLogout,
  mdiMenu,
  mdiClose
} from '@mdi/js';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Inicio', icon: mdiHomeOutline, path: '/dashboard' },
    { label: 'Viajes', icon: mdiMapMarkerPath, path: '/dashboard/viajes' },
    { label: 'Pasajeros', icon: mdiAccountGroupOutline, path: '/dashboard/pasajeros' },
    { label: 'Asientos', icon: mdiSeatOutline, path: '/dashboard/asientos' },
    { label: 'Checkpoints', icon: mdiMapMarkerRadiusOutline, path: '/dashboard/checkpoints' },
    { label: 'Flota operativa', icon: mdiBusMultiple, path: '/dashboard/flota' },
    { label: 'Incidencias', icon: mdiAlertCircleOutline, path: '/dashboard/incidencias' },
    { label: 'Liquidación', icon: mdiCashRegister, path: '/dashboard/liquidacion' },
  ];

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button className="mobile-menu-btn" onClick={() => setIsOpen(true)}>
        <Icon path={mdiMenu} size={1.2} />
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      {/* Sidebar Content */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="user-profile">
            <div className="avatar">
              CM
            </div>
            <div className="user-info">
              <span className="user-name">Carlos Martínez</span>
              <span className="user-badge">Administrador</span>
            </div>
          </div>
          <button className="close-sidebar-btn" onClick={closeSidebar}>
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <li key={item.path} className="nav-item">
                  <Link
                    href={item.path}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={closeSidebar}
                  >
                    <Icon
                      path={item.icon}
                      size={1}
                      color={isActive ? 'var(--color-primary)' : 'var(--color-text-muted)'}
                      className="nav-icon"
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <Link href="/login" className="nav-link logout-link">
            <Icon path={mdiLogout} size={1} color="var(--color-secondary)" className="nav-icon" />
            <span style={{ color: 'var(--color-secondary)' }}>Cerrar Sesión</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
