import Link from 'next/link';

export default function TestLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { label: 'Inicio', href: '/test' },
    { label: '1. Cooperativas', href: '/test/cooperativas' },
    { label: '2. Personal & Choferes', href: '/test/usuarios' },
    { label: '3. Unidades & Flota', href: '/test/Unidades' },
    { label: '4. Rutas & Tarifas', href: '/test/rutas' },
    { label: '5. Viajes & Despachos', href: '/test/viajes' },
    { label: '6. Ventas & Equipaje', href: '/test/ventas' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-lg font-bold text-white tracking-wide">
            Panel de Evidencia de Server Actions
          </h1>
          <nav className="flex flex-wrap gap-2 text-xs font-mono">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded transition border border-gray-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}