# Plan de Implementación Integral — RutaCorp (InterlocApp)

> **Documento:** Plan Maestro de Arquitectura e Implementación por Fases  
> **Proyecto:** Plataforma de Gestión de Flota, Operaciones y Comercialización de Boletos Interlocales  
> **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma ORM 7, PostgreSQL (pg driver adapter)  
> **Última actualización:** 12 de Octubre, 2026

---

## 1. Resumen Ejecutivo y Visión del Producto

**RutaCorp** es una solución digital completa (B2B + B2C) diseñada para modernizar, automatizar y centralizar de extremo a extremo las operaciones de las **cooperativas de transporte interlocal e interurbano de pasajeros**.

### Problemas que resuelve
* **Descontrol en la sobreventa de asientos**: Falta de inventario de asientos en tiempo real entre taquillas y ventas en ruta.
* **Liquidaciones manuales opacas**: Inconsistencias al cuadrar el dinero entregado por los choferes contra los boletos vendidos y gastos de combustible.
* **Desconexión logística**: Ausencia de trazabilidad entre la programación del viaje, la unidad física y la tripulación asignada (chofer + ayudante).
* **Experiencia deficiente del pasajero**: Imposibilidad de consultar horarios en línea, elegir su asiento o reservar con anticipación.

### Objetivos Clave
1. **Multi-Tenancy Cooperativo**: Cada cooperativa gestiona de forma aislada e independiente su flota, personal, rutas y finanzas.
2. **Operación en Tiempo Real**: Despacho de viajes, monitoreo de incidentes y control de paradas intermedias.
3. **Motor Transaccional Seguro**: Transacciones atómicas en base de datos para garantizar cero sobreventa de asientos concurrentes.
4. **Cuadre Financiero Preciso**: Conciliación automática entre ingresos por boletos/equipaje y egresos operativos (gasolina, viáticos, peajes).

---

## 2. Arquitectura del Sistema

```
ruta-corp/
├── prisma/
│   ├── schema.prisma           # Esquema relacional con 18 modelos y 12 enums
│   └── migrations/             # Migraciones versionadas en PostgreSQL
├── prisma.config.ts            # Configuración de Prisma v7 + dotenv
│
├── src/
│   ├── backend/                # 🛡️ CAPA DE BACKEND
│   │   ├── db/                 # Conexión singleton y pool de conexiones SSL (pg)
│   │   │   ├── client.ts
│   │   │   └── index.ts
│   │   ├── actions/            # Server Actions (Servicios y controladores de negocio)
│   │   │   ├── cooperativas.ts
│   │   │   ├── rutas.ts
│   │   │   ├── unidades.ts
│   │   │   ├── usuarios.ts
│   │   │   ├── ventas.ts
│   │   │   ├── viajes.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── frontend/               # 🎨 CAPA DE FRONTEND
│   │   ├── components/         # Biblioteca de componentes UI
│   │   │   ├── ui/             # Primitivas (Button, Card, Input, Label, UserChip, SeatMap)
│   │   │   ├── layout/         # Layouts, Navbar global
│   │   │   └── magicui/        # Microanimaciones y Bento Grids
│   │   ├── lib/                # Utilidades de interfaz (cn helper)
│   │   ├── mocks/              # Datos simulados para desarrollo y pruebas
│   │   ├── types/              # Tipos TypeScript específicos de UI
│   │   └── index.ts
│   │
│   └── app/                    # 🌐 NEXT.JS APP ROUTER (Enrutador y Vistas)
│       ├── (app)/              # Rutas de la aplicación cliente (Navbar integrado)
│       │   ├── home/           # Vista principal del pasajero
│       │   ├── trips/          # Catálogo de viajes disponibles
│       │   ├── compra/         # Proceso de checkout y selección de asiento
│       │   ├── profile/        # Perfil del usuario
│       │   ├── settings/       # Configuración de cuenta
│       │   └── layout.tsx
│       ├── (auth)/             # Rutas de autenticación (Standalone)
│       │   ├── login/
│       │   ├── signup/
│       │   └── forgot/
│       ├── dashboard/          # Panel administrativo de la cooperativa (Sidebar nav)
│       ├── test/               # Banco de pruebas para Server Actions y base de datos
│       ├── layout.tsx          # Root Layout
│       ├── page.tsx            # Landing Page comercial
│       └── globals.css
```

---

## 3. Matriz de Roles y Permisos (RBAC)

