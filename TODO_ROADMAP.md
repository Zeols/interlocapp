# Roadmap y Lista de Tareas Pendientes (To Do) - InterlocApp

> **Proyecto:** InterlocApp (RutaCorp)  
> **Estado General:** Fases 1 y 2 Completadas (100%) | Fase 3 Backend Listo (UI Pendiente) | Portal B2C Avanzado (80%)  
> **Fecha de Actualización:** Octubre, 2026  
> **Documento de Referencia:** [PLAN_IMPLEMENTACION.md](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/PLAN_IMPLEMENTACION.md)  

---

## 1. Resumen de Estado Global por Fases

| Fase | Título del Módulo | Estado | Progreso Estimado | Prioridad de Acción |
| :---: | :--- | :---: | :---: | :---: |
| **Fase 1** | Inicialización, Seguridad, Autenticación y Multi-Tenant | 🟢 Completada | **100%** | Finalizada |
| **Fase 2** | Backoffice Administrativo (Flota, Asientos, Rutas, Personal y Cooperativas) | 🟢 Completada | **100%** | Finalizada |
| **Fase 3** | Programación de Salidas, Despacho y Operación de Viaje (Chofer / Ayudante) | 🟡 En progreso | **45%** (Backend listo) | **Prioridad 1** |
| **Fase 4** | Portal del Pasajero B2C, Croquis y "Mis Boletos" | 🟡 En progreso | **80%** | **Prioridad 2** |
| **Fase 5** | Taquilla Física (POS) y Validación de Abordaje QR en Puerta | ⏳ Pendiente | **15%** | **Prioridad 3** |
| **Fase 6** | Control Financiero, Gastos, Combustible y Cierres (Arqueos) | ⏳ Pendiente | **0%** | **Prioridad 4** |
| **Fase 7** | Pasarela de Pagos y Notificaciones Transaccionales | 🟡 En progreso | **50%** | **Prioridad 2 (Checkout)** |
| **Fase 8** | Métricas Gerenciales en Vivo, Auditoría y Producción | 🟢 En progreso | **70%** | **Prioridad 5** |

---

## 2. To Do Priorizado y Detallado

### Prioridad 1: Programación de Salidas y Operación en Ruta (Fase 3)
> **Impacto:** Crítico. Conecta la flota, rutas y tripulación con los itinerarios diarios que compran los pasajeros y la operación en carretera.

- [ ] **TODO-3.1: Monitor de Salidas y Despacho en Dashboard ([src/app/dashboard/viajes/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/viajes/page.tsx))**
  - [ ] Tablero de salidas del día agrupadas por estado: *Programadas*, *En Ruta* y *Finalizadas*.
  - [ ] Modal de programación de salida: selección de ruta, fecha, hora estimada y sentido (Ida/Vuelta).
  - [ ] Modal de autorización de despacho:
    - Selector de autobús (filtrando unidades en estado `DISPONIBLE`).
    - Asignación de tripulación (Chofer principal y Ayudante/Cobrador disponibles).
    - Despacho administrativo que cambia la unidad a `EN_RUTA` y el viaje a `EN_CURSO`.
- [ ] **TODO-3.2: App Móvil para Tripulación (Chofer y Ayudante)**
  - [ ] Detección automática del viaje asignado en el turno actual según la sesión del usuario.
  - [ ] **Botón "Iniciar Viaje":** Registra la hora exacta de salida real, activa el monitoreo de ruta y habilita el abordaje.
  - [ ] **Lector QR de Abordaje:** Escaneo con cámara del smartphone para validar boletos de pasajeros al subir.
  - [ ] **Botón "Finalizar Viaje":** Al arribar a la terminal destino, registra la hora real de llegada, libera la unidad a `DISPONIBLE` y los asientos a vacíos.
- [ ] **TODO-3.3: Bitácora de Incidentes y Paradas en Ruta**
  - [ ] Registro rápido de averías mecánicas, accidentes o retrasos con cambio de unidad a `MANTENIMIENTO` si amerita.
  - [ ] Marcado de checkpoints en paradas intermedias para informar tiempos estimados a los pasajeros.

---

### Prioridad 2: Flujo Transaccional Completo del Pasajero B2C (Fases 4 y 7)
> **Impacto:** Alto. El diseño y croquis interactivo del portal ya están construidos; falta la integración de salidas reales y la reserva atómica.

- [ ] **TODO-4.1: Conexión de Búsqueda y Catálogo de Viajes en Vivo**
  - [ ] Conectar el buscador de [src/app/(app)/home/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/home/page.tsx) con [src/app/(app)/trips/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/trips/page.tsx) para consultar salidas reales programadas en PostgreSQL.
- [ ] **TODO-4.2: Bloqueo Temporal de Asientos con TTL (10 Minutos)**
  - [ ] Al seleccionar un asiento en [src/app/(app)/compra/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/compra/page.tsx), apartarlo temporalmente en base de datos para prevenir sobreventa concurrente.
  - [ ] Liberación automática si el temporizador llega a cero sin concretar el pago.
- [ ] **TODO-4.3: Checkout y Emisión de Boleto Digital**
  - [ ] Transacción atómica que registre la compra en `ventas` y `boletos` con firma criptográfica HMAC y código alfanumérico único.
  - [ ] Generación automática y envío del boleto con código QR al correo del pasajero vía Nodemailer (`sendTicketEmail`).
  - [ ] Visualización en vivo del boleto en [src/app/(app)/tickets/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/tickets/page.tsx).

