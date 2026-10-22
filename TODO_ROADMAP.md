# Roadmap y Lista de Tareas Pendientes (To Do) - InterlocApp

> **Proyecto:** InterlocApp (RutaCorp)  
> **Estado General:** Fases 1, 2 y 3 Completadas (100%) | Portal B2C Casi Completo (98%) | WebSocket Realtime Asientos: Completado (100%) | Siguiente Enfoque: Checkout Transaccional B2C  
> **Fecha de Actualización:** Octubre, 2026  
> **Documento de Referencia:** [PLAN_IMPLEMENTACION.md](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/PLAN_IMPLEMENTACION.md)  

---

## 1. Resumen de Estado Global por Fases

| Fase | Título del Módulo | Estado | Progreso Estimado | Prioridad de Acción |
| :---: | :--- | :---: | :---: | :---: |
| **Fase 1** | Inicialización, Seguridad, Biometría, Google OAuth y Multi-Tenant | 🟢 Completada | **100%** | Finalizada |
| **Fase 2** | Backoffice Administrativo (Flota, Asientos, Rutas, Personal y Cooperativas) | 🟢 Completada | **100%** | Finalizada |
| **Fase 3** | Programación de Salidas, Despacho y Operación de Viaje (Chofer / Ayudante) | 🟢 Completada | **100%** | Finalizada |
| **Fase 4** | Portal del Pasajero B2C, Catálogo en BD, WebSocket Realtime y Responsive | 🟢 En progreso | **98%** | **Prioridad 1** |
| **Fase 5** | Taquilla Física (POS) y Validación de Abordaje QR en Puerta | 🟡 En progreso | **65%** (Validación QR y Roles Operativos Listos) | **Prioridad 2** |
| **Fase 6** | Control Financiero, Gastos, Combustible y Cierres (Arqueos) | ⏳ Pendiente | **0%** | **Prioridad 3** |
| **Fase 7** | Pasarela de Pagos y Notificaciones Transaccionales | 🟡 En progreso | **65%** | **Prioridad 1 (Checkout)** |
| **Fase 8** | Métricas Gerenciales en Vivo, Auditoría, Aislamiento y Producción | 🟢 En progreso | **85%** | **Prioridad 4** |

---

## 2. To Do Priorizado y Detallado

### Prioridad 1: Cierre del Flujo de Compra B2C (Fases 4 y 7)
> **Impacto:** Alto. Catálogo público conectado a PostgreSQL, sincronización global de asientos en tiempo real vía WebSocket y bloqueo temporal implementados. Resta confirmar la transacción atómica final en checkout.

- [x] **TODO-4.2: WebSocket Global y Bloqueo Temporal de Asientos con TTL (10 Minutos)**
  - [x] Conexión en tiempo real con Pusher Channels / Soketi WebSocket suscrito al canal del viaje `trip-{idViaje}`.
  - [x] Helper de servidor en [src/backend/lib/realtime.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/lib/realtime.ts) para emisión de eventos `seat:updated`, `seats:batch` y `trip:occupancy`.
  - [x] Server actions en [src/backend/actions/asientos-realtime.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/asientos-realtime.ts) para bloqueo concurrente (`bloquearAsientoTemporalAction`), liberación (`liberarAsientoTemporalAction`) y notificación de compra completada (`notificarCompraAsientoRealtimeAction`).
  - [x] Hook de frontend en [src/frontend/hooks/useSeatRealtime.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/frontend/hooks/useSeatRealtime.ts) con temporizador visual TTL (10 min) y actualización reactiva sin refrescar la página.
  - [x] Interfaz interactiva de compra en [src/app/(app)/compra/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/compra/page.tsx) con badge de conexión (`🟢 Sincronización en vivo`), indicador de cuenta regresiva y estados visuales (Disponible, Tu selección, En proceso por otro usuario con candado pulsante, y Ocupado).
- [ ] **TODO-4.3: Checkout y Emisión Automática Post-Pago**
  - [ ] Transacción atómica que confirme la compra en `ventas` y `boletos` con firma criptográfica HMAC y código alfanumérico único.
  - [ ] Generación automática y envío del boleto con código QR al correo del pasajero vía Nodemailer (`sendTicketEmail`).

---

### Fase 3: Programación de Salidas y Monitoreo de Despacho (Completada al 100%)
- [x] **TODO-3.1: Monitor de Salidas y Despacho en Dashboard ([src/app/dashboard/viajes/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/viajes/page.tsx))**
  - [x] Server actions de programación, asignación multi-tripulación y despacho creados en [src/backend/actions/viajes.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/viajes.ts).
  - [x] Tablero interactivo de salidas del día agrupadas por estado: *Programadas*, *En Ruta*, *Finalizadas* y *Canceladas* con tarjetas KPI de métricas en vivo.
  - [x] Modal administrativo de programación de salida: selección de ruta, fecha, hora estimada y sentido (Ida/Retorno).
  - [x] Modal de autorización de despacho:
    - Selector de autobús (filtrando unidades en estado `DISPONIBLE`).
    - Asignación de tripulación (Chofer principal y Ayudante/Cobrador disponibles).
    - Despacho administrativo que cambia la unidad a `EN_RUTA` y el viaje a `EN_CURSO`.
  - [x] Modal de Manifiesto de Pasajeros por salida con detalle de asiento y estado de abordaje.
- [x] **TODO-3.3: Bitácora de Incidentes y Paradas en Ruta**
  - [x] Marcado interactivo de paradas intermedias por la tripulación conectada a `controles_viaje` ([src/app/dashboard/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/page.tsx)).
  - [x] Cierre automático transaccional del viaje al marcar el destino final con liberación de unidad y asientos.

---



### Prioridad 3: Taquilla de Terminal POS (Fase 5)
> **Impacto:** Medio-Alto. Venta física presencial en ventanilla de terminal.

- [ ] **TODO-5.1: Punto de Venta para Taquilla ([src/app/dashboard/pos/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/pos/page.tsx))**
  - [ ] Interfaz táctil de venta rápida en ventanilla: elegir salida -> marcar asiento -> ingresar efectivo en Córdobas -> cálculo de cambio/vuelto.
  - [ ] Impresión térmica rápida de recibos con código QR para impresoras de 58mm y 80mm.

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
