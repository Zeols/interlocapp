'use client';

import { useState } from 'react';
import { createRol, getRoles, createUsuario, getUsuariosByCooperativa } from '@/actions/usuarios';

export default function TestUsuariosPage() {
  const [log, setLog] = useState('');
  const [formChofer, setFormChofer] = useState({
    nombre: 'Mario',
    apellido: 'Bredio',
    usuario: 'mbredio',
    correo: 'mario.bredio@cooperativa.com',
    telefono: '8888-9999',
  });

  // 1. Inicializar roles del sistema
  async function handleInicializarRoles() {
    setLog('Creando roles base (CHOFER, ADMIN, TAQUILLERO)...');
    const r1 = await createRol('CHOFER', 'Conductor asignado a unidades de transporte');
    const r2 = await createRol('ADMIN_COOPERATIVA', 'Administrador de cooperativa');
    const r3 = await createRol('TAQUILLERO', 'Operario de venta de boletos');
    setLog(JSON.stringify({ rolChofer: r1, rolAdmin: r2, rolTaquillero: r3 }, null, 2));
  }

  // 2. Consultar Roles
  async function handleVerRoles() {
    setLog('Consultando roles registrados...');
    const res = await getRoles();
    setLog(JSON.stringify(res, null, 2));
  }

  // 3. Registrar Chofer
  async function handleRegistrarChofer() {
    setLog('Registrando nuevo chofer...');
    
    // Asumimos que idRol: 1 es CHOFER e idCooperativa: 1
    const res = await createUsuario({
      idCooperativa: 1,
      idRol: 1, // ID del Rol CHOFER
      nombre: formChofer.nombre,
      apellido: formChofer.apellido,
      usuario: `${formChofer.usuario}_${Date.now().toString().slice(-3)}`,
      correo: `${Date.now().toString().slice(-3)}_${formChofer.correo}`,
      telefono: formChofer.telefono,
    });

    setLog(JSON.stringify(res, null, 2));
  }

  // 4. Listar Personal de la Cooperativa
  async function handleVerUsuarios() {
    setLog('Consultando personal registrado de la cooperativa 1...');
    const res = await getUsuariosByCooperativa(1);
    setLog(JSON.stringify(res, null, 2));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-emerald-400">Prueba: Módulo de Usuarios y Registro de Choferes</h2>

      {/* Formulario de Registro de Chofer */}
      <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Datos para Registrar Chofer:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div>
            <label className="block text-gray-400 mb-1">Nombre:</label>
            <input
              type="text"
              value={formChofer.nombre}
              onChange={(e) => setFormChofer({ ...formChofer, nombre: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Apellido:</label>
            <input
              type="text"
              value={formChofer.apellido}
              onChange={(e) => setFormChofer({ ...formChofer, apellido: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Usuario:</label>
            <input
              type="text"
              value={formChofer.usuario}
              onChange={(e) => setFormChofer({ ...formChofer, usuario: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Correo Electrónico:</label>
            <input
              type="email"
              value={formChofer.correo}
              onChange={(e) => setFormChofer({ ...formChofer, correo: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-white"
            />
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleInicializarRoles} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-xs">
          1. Inicializar Roles (CHOFER)
        </button>
        <button onClick={handleVerRoles} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs">
          2. Ver Roles Existentes
        </button>
        <button onClick={handleRegistrarChofer} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-xs">
          3. Registrar Chofer
        </button>
        <button onClick={handleVerUsuarios} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded text-xs">
          4. Ver Personal de Cooperativa
        </button>
      </div>

      <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto font-mono min-h-[250px]">
        {log || 'Haz clic en un botón para probar el módulo de usuarios...'}
      </pre>
    </div>
  );
}