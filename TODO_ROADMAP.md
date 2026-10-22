# Roadmap y Lista de Tareas Pendientes (To Do) - InterlocApp

> **Proyecto:** InterlocApp (RutaCorp)  
> **Estado General:** Fases 1, 2, 3, 4, 5 y 6 Completadas al 100% | Taquilla POS Operativa | Control de Gastos y Arqueos en Vivo Activos | Validación QR en Puerta Lista  
> **Fecha de Actualización:** Octubre, 2026  
> **Documento de Referencia:** [PLAN_IMPLEMENTACION.md](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/PLAN_IMPLEMENTACION.md)  

---

## 1. Resumen de Estado Global por Fases

| Fase | Título del Módulo | Estado | Progreso Estimado | Prioridad de Acción |
| :---: | :--- | :---: | :---: | :---: |
| **Fase 1** | Inicialización, Seguridad, Biometría, Google OAuth y Multi-Tenant | 🟢 Completada | **100%** | Finalizada |
| **Fase 2** | Backoffice Administrativo (Flota, Asientos, Rutas, Personal y Cooperativas) | 🟢 Completada | **100%** | Finalizada |
| **Fase 3** | Programación de Salidas, Despacho y Operación de Viaje (Chofer / Ayudante) | 🟢 Completada | **100%** | Finalizada |
| **Fase 4** | Portal del Pasajero B2C, Catálogo en BD, WebSocket Realtime y Responsive | 🟢 Completada | **100%** | Finalizada |
| **Fase 5** | Taquilla Física (POS) y Validación de Abordaje QR en Puerta | 🟢 Completada | **100%** | Finalizada |
| **Fase 6** | Control Financiero, Gastos, Combustible y Cierres (Arqueos) | 🟢 Completada | **100%** | Finalizada |
| **Fase 7** | Pasarela de Pagos y Notificaciones Transaccionales | 🟢 Completada | **100%** | Finalizada |
| **Fase 8** | Métricas Gerenciales en Vivo, Auditoría, Aislamiento y Producción | 🟢 En progreso | **90%** | Prioridad Final |

---

## 2. To Do Priorizado y Detallado

### Fase 4 y 7: Flujo de Compra B2C y Notificaciones (Completada al 100%)
- [x] **TODO-4.2: WebSocket Global y Bloqueo Temporal de Asientos con TTL (10 Minutos)**
  - [x] Conexión en tiempo real con Pusher Channels / Soketi WebSocket suscrito al canal del viaje `trip-{idViaje}`.
  - [x] Helper de servidor en [src/backend/lib/realtime.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/lib/realtime.ts) para emisión de eventos `seat:updated`, `seats:batch` y `trip:occupancy`.
  - [x] Server actions en [src/backend/actions/asientos-realtime.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/asientos-realtime.ts) para bloqueo concurrente (`bloquearAsientoTemporalAction`), liberación (`liberarAsientoTemporalAction`) y notificación de compra completada (`notificarCompraAsientoRealtimeAction`).
  - [x] Hook de frontend en [src/frontend/hooks/useSeatRealtime.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/frontend/hooks/useSeatRealtime.ts) con temporizador visual TTL (10 min) y actualización reactiva sin refrescar la página.
  - [x] Interfaz interactiva de compra en [src/app/(app)/compra/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/compra/page.tsx) con badge de conexión (`Sincronización en vivo`), indicador de cuenta regresiva y estados visuales (Disponible, Tu selección, En proceso por otro usuario, y Ocupado).
- [x] **TODO-4.3: Checkout Transaccional y Emisión Automática Post-Pago**
  - [x] Transacción atómica que confirme la compra en `ventas` y `boletos` con código alfanumérico único (`BOLETO-${idBoleto}`) y actualización a `OCUPADO` en PostgreSQL ([src/backend/actions/ventas.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/ventas.ts)).
  - [x] Notificación inmediata en Pusher a todos los clientes concurrentes de la ocupación definitiva de los asientos.
  - [x] Modal de éxito con resumen de compra, desglose de asientos y botón directo a la bóveda de boletos (`/tickets`).
  - [x] Visualizador de boleto con código QR para abordaje en [src/app/(app)/tickets/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/tickets/page.tsx).

