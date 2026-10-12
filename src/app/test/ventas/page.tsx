'use client';

import { useState } from 'react';
import { createTipoVenta, createTarifaEquipaje, getMapaAsientosViaje, procesarVentaBoletos } from '@/backend/actions/ventas';

export default function TestVentasPage() {
  const [log, setLog] = useState('');

  async function handleConfigurarCatalogos() {
    setLog('Ejecutando catálogos de venta y equipaje...');
    const tv = await createTipoVenta('Taquilla Principal');
    const te = await createTarifaEquipaje({ descripcion: 'Caja Grande', monto: 20.00 });
    setLog(JSON.stringify({ tipoVenta: tv, tarifaEquipaje: te }, null, 2));
  }

  async function handleVerMapa() {
    setLog('Ejecutando getMapaAsientosViaje...');
    const res = await getMapaAsientosViaje(1);
    setLog(JSON.stringify(res, null, 2));
  }

  async function handleVenderConEquipaje() {
    setLog('Ejecutando procesarVentaBoletos con Equipaje...');
    const res = await procesarVentaBoletos({
      idViaje: 1,
      idTipoVenta: 1,
      boletos: [
        {
          idAsiento: 1,
          idTarifa: 1,
          monto: 40.00,
          equipaje: {
            idTarifaEquipaje: 1,
            descripcion: 'Equipaje de mano pesado',
            cantidad: 1,
            monto: 20.00,
          },
        },
      ],
    });
    setLog(JSON.stringify(res, null, 2));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-amber-400">Prueba: Módulo de Ventas y Equipaje</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleConfigurarCatalogos} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-xs">
          1. Inicializar Catálogos
        </button>
        <button onClick={handleVerMapa} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-xs">
          2. Ver Mapa Asientos
        </button>
        <button onClick={handleVenderConEquipaje} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-xs">
          3. Vender Boleto + Equipaje
        </button>
      </div>
      <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto font-mono min-h-[300px]">
        {log || 'Haz clic en una opción para probar...'}
      </pre>
    </div>
  );
}