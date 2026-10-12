'use client';

import { useState } from 'react';
import { createCooperativa, getCooperativas } from '@/backend/actions/cooperativas';

export default function TestCooperativasPage() {
  const [log, setLog] = useState('');

  async function handleCrear() {
    setLog('Ejecutando createCooperativa...');
    const res = await createCooperativa({
      nombre: 'Cooperativa COTRAN R.L.',
      telefono: '2532-1111',
      direccion: 'Terminal Central',
    });
    setLog(JSON.stringify(res, null, 2));
  }

  async function handleListar() {
    setLog('Ejecutando getCooperativas...');
    const res = await getCooperativas();
    setLog(JSON.stringify(res, null, 2));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-indigo-400">Prueba: Módulo de Cooperativas</h2>
      <div className="flex gap-2">
        <button onClick={handleCrear} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs">
          Crear Cooperativa
        </button>
        <button onClick={handleListar} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs">
          Listar Cooperativas
        </button>
      </div>
      <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto font-mono min-h-[300px]">
        {log || 'Haz clic en una opción para probar...'}
      </pre>
    </div>
  );
}