---

### Fase 5: Taquilla de Terminal POS (Completada al 100%)
- [x] **TODO-5.1: Punto de Venta para Taquilla ([src/app/dashboard/pos/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/pos/page.tsx))**
  - [x] Server actions operativas en [src/backend/actions/taquilla.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/taquilla.ts) con consultas de salidas activas, disponibilidad en vivo y venta directa con `VENTANILLA_TERMINAL`.
  - [x] Interfaz táctil de ventanilla: selección rápida de salida activa del día, croquis interactivo de la unidad, selector de equipaje adicional (+ C$ 50).
  - [x] Teclado de denominaciones rápidas (Exacto, C$ 1000, C$ 500, C$ 200, C$ 100, C$ 50) y cálculo instantáneo del cambio/vuelto.
  - [x] Modal de voucher térmico (58mm / 80mm) con código QR, datos del trayecto, desglose de tarifa y disparador directo `window.print()`.

---

### Fase 6: Control Financiero, Combustible y Cierres de Turno (Completada al 100%)
- [x] **TODO-6.1: Registro de Combustible y Gastos Operativos ([src/app/dashboard/gastos/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/gastos/page.tsx))**
  - [x] Server actions en [src/backend/actions/gastos.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/gastos.ts) con registro atómico de `Gasto` y `AbastecimientoGasolina` (galones, precio por galón, cálculo de importe).
  - [x] Formulario modal de captura rápida: combustible, peajes, viáticos, mantenimiento de flota y otros gastos.
  - [x] Tarjetas métricas KPI de gastos totales, galonaje diesel y costos de mantenimiento.
- [x] **TODO-6.2: Arqueo Diario y Cuadre de Caja ([src/app/dashboard/cierres/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/cierres/page.tsx))**
  - [x] Server actions en [src/backend/actions/cierres.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/cierres.ts) con balance en tiempo real: Total recaudado en boletos (+) menos gastos autorizados (-) = Monto esperado en caja (=).
  - [x] Semáforo de cuadre en vivo: detección automática de cuadre exacto (verde), faltante (rojo) o sobrante (ámbar).
  - [x] Cierre y firma formal de jornada con vinculación automática de gastos del día en la tabla `cierres_jornada`.
  - [x] Historial auditable de cierres de caja con detalle por cajero y fecha.

---

### Prioridad Final: Hardening, Auditoría y Producción (Fase 8)
- [ ] **TODO-8.1: Hardening de Índices y Consultas de Alta Concurrencia**
  - [ ] Verificación de índices compuestos en tablas de alta concurrencia (`boletos`, `asientos`, `viajes`).
- [ ] **TODO-8.2: Verificación de Builds y Tipado Estricto Continuo**
  - [x] Validación con `tsc --noEmit` completada sin errores de compilación (0 errores de tipado).
  - [ ] Validación periódica de builds de producción en Vercel.

---

### Prioridad 5: Hardening, Auditoría y Producción (Fase 8)
- [ ] **TODO-8.1: Hardening de Índices y Consultas de Alta Concurrencia**
  - [ ] Verificación de índices compuestos en tablas de alta concurrencia (`boletos`, `asientos`, `viajes`).
- [ ] **TODO-8.2: Verificación de Builds y Tipado Estricto Continuo**
  - [x] Validación con `tsc --noEmit` completada sin errores de compilación (0 errores de tipado).
  - [ ] Validación periódica de builds de producción en Vercel.

---

## 3. Lo que ya está 100% Completado y Verificado