| Módulo / Funcionalidad | SUPER_ADMIN | ADMIN_COOP | DESPACHADOR / TAQUILLERO | CHOFER | PASAJERO |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Gestión de Cooperativas** | Total | Solo lectura | — | — | — |
| **Flota y Unidades** | Total | Total | Solo lectura | Lectura asignada | — |
| **Personal (Choferes/Ayudantes)** | Total | Total | Solo lectura | — | — |
| **Rutas y Tarifas** | Total | Total | Solo lectura | — | Solo lectura |
| **Programación de Viajes** | Total | Total | Creación/Edición | Solo lectura | — |
| **Despacho y Salidas** | Total | Total | Total | Actualización estado | — |
| **Venta de Boletos en Taquilla**| Total | Total | Total | — | — |
| **Compra Web de Boletos** | Total | Total | — | — | Total |
| **Cierres de Caja y Gastos** | Total | Aprobación | Registro turno | Registro gastos | — |
| **Reportes Gerenciales** | Global | De Cooperativa | De Turno | — | — |

---

## 4. Fases de Implementación

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CRONOGRAMA DE IMPLEMENTACIÓN ESTIMADO                           │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│   FASE 1     │    FASE 2    │    FASE 3    │    FASE 4    │    FASE 5    │   FASE 6    │
│ Autenticación│ Backoffice   │ Despacho y   │ Venta B2C y  │ Finanzas y   │ Producción  │
│ y Seguridad  │ Catálogos    │ Operaciones  │ Experiencia  │ Cierres      │ Auditoría   │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
```

---

### FASE 1: Autenticación, Seguridad y Contexto Multi-Tenant

**Objetivo:** Establecer la base de seguridad, encriptación de contraseñas, control de sesiones y aislamiento estricto por cooperativa.

#### Tareas Técnicas
* [ ] **1.1. Seguridad de Credenciales**:
  - Implementar hashing de contraseñas en `createUsuario` utilizando `bcryptjs` o `argon2` (cost factor 12).
  - Sanitizar datos de entrada y validar formatos de correo electrónico y teléfono con Zod.
* [ ] **1.2. Sistema de Sesión y Autenticación**:
  - Crear la Server Action `loginAction(usuario, password)` que valide credenciales y genere una sesión segura basada en cookies HttpOnly (`SameSite=Lax`, `Secure`).
  - Crear Server Action `logoutAction()` para invalidar la sesión actual.
* [ ] **1.3. Middleware de Protección de Rutas**:
  - Crear `src/middleware.ts` en Next.js para interceptar rutas:
    - `/dashboard/*` accesible exclusivamente por usuarios autenticados con roles administrativos (`SUPER_ADMIN`, `ADMIN_COOP`, `TAQUILLERO`).
    - Redirigir a `/login` a usuarios sin sesión activa.
* [ ] **1.4. Contexto Multi-Tenant**:
  - Implementar helper de servidor `getCurrentTenant()` que extraiga el `idCooperativa` del usuario autenticado para que todas las consultas a base de datos se filtren automáticamente por su cooperativa.

#### Criterios de Aceptación (DoD)
* Ninguna contraseña se guarda en texto plano en la base de datos.
* Un usuario con rol `PASAJERO` no puede acceder a las rutas de `/dashboard`.
* Un administrador de la "Cooperativa A" no puede ver ni modificar registros de la "Cooperativa B".

---

### FASE 2: Backoffice Administrativo (Flota, Rutas y Tarifario)

**Objetivo:** Conectar el dashboard administrativo existente con las Server Actions reales para gestionar los activos físicos y rutas de la cooperativa.

#### Tareas Técnicas
* [ ] **2.1. Gestión de Unidades y Autobuses (`/dashboard/flota`)**:
  - Crear tabla interactiva con lista de unidades filtradas por cooperativa (`getUnidadesByCooperativa`).
  - Modal/Formulario de registro conectando con `createUnidadWithAsientos`:
    - Selección de tipo de unidad (Microbús, Autobús estándar, Pullman).
    - Ingreso de número de unidad, placa y capacidad de asientos.
    - Generación automática del inventario de asientos en PostgreSQL.
  - Indicadores visuales de estado (`DISPONIBLE`, `EN_RUTA`, `MANTENIMIENTO`, `INOPERATIVA`).
* [ ] **2.2. Gestión de Rutas y Matriz Tarifaria (`/dashboard/rutas`)**:
  - Interfaz de creación de rutas conectando con `createRutaConPuntosYTarifas`:
    - Constructor visual de paradas en secuencia ordenada (ej: Terminal Managua -> Empalme Tipitapa -> Ciudad Darío -> Terminal Matagalpa).
    - Matriz de tarifas: ingreso de precios por tramo de origen a destino.
* [ ] **2.3. Gestión de Personal Operativo (`/dashboard/personal` o `/dashboard/choferes`)**:
  - Listado de choferes (`getChoferesByCooperativa`) y ayudantes (`getAyudantesByCooperativa`).
  - Formulario de alta rápida de nuevos operarios con asignación de rol.

#### Criterios de Aceptación (DoD)
* Al registrar una unidad de 20 asientos, la base de datos genera exactamente 20 registros en la tabla `asientos`.
* Una placa duplicada es rechazada con un mensaje de error legible para el usuario.
* La ruta creada muestra correctamente sus paradas ordenadas cronológicamente y sus tarifas vinculadas.

---

### FASE 3: Programación de Viajes, Despacho y Operación en Vivo

**Objetivo:** Digitalizar el flujo de despacho en terminal: asignación de turnos, salida de autobuses, control de incidentes y finalización del recorrido.

#### Tareas Técnicas
* [ ] **3.1. Programador de Viajes (`/dashboard/viajes`)**:
  - Calendario y listado de viajes programados conectando con `createViaje`.
  - Filtros por ruta, fecha y sentido (Ida / Vuelta).
* [ ] **3.2. Módulo de Despacho en Terminal**:
  - Formulario de asignación de unidad y tripulación mediante `createAsignacionUnidad`:
    - Selección del autobús disponible.
    - Selección del Chofer principal y Cobrador/Ayudante.
  - Botón de despacho inmediato conectando con `despacharViaje`:
    - Cambio de estado del viaje a `EN_CURSO`.
    - Registro de hora real de salida.
    - Bloqueo de la unidad para que no se pueda asignar a otro viaje simultáneamente.
* [ ] **3.3. Bitácora de Incidentes de Ruta**:
  - Formulario de reporte de incidentes (`Incidente`: Avería mecánica, Accidente, Retraso grave) asociado al despacho.
* [ ] **3.4. Finalización de Recorrido**:
  - Acción `finalizarViaje`:
    - Cambio de estado del viaje a `FINALIZADO`.
    - Registro de hora real de llegada.
    - Retorno de la unidad y sus asientos al estado `DISPONIBLE` para la siguiente rotación.

#### Criterios de Aceptación (DoD)
* Una unidad en estado `EN_RUTA` no puede ser asignada a otro viaje hasta que se finalice el despacho actual.
* El despacho registra atómicamente al chofer y al ayudante en una sola transacción.

---

### FASE 4: Portal del Pasajero y Motor de Venta de Boletos (B2C & Ventanilla)

**Objetivo:** Habilitar la compra ágil de boletos en línea y la emisión rápida en ventanilla de terminal.

#### Tareas Técnicas
* [ ] **4.1. Buscador y Catálogo de Viajes (`/home` y `/trips`)**:
  - Conectar el formulario de búsqueda de `/home` para enviar parámetros de consulta a `/trips?origen=...&destino=...&fecha=...`.
  - Consumir viajes programados reales desde la base de datos mediante Server Components con Suspense y estados de carga (skeletons).
  - Filtros interactivos por cooperativa, horario (mañana, tarde, noche) y tipo de servicio (Directo / Escalas).
* [ ] **4.2. Croquis Interactivo de Asientos (`/compra?viajeId=...`)**:
  - Renderizado dinámico del croquis del autobús consumiendo `getMapaAsientosViaje`:
    - Diferenciación visual de estados: Verde (`Disponible`), Rojo (`Ocupado`), Azul (`Seleccionado`).
    - Lógica de selección múltiple (hasta 5 asientos por compra).
* [ ] **4.3. Checkout, Cobro de Equipaje y Transacción Atómica**:
  - Formulario de datos del pasajero (nombre, identificación, correo para envío del boleto).
  - Adición opcional de equipaje extra conectando con el catálogo de `TarifaEquipaje`.
  - Procesamiento atómico con `procesarVentaBoletos`:
    - Verificación de no-colisión de asientos en la misma transacción.
    - Creación de la cabecera `Venta`, items `Boleto`, y registros de `Equipaje`.
    - Actualización de los asientos a `OCUPADO`.
* [ ] **4.4. Emisión de Boleto Digital**:
  - Pantalla de confirmación con vista de boleto imprimible y código QR de validación.

#### Criterios de Aceptación (DoD)
* Dos usuarios intentando comprar el mismo asiento al mismo milisegundo no pueden generar doble venta (el segundo recibe error de concurrencia y se le solicita elegir otro asiento).
* El monto total de la venta refleja con exactitud la suma de pasajes más los bultos de equipaje extra.

---

### FASE 5: Control Financiero, Gastos y Cierre de Jornada

**Objetivo:** Transparentar la recaudación por unidad, deducir gastos justificados de combustible y liquidar la jornada del operario.

#### Tareas Técnicas
* [ ] **5.1. Registro de Gastos de Operación (`/dashboard/gastos`)**:
  - Formulario para registrar compras de combustible vinculadas a la tabla `AbastecimientoGasolina`:
    - Cantidad de galones/litros, precio unitario y monto total.
  - Registro de gastos menores: peajes, viáticos del chofer, mantenimiento imprevisto.
* [ ] **5.2. Módulo de Liquidación y Cierre de Jornada (`/dashboard/cierres`)**:
  - Interfaz de cuadre diario para el cajero/administrador:
    $$\text{Monto Esperado} = \sum (\text{Boletos Vendidos} + \text{Equipajes}) - \sum (\text{Gastos Justificados})$$
  - Comparativa entre `montoEsperado` y `montoEntregado` con cálculo automático del campo `diferencia`.
  - Estados del cierre: `PENDIENTE`, `CONFIRMADO`, `RECHAZADO`.

#### Criterios de Aceptación (DoD)
* Todo gasto de gasolina queda auditado con su precio unitario y cantidad abastecida.
* No se puede cerrar una jornada con boletos en estado pendiente de cobro.

---

### FASE 6: Métricas Gerenciales, Optimización y Hardening de Producción

**Objetivo:** Análisis gerencial con KPIs, optimización de base de datos y puesta a punto comercial.

#### Tareas Técnicas
* [ ] **6.1. Dashboard con KPIs en Tiempo Real (`/dashboard`)**:
  - Reemplazar datos estáticos por queries agregadas de Prisma:
    - Ventas brutas del día.
    - Cantidad de boletos emitidos por cooperativa.
    - Porcentaje de ocupación promedio de la flota.
    - Rutas con mayor demanda.
* [ ] **6.2. Optimización de Base de Datos e Índices**:
  - Agregar índices compuestos en `prisma/schema.prisma` para maximizar velocidad:
    - `@@index([idViaje, idAsiento])` en `boletos`.
    - `@@index([fecha, idRuta, estado])` en `viajes`.
* [ ] **6.3. Pruebas de Carga y Resiliencia**:
  - Validar límites del pool de conexiones PostgreSQL (`max: 10`, `idleTimeoutMillis: 30000`).
  - Pruebas de estrés de compra simultánea de asientos.
* [ ] **6.4. Observabilidad y Monitoreo**:
  - Configuración de logging de errores críticos en servidor y alertas de fallos en producción (Sentry / Vercel Logs).

---

## 5. Resumen de Estados del Dominio (Enums de Prisma)

```
EstadoUnidad:      [ DISPONIBLE ] ──(Despacho)──> [ EN_RUTA ] ──(Falla)──> [ MANTENIMIENTO ]
                                                                                │
                                           [ INOPERATIVA ] <───────────────────┘

EstadoViaje:       [ PROGRAMADO ] ──(Despacho)──> [ EN_CURSO ] ──(Llegada)──> [ FINALIZADO ]
                                                                                   │
                                           [ CANCELADO ] <────────────────────────┘

EstadoBoleto:      [ RESERVADO ] ──(Pago)──────> [ PAGADO ] ──(Aborde)──> [ ABORDADO ]
                                                      │
                                           [ CANCELADO ] <─────────────────────────┘

EstadoCierre:      [ PENDIENTE ] ──(Revisión)───> [ CONFIRMADO ] | [ RECHAZADO ]
```

---

## 6. Próximos Pasos Recomendados

1. **Revisión y Aprobación del Plan**: Validar si las 6 fases se ajustan a las prioridades operativas de tu equipo.
2. **Inicio Inmediato de Fase 1**: Comenzar con la implementación del hashing de contraseñas y la lógica de sesión/login real.
