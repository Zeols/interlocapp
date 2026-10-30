# Dirección de Diseño del Sistema InterlocApp (RutaCorp)

## 1. Filosofía y Estilo Visual
- **Enfoque**: Minimalismo operativo para transporte interurbano en Nicaragua.
- **Antislop Dials**: ENERGY 1 (Calm) / RHYTHM 1 (Uniform) / MOTION 1 (Subtle).
- **Objetivo**: La interfaz debe sentirse como una herramienta de trabajo ágil, predecible y profesional, libre de decoraciones innecesarias, gradientes artificiales o saturación de colores.

## 2. Paleta de Colores
- **Fondo General**: `bg-slate-50` / Superficies en `bg-white`.
- **Bordes**: `border-slate-200` uniforme con esquinas `rounded-lg` o `rounded-xl`.
- **Tipografía**: `text-slate-900` para títulos, `text-slate-700` para cuerpo, `text-slate-500` para metadatos.
- **Color de Marca (Naranja)**: `#FE7D22` (`primary`). Utilizado exclusivamente para:
  - Botones de acción principal (CTA primario).
  - Ítem activo en el menú lateral de navegación.
  - Anillos de foco en inputs y selectores accesibles.
- **Colores Semánticos (Uso exclusivo en StatusBadge y alertas pequeñas)**:
  - **Verde (`emerald`)**: Estado ACTIVO, COMPLETADO, CUADRADO, ABORDADO.
  - **Ámbar (`amber`)**: Estado PENDIENTE, EN PROCESO, SOBRANTE, ADVERTENCIA.
  - **Rojo (`rose` / `red`)**: Estado CANCELADO, BLOQUEADO, FALTANTE, ERROR.
  - *Quedan prohibidos los gradientes arcoíris, morados tech o fondos de colores saturados en tarjetas de métricas.*

## 3. Escala Tipográfica Homogénea
- **Título de Pantalla (H1)**: `text-xl sm:text-2xl font-bold text-slate-900 tracking-tight`.
- **Subtítulo / Bajada**: `text-xs text-slate-500 mt-0.5`.
- **Título de Sección (H2)**: `text-base font-bold text-slate-900`.
- **Texto Normal / Tabla**: `text-xs sm:text-sm font-medium text-slate-700`.
- **Metadatos y Etiquetas**: `text-xs text-slate-500` (mínimo 12px, sin forzar mayúsculas artificiales con tracking extremo).
- **Métricas Destacadas (KPI)**: `text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums`.

## 4. Uso de Iconos
- Solo se emplean iconos compactos funcionales en:
  - Botones de acción dentro de tablas (editar, eliminar, restablecer clave).
  - Botón de cierre en modales (`mdiClose`).
  - Navegación lateral del sidebar.
- Quedan eliminados los iconos puramente decorativos en títulos H1, badges de texto y encabezados de tarjetas.

## 5. Responsive y Touch
- Mínimo de área táctil de 44x44px para botones e interactivos en móvil.
- Cero scroll horizontal no intencional.
- Modales con `max-h-[90vh]`, scroll interno y acciones al pie fijas.

