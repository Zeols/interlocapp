# Roadmap y Lista de Tareas Pendientes (To Do) - InterlocApp

> **Proyecto:** InterlocApp (RutaCorp)  
> **Estado General:** Fases 1 y 2 Completadas (100%) | Fase 3 Operación y Validación Avanzada (75%) | Portal B2C Casi Completo (90%) | Taquilla POS / Cierres Siguiente Enfoque  
> **Fecha de Actualización:** Octubre, 2026  
> **Documento de Referencia:** [PLAN_IMPLEMENTACION.md](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/PLAN_IMPLEMENTACION.md)  

---

## 1. Resumen de Estado Global por Fases

| Fase | Título del Módulo | Estado | Progreso Estimado | Prioridad de Acción |
| :---: | :--- | :---: | :---: | :---: |
| **Fase 1** | Inicialización, Seguridad, Biometría, Google OAuth y Multi-Tenant | 🟢 Completada | **100%** | Finalizada |
| **Fase 2** | Backoffice Administrativo (Flota, Asientos, Rutas, Personal y Cooperativas) | 🟢 Completada | **100%** | Finalizada |
| **Fase 3** | Programación de Salidas, Despacho y Operación de Viaje (Chofer / Ayudante) | 🟢 En progreso | **75%** (Terminal y QR Listos) | **Prioridad 1** |
| **Fase 4** | Portal del Pasajero B2C, Croquis, Skeletons y "Mis Boletos" en BD | 🟢 En progreso | **90%** | **Prioridad 2** |
| **Fase 5** | Taquilla Física (POS) y Validación de Abordaje QR en Puerta | 🟡 En progreso | **60%** (Validación QR Lista) | **Prioridad 3** |
| **Fase 6** | Control Financiero, Gastos, Combustible y Cierres (Arqueos) | ⏳ Pendiente | **0%** | **Prioridad 4** |
| **Fase 7** | Pasarela de Pagos y Notificaciones Transaccionales | 🟡 En progreso | **65%** | **Prioridad 2 (Checkout)** |
| **Fase 8** | Métricas Gerenciales en Vivo, Auditoría, Aislamiento y Producción | 🟢 En progreso | **85%** | **Prioridad 5** |

---

## 2. To Do Priorizado y Detallado

### Prioridad 1: Programación de Salidas y Monitoreo de Despacho (Fase 3)
> **Impacto:** Conecta la flota, rutas y tripulación con los itinerarios diarios que compran los pasajeros y la operación centralizada.

- [ ] **TODO-3.1: Monitor de Salidas y Despacho en Dashboard ([src/app/dashboard/viajes/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/viajes/page.tsx))**
  - [ ] Tablero de salidas del día agrupadas por estado: *Programadas*, *En Ruta* y *Finalizadas*.
  - [ ] Modal de programación de salida: selección de ruta, fecha, hora estimada y sentido (Ida/Vuelta).
  - [ ] Modal de autorización de despacho:
    - Selector de autobús (filtrando unidades en estado `DISPONIBLE`).
    - Asignación de tripulación (Chofer principal y Ayudante/Cobrador disponibles).
    - Despacho administrativo que cambia la unidad a `EN_RUTA` y el viaje a `EN_CURSO`.
- [ ] **TODO-3.3: Bitácora de Incidentes y Paradas en Ruta**
  - [ ] Registro rápido de averías mecánicas, accidentes o retrasos con cambio de unidad a `MANTENIMIENTO` si amerita.
  - [ ] Marcado de checkpoints en paradas intermedias para informar tiempos estimados a los pasajeros.

---

### Prioridad 2: Cierre del Flujo de Compra B2C (Fases 4 y 7)
> **Impacto:** Alto. Catálogo de viajes y bóveda de boletos conectados con PostgreSQL; resta formalizar el bloqueo temporal de asientos.

- [ ] **TODO-4.2: Bloqueo Temporal de Asientos con TTL (10 Minutos)**
  - [ ] Al seleccionar un asiento en [src/app/(app)/compra/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/compra/page.tsx), apartarlo temporalmente en base de datos para prevenir sobreventa concurrente.
  - [ ] Liberación automática si el temporizador llega a cero sin concretar el pago.
- [ ] **TODO-4.3: Checkout y Emisión Automática Post-Pago**
  - [ ] Transacción atómica que confirme la compra en `ventas` y `boletos` con firma criptográfica HMAC y código alfanumérico único.
  - [ ] Generación automática y envío del boleto con código QR al correo del pasajero vía Nodemailer (`sendTicketEmail`).

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
  - [ ] Validación periódica con `npx tsc --noEmit` y `pnpm run build`.

