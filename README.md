# InterlocApp - Plataforma de Gestión y Reserva de Transporte Interurbano

Sistema web integral para cooperativas de transporte interurbano de pasajeros. Permite a los usuarios consultar horarios, reservar y pagar boletos con selección interactiva de asientos en tiempo real, mientras proporciona a las cooperativas un panel administrativo para el control de flota, rutas y ventas.

---

## Características Principales

### Para Pasajeros
- **Explorador y Filtro de Viajes**: Búsqueda por origen, destino, fecha y filtros por cooperativa o franja horaria (mañana, tarde, noche).
- **Selección Interactiva de Asientos**: Croquis visual del autobús en tiempo real (disponibles, seleccionados, ocupados y pasillo).
- **Gestión de Equipaje y Tarifas**: Cálculo dinámico por tramos y costo de piezas adicionales.
- **Boleto Digital**: Emisión instantánea de boleto digital con código identificador y confirmación por correo.
- **Perfil y Preferencias**: Administración de datos personales, opciones de seguridad, moneda de facturación y alertas por correo.

### Para Operadores y Cooperativas
- **Panel Administrativo (Dashboard)**: Métricas operativas en tiempo real (ventas del día, boletos emitidos, unidades activas y tasa de ocupación promedio).
- **Gestión de Flota y Choferes**: Control de unidades de transporte, asignación de choferes y despachos.
- **Rutas y Tarifas**: Definición de paradas (puntos de ruta) y matriz de precios por tramos.

---

## Tecnologías Utilizadas

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server & Client Components)
- **Librería UI**: [React 19](https://react.dev/)
- **Estilos y Diseño**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animaciones e Interactividad**: [Framer Motion](https://www.framer-motion.com/)
- **Tipografía**: Manrope (Encabezados) e Inter (Cuerpo y datos)
- **Iconografía**: [@mdi/react](https://materialdesignicons.com/) y [@mdi/js](https://github.com/Templarian/MaterialDesign-JS)
- **Base de Datos y ORM**: PostgreSQL con [Prisma ORM 7](https://www.prisma.io/)
- **Controlador de Base de Datos**: `@prisma/adapter-pg` y `pg`

---

## Estructura del Proyecto

```text
ruta-corp/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos PostgreSQL y modelos Prisma
├── public/                    # Recursos estáticos e imágenes de rutas
├── src/
│   ├── app/
│   │   ├── (app)/             # Rutas de la aplicación de usuario (home, trips, compra, profile, settings)
│   │   ├── (auth)/            # Módulo de autenticación (login, signup, forgot)
│   │   ├── dashboard/         # Panel administrativo de cooperativa
│   │   ├── test/              # Entorno de pruebas CRUD para entidades backend
│   │   ├── globals.css        # Variables de diseño, fuentes y tokens de Tailwind
│   │   ├── layout.tsx         # Layout raíz con configuración de fuentes Google Fonts
│   │   └── page.tsx           # Landing page pública
│   ├── backend/
│   │   ├── actions/           # Server Actions para cooperativas, rutas, viajes, ventas y usuarios
│   │   └── db/                # Cliente centralizado de Prisma
│   └── frontend/
│       ├── components/
│       │   ├── layout/        # Navbar, Footer y contenedores principales
│       │   └── ui/            # Botones, tarjetas, inputs, selector de asientos y sliders
│       ├── mocks/             # Datos de prueba para interfaz y rutas
│       └── types/             # Definiciones e interfaces TypeScript
└── package.json
```

---

## Requisitos Previos

- **Node.js**: Versión 20.x o superior
- **Gestor de paquetes**: `pnpm` (recomendado), `npm` o `yarn`
- **Base de datos**: Instancia de PostgreSQL (local o en la nube como Neon, Supabase o Railway)

---

## Instalación y Configuración

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Zeols/interlocapp.git
   cd interlocapp
   ```

2. **Instalar dependencias**:
   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto basándote en el siguiente ejemplo:
   ```env
   DATABASE_URL="postgresql://usuario:password@localhost:5432/rutacorp_db?schema=public"
   ```

4. **Generar el cliente de Prisma y sincronizar la base de datos**:
   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

5. **Iniciar el servidor de desarrollo**:
   ```bash
   pnpm dev
   ```

6. **Abrir en el navegador**:
   Visita [http://localhost:3000](http://localhost:3000) para acceder a la aplicación.

---

## Scripts Disponibles

- `pnpm dev`: Inicia el servidor de desarrollo local con recarga rápida.
- `pnpm build`: Genera el empaquetado optimizado de producción.
- `pnpm start`: Ejecuta la versión compilada en modo producción.
- `pnpm lint`: Ejecuta el análisis estático de código con ESLint.
- `pnpm prisma studio`: Abre la interfaz gráfica de Prisma para explorar la base de datos.

---

## Rutas Principales del Sistema

| Ruta | Descripción |
|---|---|
| `/` | Landing page con slider de rutas y menú adaptativo para móviles |
| `/login` | Inicio de sesión para pasajeros y personal |
| `/signup` | Registro de nuevos usuarios |
| `/home` | Portal de usuario con accesos directos y rutas frecuentes |
| `/trips` | Explorador y filtrado de salidas disponibles |
| `/compra` | Selección interactiva de asientos y pago |
| `/profile` | Datos de cuenta y contraseña |
| `/settings` | Configuración de notificaciones y facturación |
| `/dashboard` | Panel operativo para supervisión de flota y ventas |

---

## Licencia

Distribuido bajo la licencia MIT. Consulta el archivo `LICENSE` para más información.
