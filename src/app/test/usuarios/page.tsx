'use client';

import { useState } from 'react';
import { createRol, getRoles, createUsuario, getUsuariosByCooperativa } from '@/backend/actions/usuarios';

export default function TestUsuariosPage() {
  const [log, setLog] = useState('');
  const [formPersonal, setFormPersonal] = useState({
    nombre: 'Mario',
    apellido: 'Bredio',
    usuario: 'mbredio',
    correo: 'mario.bredio@cooperativa.com',
    telefono: '8888-9999',
    rolNombre: 'CHOFER', // Puede ser CHOFER o AYUDANTE
  });

  // 1. Inicializar roles del sistema (incluye AYUDANTE)
  async function handleInicializarRoles() {
    setLog('Creando roles base (CHOFER, AYUDANTE, ADMIN_COOPERATIVA, TAQUILLERO)...');
    const r1 = await createRol('CHOFER', 'Conductor asignado a unidades de transporte');
    const r2 = await createRol('AYUDANTE', 'Ayudante / Colector de autobús en ruta');
    const r3 = await createRol('ADMIN_COOPERATIVA', 'Administrador de cooperativa');
    const r4 = await createRol('TAQUILLERO', 'Operario de venta de boletos en taquilla');
    setLog(JSON.stringify({ rolChofer: r1, rolAyudante: r2, rolAdmin: r3, rolTaquillero: r4 }, null, 2));
  }

  // 2. Consultar Roles Existentes
  async function handleVerRoles() {
    setLog('Consultando roles registrados...');
    const res = await getRoles();
    setLog(JSON.stringify(res, null, 2));
  }

  // 3. Registrar Personal (Chofer o Ayudante dinámicamente)
  async function handleRegistrarPersonal() {
    setLog(`Buscando rol ${formPersonal.rolNombre} e intentando registrar...`);
    
    // Obtener roles reales para asociar el ID correcto
    const rolesRes = await getRoles();
    if (!rolesRes.success || !rolesRes.data) {
      setLog('Error: No se pudieron obtener los roles. Inicialízalos primero.');
      return;
    }

    const rolTarget = rolesRes.data.find((r) => r.nombre === formPersonal.rolNombre);
    if (!rolTarget) {
      setLog(`Error: El rol ${formPersonal.rolNombre} no existe. Ejecuta '1. Inicializar Roles' primero.`);
      return;
    }

    const timestamp = Date.now().toString().slice(-3);
    const res = await createUsuario({
      idCooperativa: 1,
      idRol: rolTarget.idRol,
      nombre: formPersonal.nombre,
      apellido: formPersonal.apellido,
      usuario: `${formPersonal.usuario}_${timestamp}`,
      correo: `${timestamp}_${formPersonal.correo}`,
      telefono: formPersonal.telefono,
    });

    setLog(JSON.stringify({ rolAsignado: rolTarget.nombre, idRol: rolTarget.idRol, resultado: res }, null, 2));
  }

  // 4. Listar Personal de la Cooperativa
  async function handleVerUsuarios() {
    setLog('Consultando personal registrado de la cooperativa 1...');
    const res = await getUsuariosByCooperativa(1);
    setLog(JSON.stringify(res, null, 2));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-emerald-400">
        Prueba: Módulo de Usuarios y Registro de Personal (Choferes y Ayudantes)
      </h2>

      {/* Formulario de Registro de Personal */}
      <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Datos para Registrar Empleado:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div>
            <label className="block text-gray-400 mb-1">Nombre:</label>
            <input
              type="text"
              value={formPersonal.nombre}
              onChange={(e) => setFormPersonal({ ...formPersonal, nombre: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Apellido:</label>
            <input
              type="text"
              value={formPersonal.apellido}
              onChange={(e) => setFormPersonal({ ...formPersonal, apellido: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Rol a Asignar:</label>
            <select
              value={formPersonal.rolNombre}
              onChange={(e) => setFormPersonal({ ...formPersonal, rolNombre: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-white"
            >
              <option value="CHOFER">CHOFER</option>
              <option value="AYUDANTE">AYUDANTE / COLECTOR</option>
              <option value="TAQUILLERO">TAQUILLERO</option>
              <option value="ADMIN_COOPERATIVA">ADMIN COOPERATIVA</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Usuario (Prefijo):</label>
            <input
              type="text"
              value={formPersonal.usuario}
              onChange={(e) => setFormPersonal({ ...formPersonal, usuario: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Correo Electrónico:</label>
            <input
              type="email"
              value={formPersonal.correo}
              onChange={(e) => setFormPersonal({ ...formPersonal, correo: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Teléfono:</label>
            <input
              type="text"
              value={formPersonal.telefono}
              onChange={(e) => setFormPersonal({ ...formPersonal, telefono: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-white"
            />
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleInicializarRoles} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-xs">
          1. Inicializar Roles (CHOFER, AYUDANTE, etc.)
        </button>
        <button onClick={handleVerRoles} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs">
          2. Ver Roles Existentes
        </button>
        <button onClick={handleRegistrarPersonal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-xs">
          3. Registrar {formPersonal.rolNombre}
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