---

## 3. Lo que ya está 100% Completado y Verificado

- [x] **Base de Datos Relacional Completa:** 19 modelos relacionales y 13 enums en PostgreSQL Neon con Prisma 7.
- [x] **Siembra de Catálogos Maestros:** Roles, tipos de venta, tipos de unidad, tarifas de equipaje y cooperativa piloto ("COOTRANSTEL R.L.").
- [x] **Autenticación y Sesiones Seguras:** Hashing bcrypt coste 12, JWT firmado con `jose` y cookies HttpOnly seguras.
- [x] **Acceso con Huella Digital y Biometría (WebAuthn / Passkeys):** Registro y validación biométrica con sensores locales (Windows Hello, Touch ID, sensor de huella móvil) respaldado por token criptográfico de dispositivo ([src/frontend/lib/biometrics.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/frontend/lib/biometrics.ts)).
- [x] **Acceso Rápido con Google OAuth:** Inicio de sesión instantáneo con cuenta de Google y creación automática de cuenta de pasajero ([src/backend/actions/auth.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/auth.ts)).
- [x] **Gestión Centralizada de Usuarios Multi-Tenant ([src/app/dashboard/usuarios/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/usuarios/page.tsx)):** Super Admin puede crear y asignar a cualquier cooperativa o global; administradores de cooperativa crean usuarios restringidos estrictamente a su tenant.
- [x] **Aislamiento Estricto y Middleware RBAC ([src/middleware.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/middleware.ts)):** Portal de pasajeros (`/home`, `/trips`, `/tickets`, `/compra`) exclusivo para `PASAJERO`. Choferes y Ayudantes redirigidos a terminal operativa `/validar-boleto`. Administradores redirigidos a `/dashboard`.
- [x] **Insignia con Icono de Bus en Perfiles:** Distintivo visual (`mdiBus`) visible en avatar y barra superior para `CHOFER`, `AYUDANTE` y `TAQUILLERO` ([src/frontend/components/ui/UserChip.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/frontend/components/ui/UserChip.tsx)).
- [x] **Terminal Operativa y Validación de Boletos QR ([src/app/validar-boleto/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/validar-boleto/page.tsx)):** Escaneo QR con cámara, validación manual de boletos, cambio atómico a estado `ABORDADO`, prevención de duplicados y manifiesto en vivo con botón de abordaje rápido.
- [x] **Endpoints Operativos de Boletos ([src/backend/actions/boletos.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/boletos.ts)):** `validarBoletoAction` (con control multi-tenant), `getManifiestoViajeAction` y `getMisBoletosAction`.
- [x] **Ocultación de Métrica de Pasajeros por Rol ([src/backend/actions/ventas.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/ventas.ts)):** Conteo de pasajeros visible únicamente para el Super Admin; administradores de cooperativa ven 3 tarjetas operativas de su cooperativa.
- [x] **Skeletons Animados en Carga de Base de Datos:** Integrados en `/trips`, `/tickets`, `/home`, `/validar-boleto`, `/dashboard` y `/dashboard/usuarios`.
- [x] **Aviso de Carpeta de Spam:** Banner informativo en el formulario de verificación OTP ([src/app/(auth)/signup/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(auth)/signup/page.tsx)).
- [x] **Verificación de Correo en Registro y Recuperación de Contraseña:** Códigos OTP de 6 dígitos con caducidad de 15 minutos vía Gmail SMTP.
- [x] **Módulo de Cooperativas para Super Admin ([src/app/dashboard/cooperativas/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/cooperativas/page.tsx)):** Aprobación y rechazo de cooperativas solicitadas con asignación automática de tenant.
- [x] **Módulo de Flota de Unidades ([src/app/dashboard/flota/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/flota/page.tsx)):** Generación de croquis interactivo de asientos según carrocería y capacidad.
- [x] **Constructor de Rutas y Matriz Tarifaria ([src/app/dashboard/rutas/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/rutas/page.tsx)):** Secuenciación de paradas y cálculo tarifario por tramo.
- [x] **Directorio de Personal Operativo ([src/app/dashboard/choferes/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/choferes/page.tsx)):** Gestión de choferes y ayudantes por cooperativa.
- [x] **Módulo de Perfil con Biometría ([src/app/(app)/profile/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/profile/page.tsx)):** Carga y compresión WebP, cambio de contraseña y vinculación de huella digital de este equipo.
- [x] **Multidivisa Oficial (NIO / USD):** Contexto global de divisa con tasa oficial del Banco Central de Nicaragua.
- [x] **Tipado Estricto TypeScript:** Validación total con `tsc --noEmit` con 0 errores de compilación.