### A. Operación de Viajes y Tripulación (Recientemente Integrado desde rama `steven`)
- [x] **Gestión de Jornada Operativa para Ayudantes y Choferes ([src/app/dashboard/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/page.tsx)):** Panel exclusivo para roles `AYUDANTE` y `CHOFER` que muestra la unidad asignada (número y placa), sentido de viaje (`IDA` / `RETORNO`), estado en tiempo real y progreso de estaciones.
- [x] **Seguimiento Táctil de Paradas en Tiempo Real:** Botones interactivos por estación de la ruta que registran el paso del bus en la tabla `controles_viaje` mediante `actualizarParadaActualAction`.
- [x] **Cierre Automático Transaccional de Viaje en Destino ([src/backend/actions/viajes.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/viajes.ts)):** Al tocar la última parada del trayecto, el sistema automáticamente:
  - Cambia el viaje a `FINALIZADO` y sella la hora real de llegada (`hrLlegadaReal`).
  - Finaliza el despacho (`despacho.estado = FINALIZADO`).
  - Finaliza la asignación de tripulación (`asignacionUnidad.estado = FINALIZADA` con `fechaHFin`).
  - Libera la unidad volviéndola a `DISPONIBLE`.
  - Libera todos los asientos ocupados a `DISPONIBLE`.
  - Bloquea la interfaz táctil con la insignia "Viaje concluido".
- [x] **Server Actions de Programación, Asignación y Despacho ([src/backend/actions/viajes.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/viajes.ts)):**
  - `createViaje`: Creación de itinerarios con sentido y fecha/hora programada.
  - `createAsignacionUnidad`: Asignación multi-tripulación (Chofer + Ayudante/Cobrador) vinculada a la unidad.
  - `despacharViaje`: Despacho operativo que crea registro en `despacho` y coloca el viaje en `EN_CURSO`.
  - `finalizarViaje`: Cierre manual administrativo con liberación de flota y asientos.
  - `getChoferesByCooperativa` y `getAyudantesByCooperativa`: Filtros de tripulación activa por cooperativa.
  - `getViajesByCooperativa`: Consulta de viajes con tripulación completa mapeada.
- [x] **Catálogo Dinámico de Viajes Disponibles para Pasajeros ([src/backend/actions/viajes.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/viajes.ts)):** `getViajesDisponiblesAction` con filtros de origen/destino/fecha, cálculo en vivo de ocupación según boletos vendidos y tarifas por tramo.
- [x] **Semilla Maestra de Datos y Pruebas Operativas ([prisma/seed.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/prisma/seed.ts)):**
  - Cuentas de prueba para todos los roles con hashing bcrypt (`superadmin`, `admin_coop`, `taquilla_uca`, `chofer_carlos`, `ayudante_juan`, `pasajero_demo`).
  - Ruta Managua UCA - Juigalpa con 5 puntos secuenciales y tarifas intermedias.
  - Turno, asignación y despacho activo listos para pruebas inmediatas con `juan.ayudante@cootranstel.com`.

### B. Core del Sistema, Seguridad y Multi-Tenant
- [x] **Base de Datos Relacional Completa:** 19 modelos relacionales y 13 enums en PostgreSQL Neon con Prisma 7.
- [x] **Siembra de Catálogos Maestros:** Roles, tipos de venta, tipos de unidad, tarifas de equipaje y cooperativa piloto ("COOTRANSTEL R.L.").
- [x] **Autenticación y Sesiones Seguras:** Hashing bcrypt coste 12, JWT firmado con `jose` y cookies HttpOnly seguras.
- [x] **Acceso con Huella Digital y Biometría (WebAuthn / Passkeys):** Registro y validación biométrica con sensores locales (Windows Hello, Touch ID, sensor de huella móvil) respaldado por token criptográfico de dispositivo ([src/frontend/lib/biometrics.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/frontend/lib/biometrics.ts)).
- [x] **Acceso Rápido con Google OAuth:** Inicio de sesión instantáneo con cuenta de Google y creación automática de cuenta de pasajero ([src/backend/actions/auth.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/auth.ts)).
- [x] **Gestión Centralizada de Usuarios Multi-Tenant ([src/app/dashboard/usuarios/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/usuarios/page.tsx)):** Super Admin puede crear y asignar a cualquier cooperativa o global; administradores de cooperativa crean usuarios restringidos estrictamente a su tenant.
- [x] **Aislamiento Estricto y Middleware RBAC ([src/middleware.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/middleware.ts)):** Portal de pasajeros exclusivo para `PASAJERO`. `CHOFER` y `AYUDANTE` con acceso al dashboard operativo. Administradores restringidos a su cooperativa.
- [x] **Sidebar Adaptativo por Rol ([src/app/dashboard/layout.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/layout.tsx)):** Insignias y menús dinámicos según el rol validado (`Ayudante`, `Admin`, `Super Admin`).
- [x] **Insignia con Icono de Bus en Perfiles:** Distintivo visual (`mdiBus`) visible en avatar y barra superior para roles operativos ([src/frontend/components/ui/UserChip.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/frontend/components/ui/UserChip.tsx)).

