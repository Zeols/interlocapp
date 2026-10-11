'use client';

import { useState } from 'react';
import { createPunto, createRutaConPuntosYTarifas, getRutasByCooperativa } from '@/actions/rutas';

export default function TestPage() {
  const [log, setLog] = useState<string>('');

  // 1. Crear Puntos
  async function handleTestCrearPuntos() {
    setLog('Creando puntos de parada...');
    const p1 = await createPunto({ nombre: 'Terminal Jinotepe', descripcion: 'Carazo' });
    const p2 = await createPunto({ nombre: 'Empalme El Crucero', descripcion: 'Managua' });
    const p3 = await createPunto({ nombre: 'Terminal UCA', descripcion: 'Managua' });

    setLog(JSON.stringify({ punto1: p1, punto2: p2, punto3: p3 }, null, 2));
  }

  // 2. Crear Ruta con PuntosRuta y Tarifas
  async function handleTestCrearRuta() {
    setLog('Creando Ruta Jinotepe - Managua con orden de paradas y matriz de tarifas...');
    
    const res = await createRutaConPuntosYTarifas({
      idCooperativa: 1,
      nombre: 'Jinotepe - Managua (Expreso)',
      descripcion: 'Ruta ordinaria por El Crucero',
      puntosIds: [1, 2, 3], // Jinotepe (1) -> El Crucero (2) -> Terminal UCA (3)
      tarifas: [
        { idPuntoOrigen: 1, idPuntoDestino: 2, monto: 25.00 }, // Jinotepe -> El Crucero
        { idPuntoOrigen: 2, idPuntoDestino: 3, monto: 20.00 }, // El Crucero -> UCA
        { idPuntoOrigen: 1, idPuntoDestino: 3, monto: 40.00 }, // Jinotepe -> UCA (Directo)
      ],
    });

    setLog(JSON.stringify(res, null, 2));
  }

  // 3. Consultar
  async function handleGetRutas() {
    setLog('Consultando rutas de la cooperativa 1...');
    const res = await getRutasByCooperativa(1);
    setLog(JSON.stringify(res, null, 2));
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-4 font-mono">
      <h1 className="text-xl font-bold">Prueba de Rutas, Puntos y Tarifas</h1>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleTestCrearPuntos}
          className="bg-teal-600 text-white px-3 py-2 rounded text-xs hover:bg-teal-700"
        >
          1. Crear Puntos
        </button>
        <button
          onClick={handleTestCrearRuta}
          className="bg-indigo-600 text-white px-3 py-2 rounded text-xs hover:bg-indigo-700"
        >
          2. Crear Ruta + Puntos + Tarifas
        </button>
        <button
          onClick={handleGetRutas}
          className="bg-emerald-600 text-white px-3 py-2 rounded text-xs hover:bg-emerald-700"
        >
          3. Ver Rutas y Tarifas
        </button>
      </div>

      <div className="bg-gray-900 text-green-400 p-4 rounded min-h-[300px] whitespace-pre-wrap text-xs overflow-auto">
        {log || 'Haz clic en un botón para ejecutar la acción...'}
      </div>
    </div>
  );
}