'use client';

import { useState } from 'react';
import { createTipoUnidad, createUnidadWithAsientos, getUnidadesByCooperativa } from '@/backend/actions/unidades';

export default function TestUnidadesPage() {
  const [log, setLog] = useState('');

  async function handleCrearTipo() {
    setLog('Ejecutando createTipoUnidad...');
    const res = await createTipoUnidad('Microbús Interurbano', 'Capacidad 15 pax');
    setLog(JSON.stringify(res, null, 2));
  }

  async function handleCrearUnidad() {
    setLog('Ejecutando createUnidadWithAsientos (15 asientos)...');
    const res = await createUnidadWithAsientos({
      idCooperativa: 1,
      idTipoUnidad: 1,
      numeroUnidad: 'BUS-101',
      placa: 'CZ-9999',
      capacidadAsientos: 15,
    });
    setLog(JSON.stringify(res, null, 2));
  }

  async function handleVerUnidades() {
    setLog('Ejecutando getUnidadesByCooperativa...');
    const res = await getUnidadesByCooperativa(1);
    setLog(JSON.stringify(res, null, 2));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-purple-400">Prueba: Módulo de Unidades y Asientos</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleCrearTipo} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-xs">
          1. Crear Tipo Unidad
        </button>
        <button onClick={handleCrearUnidad} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-xs">
          2. Crear Bus + Asientos
        </button>
        <button onClick={handleVerUnidades} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-xs">
          3. Consultar Flota
        </button>
      </div>
      <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto font-mono min-h-[300px]">
        {log || 'Haz clic en una opción para probar...'}
      </pre>
    </div>
  );
}