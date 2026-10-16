# Roadmap y Lista de Tareas Pendientes (To Do) - InterlocApp

> **Proyecto:** InterlocApp (RutaCorp)  
> **Estado General:** Fase 1 Completada (100%) | Fase 2 Backend Listo (65%) | Portal B2C Avanzado (80%)  
> **Fecha de Actualización:** Octubre, 2026  
> **Documento de Referencia:** [PLAN_IMPLEMENTACION.md](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/PLAN_IMPLEMENTACION.md)  

---

## 1. Resumen de Estado Global por Fases

| Fase | Título del Módulo | Estado | Progreso Estimado | Prioridad de Acción |
| :---: | :--- | :---: | :---: | :---: |
| **Fase 1** | Inicialización, Seguridad, Autenticación y Multi-Tenant | 🟢 Completada | **100%** | Finalizada |
| **Fase 2** | Backoffice Administrativo (Flota, Asientos, Rutas y Personal) | 🟢 Completada | **100%** | Finalizada |
| **Fase 3** | Programación de Salidas, Despacho y Monitoreo | 🟡 En progreso | **40%** | **Prioridad 1** |
| **Fase 4** | Portal del Pasajero B2C, Croquis y "Mis Boletos" | 🟡 En progreso | **80%** | **Prioridad 2** |
| **Fase 5** | Taquilla Física (POS) y Escáner Móvil de Abordaje | ⏳ Pendiente | **0%** | **Prioridad 3** |
| **Fase 6** | Control Financiero, Gastos, Combustible y Cierres (Arqueos) | ⏳ Pendiente | **0%** | **Prioridad 4** |
| **Fase 7** | Pasarela de Pagos y Notificaciones Transaccionales | 🟡 Parcial (Correo listo) | **35%** | **Prioridad 2 (Checkout)** |
| **Fase 8** | Métricas Gerenciales en Vivo, Auditoría y Producción | 🟡 En progreso | **30%** | **Prioridad 5** |

---

## 2. To Do Priorizado y Detallado

### Backoffice Administrativo (Fase 2) - Completada
> **Impacto:** Crítico. Las pantallas del Dashboard para gestión de flota con croquis interactivo, constructor de rutas con tarifas por tramo y directorio de colaboradores ya se encuentran conectadas y verificadas con PostgreSQL.

- [x] **TODO-2.1: Módulo de Flota de Unidades ([src/app/dashboard/flota/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/flota/page.tsx))**
  - [x] Tabla interactiva de autobuses con badges de estado operativo (`DISPONIBLE`, `EN_RUTA`, `MANTENIMIENTO`, `INOPERATIVA`), número de unidad, placa y tipo.
  - [x] Modal interactivo "Registrar Nueva Unidad":
    - Selector visual de carrocería (Microbús 15, Interlocal 20, Pullman 40).
    - Previsualización gráfica en vivo del croquis de asientos a generarse.
    - Conexión con Server Action `createUnidadWithAsientos` en [src/backend/actions/unidades.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/unidades.ts).
  - [x] Acción para cambiar estado operativo o dar de baja una unidad con confirmación.
  - [x] Modal de visualización del croquis de asientos con estado disponible/ocupado.

- [x] **TODO-2.2: Constructor de Rutas y Matriz Tarifaria ([src/app/dashboard/rutas/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/rutas/page.tsx))**
  - [x] Lista interactiva para definir y secuenciar paradas intermedias de un trayecto (ej. Managua UCA -> Tipitapa -> Empalme Boaco -> Juigalpa).
  - [x] Matriz de tarifas por tramo en Córdobas (C$) con validación de precios positivos.
  - [x] Conexión con Server Action `createRutaConPuntosYTarifas` en [src/backend/actions/rutas.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/rutas.ts).
  - [x] Modal visor de la matriz tarifaria completa por pares de estaciones.

- [x] **TODO-2.3: Directorio de Personal Operativo ([src/app/dashboard/choferes/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/choferes/page.tsx))**
  - [x] Catálogo de choferes y ayudantes de la cooperativa con avatar, teléfono de contacto y estado de asignación en ruta.
  - [x] Modal rápido para dar de alta nuevo personal operativo con su rol (`CHOFER`, `AYUDANTE`) y credenciales de acceso vinculadas a la cooperativa.
  - [x] Conexión con Server Action `createOperarioAction` en [src/backend/actions/usuarios.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/usuarios.ts).
  - [x] Cambio de estado de cuenta (`ACTIVO`, `INACTIVO`, `BLOQUEADO`) y retiro de personal con confirmación.