### C. Módulos Administrativos y Portales
- [x] **Terminal Operativa y Validación de Boletos QR ([src/app/validar-boleto/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/validar-boleto/page.tsx)):** Escaneo QR con cámara, validación manual de boletos, cambio atómico a estado `ABORDADO`, prevención de duplicados y manifiesto en vivo con botón de abordaje rápido.
- [x] **Endpoints Operativos de Boletos ([src/backend/actions/boletos.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/boletos.ts)):** `validarBoletoAction` (con control multi-tenant), `getManifiestoViajeAction` y `getMisBoletosAction`.
- [x] **Ocultación de Métrica de Pasajeros por Rol ([src/backend/actions/ventas.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/ventas.ts)):** Conteo de pasajeros visible únicamente para el Super Admin; administradores de cooperativa ven 3 tarjetas operativas de su cooperativa.
- [x] **Skeletons Animados en Carga de Base de Datos:** Integrados en `/trips`, `/tickets`, `/home`, `/validar-boleto`, `/dashboard` y `/dashboard/usuarios`.
- [x] **Verificación de Correo en Registro y Recuperación de Contraseña:** Códigos OTP de 6 dígitos con caducidad de 15 minutos vía Gmail SMTP con aviso de carpeta de spam.
- [x] **Módulo de Cooperativas para Super Admin ([src/app/dashboard/cooperativas/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/cooperativas/page.tsx)):** Aprobación y rechazo de cooperativas solicitadas con asignación automática de tenant.
- [x] **Módulo de Flota de Unidades ([src/app/dashboard/flota/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/flota/page.tsx)):** Generación de croquis interactivo de asientos según carrocería y capacidad.
- [x] **Constructor de Rutas y Matriz Tarifaria ([src/app/dashboard/rutas/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/rutas/page.tsx)):** Secuenciación de paradas, modalidades de servicio dinámicas y cálculo tarifario por tramo.
- [x] **Directorio de Personal Operativo ([src/app/dashboard/choferes/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/choferes/page.tsx)):** Gestión de choferes y ayudantes por cooperativa.
- [x] **Módulo de Perfil con Biometría ([src/app/(app)/profile/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/profile/page.tsx)):** Carga y compresión WebP, cambio de contraseña y vinculación biométrica de este dispositivo.
- [x] **Optimización Responsive Móvil en Perfil y Ajustes:** Pestañas horizontales fluidas con swipe/scroll suave (`no-scrollbar`) en [src/app/(app)/settings/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/settings/page.tsx) y [src/app/(app)/profile/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/profile/page.tsx), impidiendo que se corten "Métodos de Pago" y "Datos Biométricos".
- [x] **Multidivisa Oficial (NIO / USD):** Contexto global de divisa con tasa oficial del Banco Central de Nicaragua.
- [x] **Tipado Estricto TypeScript:** Validación total con `tsc --noEmit` con 0 errores de compilación.
