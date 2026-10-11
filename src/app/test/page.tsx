import Link from 'next/link';

export default function TestIndexPage() {
  const modulos = [
    { title: '1. Cooperativas', desc: 'Creación y listado de entidades transportistas.', href: '/test/cooperativas' },
    { title: '2. Unidades & Asientos', desc: 'Catálogos, registro de unidades y generación atómica de asientos.', href: '/test/unidades' },
    { title: '3. Rutas & Tarifas', desc: 'Configuración de paradas (Puntos) y matriz de precios por tramos.', href: '/test/rutas' },
    { title: '4. Viajes & Despachos', desc: 'Programación de salidas, asignación de chofer/bus y despacho.', href: '/test/viajes' },
    { title: '5. Ventas & Equipaje', desc: 'Consulta de mapa de asientos, venta de boletos y cobro de equipaje.', href: '/test/ventas' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Resumen de Módulos a Evidenciar</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modulos.map((m) => (
          <Link key={m.href} href={m.href} className="block p-5 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition">
            <h3 className="text-md font-semibold text-indigo-400 mb-2">{m.title}</h3>
            <p className="text-xs text-gray-400">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}