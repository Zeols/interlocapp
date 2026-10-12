'use client';

import { useState } from 'react';
import { createPunto, createRutaConPuntosYTarifas, getRutasByCooperativa } from '@/actions/rutas';

export default function TestRutasPage() {
  const [log, setLog] = useState('');

  async function handleCrearPuntos() {
    setLog('Ejecutando createPunto...');
    const p1 = await createPunto({ nombre: 'Terminal Jinotepe', descripcion: 'Carazo' });
    const p2 = await createPunto({ nombre: 'Empalme El Crucero', descripcion: 'Managua' });
    const p3 = await createPunto({ nombre: 'Terminal UCA', descripcion: 'Managua' });
    setLog(JSON.stringify({ p1, p2, p3 }, null, 2));
  }

  async function handleCrearRuta() {
    setLog('Ejecutando createRutaConPuntosYTarifas...');
    const res = await createRutaConPuntosYTarifas({
      idCooperativa: 1,
      nombre: 'Jinotepe - Managua Directo',
      puntosIds: [1, 2, 3],
      tarifas: [
        { idPuntoOrigen: 1, idPuntoDestino: 2, monto: 25.00 },
        { idPuntoOrigen: 2, idPuntoDestino: 3, monto: 20.00 },
        { idPuntoOrigen: 1, idPuntoDestino: 3, monto: 40.00 },
      ],
    });
    setLog(JSON.stringify(res, null, 2));
  }

  async function handleVerRutas() {
    setLog('Ejecutando getRutasByCooperativa...');
    const res = await getRutasByCooperativa(1);
    setLog(JSON.stringify(res, null, 2));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-teal-400">Prueba: Módulo de Rutas y Tarifas</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleCrearPuntos} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-xs">
          1. Crear Puntos Parada
        </button>
        <button onClick={handleCrearRuta} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-xs">
          2. Crear Ruta + Tarifas
        </button>
        <button onClick={handleVerRutas} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-xs">
          3. Consultar Rutas
        </button>
      </div>
      <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto font-mono min-h-[300px]">
        {log || 'Haz clic en una opción para probar...'}
      </pre>
    </div>
  );
}