---

### Prioridad 2: Programación de Salidas y Despacho a Carretera (Fase 3)
> **Impacto:** Alto. Conecta la flota y las rutas con los itinerarios diarios que compran los pasajeros.

- [ ] **TODO-3.1: Monitor de Salidas y Despacho ([src/app/dashboard/viajes/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/viajes/page.tsx))**
  - [ ] Tablero de salidas del día clasificadas en columnas: Programadas, En Ruta y Finalizadas.
  - [ ] Modal de programación de salida: selección de ruta, fecha, hora estimada y sentido (Ida/Vuelta).
  - [ ] Modal de autorización de despacho:
    - Selector de microbús físico (filtrando solo unidades disponibles).
    - Selector de chofer disponible.
    - Confirmación atómica que cambia el viaje a `EN_CURSO` y la unidad a `EN_RUTA`.
- [ ] **TODO-3.2: Finalización de Viaje y Liberación de Flota**
  - [ ] Botón de cierre de viaje al llegar a la terminal destino, registrando hora de llegada real y liberando la unidad a estado `DISPONIBLE`.
- [ ] **TODO-3.3: Bitácora de Incidentes en Ruta**
  - [ ] Registro de averías mecánicas, accidentes o retrasos con cambio automático de la unidad a `MANTENIMIENTO` si amerita.

---

### Prioridad 3: Flujo Transaccional Completo del Pasajero B2C (Fases 4 y 7)
> **Impacto:** Alto. El diseño del portal de pasajeros está casi completo; falta la integración real con la base de datos y la emisión del boleto digital.

- [ ] **TODO-4.1: Conexión de Búsqueda y Catálogo de Viajes**
  - [ ] Conectar el buscador de [src/app/(app)/home/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/home/page.tsx) con [src/app/(app)/trips/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/trips/page.tsx) para consultar salidas reales programadas en PostgreSQL.
- [ ] **TODO-4.2: Bloqueo Temporal de Asientos con TTL (10 Minutos)**
  - [ ] Al seleccionar un asiento en [src/app/(app)/compra/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/compra/page.tsx), apartarlo en la base de datos con expiración para prevenir sobreventa concurrente.
  - [ ] Liberar automáticamente el asiento si el temporizador de 10:00 minutos llega a cero sin concretar el pago.
- [ ] **TODO-4.3: Checkout y Emisión de Boleto Digital**
  - [ ] Confirmación de compra que cree la transacción en `ventas` y `boletos` con firma criptográfica HMAC y código único alfanumérico.
  - [ ] Enviar automáticamente el comprobante digital al correo del usuario vía Nodemailer (`sendTicketEmail`).
  - [ ] Visualización inmediata del boleto activo con código QR expandible en [src/app/(app)/tickets/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/tickets/page.tsx).

---

### Prioridad 4: Taquilla de Terminal (POS) y Escáner Móvil QR (Fase 5)
> **Impacto:** Medio-Alto. Permite la venta presencial de ventanilla y el control de acceso en puerta de autobús.

- [ ] **TODO-5.1: Punto de Venta para Taquilla ([src/app/dashboard/pos/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/pos/page.tsx))**
  - [ ] Interfaz táctil de venta rápida: elegir salida inmediata -> marcar asiento -> digitar efectivo -> calcular cambio/vuelto en Córdobas.
  - [ ] Plantilla CSS `@media print` optimizada para impresoras térmicas de recibos de 58mm y 80mm.
- [ ] **TODO-5.2: Lector de Abordaje Móvil ([src/app/(operaciones)/validar-boleto/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(operaciones)/validar-boleto/page.tsx))**
  - [ ] Escáner con cámara trasera del smartphone usando `html5-qrcode`.
  - [ ] Validación atómica: marca el boleto como `ABORDADO` y emite alerta si el boleto ya fue usado o no corresponde al viaje.
  - [ ] Contador en vivo de pasajeros abordados vs capacidad de la unidad (ej. 14 / 20 abordados).

