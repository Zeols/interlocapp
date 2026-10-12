'use client';

import { useState } from 'react';
import {
  createViaje,
  createChofer,
  createAyudante,
  createAsignacionUnidad,
  despacharViaje,
  getViajesByCooperativa,
} from '@/backend/actions/viajes';

export default function TestViajesPage() {
  const [log, setLog] = useState('');

  // Estados dinámicos para la prueba
  const [idViajeActivo, setIdViajeActivo] = useState<number>(1);
  const [idAsignacionActiva, setIdAsignacionActiva] = useState<number>(1);
  const [idChofer, setIdChofer] = useState<number>(1);
  const [idAyudante, setIdAyudante] = useState<number>(2);

  // 1. Programar Viaje
  async function handleProgramarViaje() {
    setLog('Programando nuevo viaje en la BD...');
    const res = await createViaje({
      idRuta: 1,
      fecha: new Date().toISOString().split('T')[0],
      hrSalidaProgramada: new Date(Date.now() + 3600000).toISOString(),
      sentido: 'IDA',
    });

    if (res.success && res.data) {
      setIdViajeActivo(res.data.idViaje);
    }
    setLog(JSON.stringify(res, null, 2));
  }

  // 2. Registrar Chofer y Ayudante/Cobrador
  async function handleCrearPersonal() {
    setLog('Registrando Chofer y Ayudante en la BD...');
    const ts = Date.now().toString().slice(-3);

    const resChofer = await createChofer({
      idCooperativa: 1,
      nombre: 'Carlos',
      apellido: 'Mendoza',
      usuario: `chofer_${ts}`,
    });

    const resAyudante = await createAyudante({
      idCooperativa: 1,
      nombre: 'Roberto',
      apellido: 'García',
      usuario: `ayudante_${ts}`,
    });

    if (resChofer.success && resChofer.data) {
      setIdChofer(resChofer.data.idUsuario);
    }
    if (resAyudante.success && resAyudante.data) {
      setIdAyudante(resAyudante.data.idUsuario);
    }

    setLog(
      JSON.stringify(
        {
          choferCreado: resChofer,
          ayudanteCreado: resAyudante,
        },
        null,
        2
      )
    );
  }

  // 3. Asignar AMBOS Usuarios a la Unidad
  async function handleAsignarTripulacion() {
    setLog(`Asignando a Unidad 1 los usuarios: Chofer (ID: ${idChofer}) y Ayudante (ID: ${idAyudante})...`);

    const res = await createAsignacionUnidad({
      idUnidad: 1,
      idUsuarios: [idChofer, idAyudante], // <--- Pasamos ambos usuarios juntos
    });

    if (res.success && res.asignacionPrincipal) {
      setIdAsignacionActiva(res.asignacionPrincipal.idAsignacion);
    }
    setLog(JSON.stringify(res, null, 2));
  }

  // 4. Despachar Viaje
  async function handleDespachar() {
    setLog(`Despachando Viaje ID: ${idViajeActivo} con Asignación Principal ID: ${idAsignacionActiva}...`);
    const res = await despacharViaje({
      idViaje: idViajeActivo,
      idAsignacion: idAsignacionActiva,
      observacion: 'Despachado con Chofer y Colector asignados.',
    });
    setLog(JSON.stringify(res, null, 2));
  }

  // 5. Ver Cartelera con la Tripulación Completa
  async function handleVerViajes() {
    setLog('Consultando cartelera de viajes...');
    const res = await getViajesByCooperativa(1);
    setLog(JSON.stringify(res, null, 2));
  }

  return (
    <div className="space-y-6 p-4 bg-gray-950 text-white min-h-screen font-sans">
      <div>
        <h2 className="text-xl font-bold text-emerald-400">
          Prueba: Asignación de Tripulación Doble (Chofer + Ayudante)
        </h2>
        <p className="text-xs text-gray-400">
          Permite asignar dos usuarios a una misma unidad y despachar el viaje con la tripulación completa.
        </p>
      </div>

      {/* Controles de IDs */}
      <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg flex flex-wrap items-center gap-4 text-xs font-mono">
        <div>
          <label className="text-gray-400 block mb-1">ID Viaje Activo:</label>
          <input
            type="number"
            value={idViajeActivo}
            onChange={(e) => setIdViajeActivo(Number(e.target.value))}
            className="bg-gray-950 border border-gray-700 px-3 py-1 rounded text-white w-24"
          />
        </div>
        <div>
          <label className="text-gray-400 block mb-1">ID Asignación Principal:</label>
          <input
            type="number"
            value={idAsignacionActiva}
            onChange={(e) => setIdAsignacionActiva(Number(e.target.value))}
            className="bg-gray-950 border border-gray-700 px-3 py-1 rounded text-white w-24"
          />
        </div>
        <div>
          <label className="text-gray-400 block mb-1">ID Chofer:</label>
          <input
            type="number"
            value={idChofer}
            onChange={(e) => setIdChofer(Number(e.target.value))}
            className="bg-gray-950 border border-gray-700 px-3 py-1 rounded text-white w-24"
          />
        </div>
        <div>
          <label className="text-gray-400 block mb-1">ID Ayudante / Colector:</label>
          <input
            type="number"
            value={idAyudante}
            onChange={(e) => setIdAyudante(Number(e.target.value))}
            className="bg-gray-950 border border-gray-700 px-3 py-1 rounded text-white w-24"
          />
        </div>
      </div>

      {/* Botones de prueba */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={handleProgramarViaje}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded text-xs text-left"
        >
          <strong>1. Programar Viaje</strong>
          <span className="block text-[10px] text-indigo-200">Crear Viaje</span>
        </button>

        <button
          onClick={handleCrearPersonal}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded text-xs text-left"
        >
          <strong>2. Crear Chofer + Ayudante</strong>
          <span className="block text-[10px] text-blue-200">Registrar Usuarios</span>
        </button>

        <button
          onClick={handleAsignarTripulacion}
          className="bg-teal-600 hover:bg-teal-700 text-white p-3 rounded text-xs text-left"
        >
          <strong>3. Asignar 2 Usuarios</strong>
          <span className="block text-[10px] text-teal-200">Chofer y Ayudante</span>
        </button>

        <button
          onClick={handleDespachar}
          className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded text-xs text-left"
        >
          <strong>4. Despachar Viaje</strong>
          <span className="block text-[10px] text-amber-200">Iniciar Viaje</span>
        </button>

        <button
          onClick={handleVerViajes}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded text-xs text-left"
        >
          <strong>5. Ver Cartelera</strong>
          <span className="block text-[10px] text-emerald-200">Ver JSON con Tripulación</span>
        </button>
      </div>

      {/* Salida JSON */}
      <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto font-mono min-h-[300px] border border-gray-800">
        {log || 'Haz clic en los botones en orden (1 al 5) para probar la asignación doble...'}
      </pre>
    </div>
  );
}