---

### Prioridad 3: Taquilla de Terminal (POS) y Validación de Abordaje (Fase 5)
> **Impacto:** Medio-Alto. Venta física presencial en ventanilla y control de acceso.

- [ ] **TODO-5.1: Punto de Venta para Taquilla ([src/app/dashboard/pos/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/pos/page.tsx))**
  - [ ] Interfaz táctil de venta rápida en ventanilla: elegir salida -> marcar asiento -> ingresar efectivo en Córdobas -> cálculo de cambio/vuelto.
  - [ ] Impresión térmica rápida de recibos con código QR para impresoras de 58mm y 80mm.
- [ ] **TODO-5.2: Validación de Abordaje QR en Puerta**
  - [ ] Validación atómica que cambia el boleto a `ABORDADO`.
  - [ ] Detección de boletos duplicados, cancelados o pertenecientes a otra salida.
  - [ ] Contador en vivo de pasajeros a bordo vs capacidad total de la unidad.

---

### Prioridad 4: Control Financiero, Combustible y Cierres de Turno (Fase 6)
> **Impacto:** Medio. Liquidación contable y transparencia de ingresos frente a egresos.

- [ ] **TODO-6.1: Registro de Combustible y Gastos Operativos ([src/app/dashboard/gastos/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/gastos/page.tsx))**
  - [ ] Formulario de captura rápida de combustible: galones, precio por galón, cálculo de importe total y registro de comprobante.
  - [ ] Registro de peajes, viáticos y reparaciones menores imputados a la unidad o salida.
- [ ] **TODO-6.2: Arqueo Diario y Cuadre de Caja ([src/app/dashboard/cierres/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/cierres/page.tsx))**
  - [ ] Agregación matemática: Total recaudado en boletos y equipajes menos gastos autorizados de combustible y viáticos.
  - [ ] Comparativa contra el efectivo físico entregado con semáforo de cuadre (exacto, faltante, sobrante).

---

### Prioridad 5: Hardening, Auditoría y Producción (Fase 8)
- [ ] **TODO-8.1: Hardening de Índices y Consultas de Alta Concurrencia**
  - [ ] Verificación de índices compuestos en tablas de alta concurrencia (`boletos`, `asientos`, `viajes`).
- [ ] **TODO-8.2: Verificación de Builds y Tipado Estricto Continuo**
  - [ ] Validación con `pnpm exec tsc --noEmit` y `pnpm run build`.

---

## 3. Lo que ya está 100% Completado y Verificado

- [x] **Base de Datos Relacional Completa:** 19 modelos relacionales y 13 enums en PostgreSQL Neon con Prisma 7.
- [x] **Siembra de Catálogos Maestros:** Roles, tipos de venta, tipos de unidad, tarifas de equipaje y cooperativa piloto ("COOTRANSTEL R.L.").
- [x] **Autenticación y Sesiones Seguras:** Hashing bcrypt coste 12, JWT y cookies HttpOnly seguras.
- [x] **Verificación de Correo en Registro:** Generación y validación de código OTP de 6 dígitos con caducidad de 15 minutos vía Gmail SMTP.
- [x] **Recuperación de Contraseña:** Flujo seguro en 4 pasos con código de un solo uso y reseteo en base de datos.
- [x] **Onboarding y Registro Diferenciado B2B/B2C:** Registro de pasajeros vs solicitud de cooperativa (`PENDIENTE_APROBACION`) con aprobación central.
- [x] **Módulo de Cooperativas para Super Admin ([src/app/dashboard/cooperativas/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/cooperativas/page.tsx)):** Gestión global, cambio de estados (`ACTIVO`, `INACTIVO`, `PENDIENTE_APROBACION`) y filtro por cooperativa.
- [x] **Módulo de Flota de Unidades ([src/app/dashboard/flota/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/flota/page.tsx)):** Registro de unidades con generación automática de croquis de asientos interactivo según carrocería.
- [x] **Constructor de Rutas y Matriz Tarifaria ([src/app/dashboard/rutas/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/rutas/page.tsx)):** Secuenciación de paradas, modalidades y cálculo de tarifas por tramo en Córdobas con serialización Decimal corregida.
- [x] **Directorio de Personal Operativo ([src/app/dashboard/choferes/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/choferes/page.tsx)):** Gestión de choferes y ayudantes con credenciales vinculadas a la cooperativa.
- [x] **Módulo de Perfil y Cuentas (Admin y Pasajero):** Carga y compresión WebP en cliente (resiliente en iOS/Android hasta 15 MB), cambio de contraseña y diseño anti-slop.
- [x] **KPIs y Métricas Gerenciales en Vivo ([src/app/dashboard/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/page.tsx)):** Conectado con PostgreSQL para calcular en tiempo real ventas de hoy, transacciones, ocupación de flota e historial.
- [x] **Componentes de UX Estándar:** Skeletons de carga adaptados a la arquitectura y paginación configurable en todas las tablas del panel.
- [x] **Multidivisa Oficial (NIO / USD):** Contexto global de divisa con tasa oficial BCN propagada en todo el portal.
- [x] **Métodos de Pago Persistidos:** Gestión completa de tarjetas y métodos de pago guardados por usuario en base de datos.
- [x] **Correos Transaccionales con Identidad Visual:** Plantillas de correo oficiales con logo, botones de acción y diseño responsive.