---

### Prioridad 5: Control Financiero, Combustible y Cierres de Turno (Fase 6)
> **Impacto:** Medio. Liquidación contable y transparencia de ingresos frente a egresos.

- [ ] **TODO-6.1: Registro de Combustible y Gastos ([src/app/dashboard/gastos/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/gastos/page.tsx))**
  - [ ] Formulario de captura rápida de combustible: galones, precio por galón, cálculo automático de importe total y registro de comprobante.
  - [ ] Registro de peajes y viáticos de carretera imputados a la unidad o turno.
- [ ] **TODO-6.2: Arqueo Diario y Cuadre de Caja ([src/app/dashboard/cierres/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/cierres/page.tsx))**
  - [ ] Agregación matemática: Total recaudado en boletos y equipajes menos gastos autorizados de combustible y viáticos.
  - [ ] Comparativa contra el efectivo físico entregado con semáforo de cuadre (verde: exacto, rojo: faltante, azul: sobrante).

---

### Prioridad 6: Métricas Gerenciales en Vivo y Hardening (Fase 8)
> **Impacto:** Finalización y analítica ejecutiva.

- [ ] **TODO-8.1: Conexión de KPIs en Vivo en el Dashboard ([src/app/dashboard/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/dashboard/page.tsx))**
  - [ ] Sustituir datos estáticos por agregaciones de PostgreSQL: total de ventas del día en C$, boletos vendidos, porcentaje de ocupación promedio de la flota y unidades en ruta.
- [ ] **TODO-8.2: Hardening y Optimización de Consultas**
  - [ ] Verificación de índices compuestos en tablas de alta concurrencia (`boletos`, `asientos`, `viajes`).
  - [ ] Verificación de builds y validación de tipado estricto `pnpm exec tsc --noEmit`.

---

## 3. Lo que ya está 100% Completado y Blindado

- [x] **Base de Datos Relacional Completa:** 19 modelos relacionales y 13 enums en PostgreSQL Neon con Prisma 7.
- [x] **Siembra de Catálogos Maestros:** Roles, tipos de venta, tipos de unidad y cooperativa piloto ("COOTRANSTEL R.L.").
- [x] **Autenticación y Sesiones Seguras:** Hashing bcrypt coste 12, JWT y cookies HttpOnly seguras.
- [x] **Verificación de Correo en Registro:** Generación y validación de código OTP de 6 dígitos con caducidad de 15 minutos vía Gmail SMTP.
- [x] **Recuperación de Contraseña por Código Único:** Flujo en 4 pasos con código de seguridad y reseteo en base de datos.
- [x] **Seguridad Multi-Tenant:** Aislamiento de datos con `getCurrentTenant()` y middleware perimetral RBAC.
- [x] **Servicio de Correos Transaccionales:** Configurado con Nodemailer, validado y con plantillas de correo con identidad visual InterlocApp.
- [x] **Open Graph y Twitter Cards:** Previews enriquecidos con badges oficiales listos para compartir enlaces en WhatsApp y redes sociales.
- [x] **Amenidad Regional: Motor de Traducción Oficial en Tiempo Real:** Integrado con script y selector de Google Translate para traducción instantánea de la plataforma a múltiples idiomas ([GoogleTranslateScript.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/frontend/components/ui/GoogleTranslateScript.tsx)).
- [x] **Amenidad Financiera: Multidivisa en Tiempo Real (NIO / USD):** Contexto global de moneda con persistencia y tasa de cambio oficial BCN (1 USD = 36.62 C$), propagado reactivamente en Catálogo de Viajes, Home, Compra/Checkout y Mis Boletos ([CurrencyContext.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/frontend/context/CurrencyContext.tsx)).
- [x] **Amenidad de Pagos: Métodos de Pago Persistidos en Base de Datos:** Modelo `MetodoPagoUsuario` en PostgreSQL, Server Actions de consulta, alta, asignación predeterminada y baja, junto con modal interactivo con previsualización dinámica de tarjeta en vivo ([metodos-pago.ts](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/backend/actions/metodos-pago.ts), [settings/page.tsx](file:///c:/Users/soporte/Desktop/Intelro/ruta-corp/src/app/(app)/settings/page.tsx)).
