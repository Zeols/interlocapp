'use client';

import { useState } from 'react';
import {
  createViaje,
  createAsignacionUnidad,
  despacharViaje,
  getViajesByCooperativa,
  getChoferesByCooperativa,
  createChofer,
} from '@/actions/viajes';
import { getUnidadesByCooperativa } from '@/actions/unidades';

export default function TestViajesPage() {
  const [log, setLog] = useState('');
  const [selectedUnidad, setSelectedUnidad] = useState<number>(1);
  const [selectedChofer, setSelectedChofer] = useState<number>(1);

  // 1. Crear Chofer
  async function handleCrearChofer() {
    setLog('Registrando nuevo chofer en la cooperativa 1...');
    const res = await createChofer({
      idCooperativa: 1,
      nombre: 'Mario',
      apellido: 'Bredio',
      usuario: `chofer_${Date.now().toString().slice(-4)}`,
    });
    setLog(JSON.stringify(res, null, 2));
  }

  // 2. Programar Viaje
  async function handleProgramar() {
    setLog('Programando nuevo viaje...');
    const res = await createViaje({
      idRuta: 1,
      fecha: '2026-10-15',
      hrSalidaProgramada: new Date('2026-10-15T06:00:00Z').toISOString(),
      sentido: 'IDA',
    });
    setLog(JSON.stringify(res, null, 2));
  }

  // 3. Cargar Catálogos para los Selectores
  async function handleCargarCatalogos() {
    setLog('Consultando Unidades y Choferes disponibles para la Cooperativa 1...');
    const choferes = await getChoferesByCooperativa(1);
    const unidades = await getUnidadesByCooperativa(1);

    setLog(JSON.stringify({ choferesDisponibles: choferes, unidadesDisponibles: unidades }, null, 2));
  }

  // 4. Asignar Selección Explícita y Despachar
  async function handleAsignarYDespachar() {
    setLog(`Asignando explícitamente Unidad ID: ${selectedUnidad} y Chofer ID: ${selectedChofer}...`);

    const asig = await createAsignacionUnidad({
      idUnidad: selectedUnidad,
      idUsuario: selectedChofer,
    });

    if (!asig.success || !asig.data) {
      setLog(JSON.stringify(asig, null, 2));
      return;
    }

    const desp = await despacharViaje({
      idViaje: 1,
      idAsignacion: asig.data.idAsignacion,
      observacion: 'Despachado por el administrador tras validación',
    });

    setLog(JSON.stringify({ asignacionResultado: asig, despachoResultado: desp }, null, 2));
  }

  // 5. Consultar Viajes
  async function handleVerViajes() {
    setLog('Consultando viajes registrados...');
    const res = await getViajesByCooperativa(1);
    setLog(JSON.stringify(res, null, 2));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-blue-400">Panel de Control: Viajes y Selección de Personal</h2>

      {/* Formulario de Selección del Administrador */}
      <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">Selección manual del Administrador:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="block text-gray-400 mb-1">ID de la Unidad (Bus):</label>
            <input
              type="number"
              value={selectedUnidad}
              onChange={(e) => setSelectedUnidad(Number(e.target.value))}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">ID del Chofer (Usuario):</label>
            <input
              type="number"
              value={selectedChofer}
              onChange={(e) => setSelectedChofer(Number(e.target.value))}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleCrearChofer} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-xs">
          0. Registrar Chofer de Prueba
        </button>
        <button onClick={handleProgramar} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs">
          1. Programar Viaje
        </button>
        <button onClick={handleCargarCatalogos} className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded text-xs">
          2. Ver Unidades y Choferes
        </button>
        <button onClick={handleAsignarYDespachar} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-xs">
          3. Asignar Selección & Despachar
        </button>
        <button onClick={handleVerViajes} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-xs">
          4. Ver Estado del Viaje
        </button>
      </div>

      <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto font-mono min-h-[250px]">
        {log || 'Ingresa los IDs deseados y ejecuta una acción...'}
      </pre>
    </div>
  );
}