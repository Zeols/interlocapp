# Análisis de la Arquitectura del Sistema - Plataforma SaaS Multi-Tenant (Cooperativas de Transporte)

## 1. Análisis Técnico de la Arquitectura de Software

El proyecto se diseñará bajo una **Arquitectura Multi-Tenant (SaaS - Software as a Service)**, con el objetivo de que múltiples cooperativas de transporte puedan operar de forma simultánea en la misma plataforma compartiendo la misma infraestructura, pero manteniendo sus datos y configuraciones estrictamente aislados.

El sistema se sustentará sobre el ecosistema **Next.js (App Router)** y **Prisma ORM** con **PostgreSQL**.

### Características de la Arquitectura Técnica:
- **Enrutamiento e Identificación de Inquilinos (Tenants):** Se utilizará el *Middleware* de Next.js para interceptar las peticiones e identificar a qué cooperativa pertenece el usuario (ya sea por subdominios, ej: `coop1.plataforma.com`, o mediante la sesión de autenticación).
- **Aislamiento de Datos en PostgreSQL (Multi-Tenancy):** Existen tres enfoques, pero para optimizar costos operativos iniciales y mantener agilidad, se plantea un enfoque de **Base de datos compartida, Esquema compartido (Tenant ID)** donde cada tabla incluye una columna `tenantId` (o `cooperativaId`), o bien **Esquemas separados (Schema-per-tenant)** si se requiere un aislamiento de datos más estricto por temas legales o de cumplimiento.
- **Frontend y Backend:** Next.js servirá tanto las interfaces de usuario (Client Components) como la lógica de backend (Server Actions/API Routes). Todo el backend debe asegurar inyectar el `tenantId` en cada operación de la base de datos.
- **Acceso a Datos Centralizado:** Prisma ORM gestionará el acceso. En un entorno multi-tenant, se implementarán Extensiones de Prisma (Prisma Client Extensions) para filtrar automáticamente todas las consultas globales e inyectar el `tenantId`, mitigando el riesgo de exposición cruzada de datos.

### Arquitectura de UI / Frontend:
- **Tecnologías Core:** **Next.js 16** con **React 19**, utilizando Server Components para la carga de datos estructurados y Client Components para interacciones dinámicas.
- **Sistema de Diseño y Estilos:** La estilización se rige por **Tailwind CSS v4** mediante una arquitectura CSS-first (`@theme`).
- **Componentes Altamente Interactivos:** Se integra la biblioteca **Magic UI** y la filosofía de diseño Aceternity UI para incorporar animaciones fluidas (utilizando `framer-motion`) y componentes preconstruidos (Grid Patterns, Bento Grids, Marquesinas, Botones con efectos visuales avanzados) que potencian la estética visual y la percepción de marca "premium" del SaaS.
- **Reusabilidad Dinámica:** Utilidad centralizada `cn()` (`clsx` + `tailwind-merge`) para una composición dinámica, limpia y escalable de estilos en componentes.
## 2. Patrones de Diseño Utilizados

### Patrón Multi-Tenant (Inquilino Múltiple)
El corazón de la aplicación. Permite que el mismo código fuente de la aplicación (Frontend y Backend) atienda a múltiples clientes (las diferentes cooperativas) sin necesidad de instanciar un servidor separado para cada uno. 

### Patrón de Intercepción por Middleware
El Middleware centraliza la lógica de resolución del entorno del tenant. Valida las URLs, verifica subdominios, y determina qué marca, colores (White-labeling) y datos se deben mostrar.

### Row-Level Security (RLS) / Tenant Isolation Pattern
Para la capa de datos, se aplica un patrón de aislamiento. Si se usa PostgreSQL, se puede aprovechar el sistema nativo de *Row-Level Security* combinado con Prisma, asegurando que a nivel de motor de base de datos ningún cliente pueda acceder a los datos de otra cooperativa, eliminando el error humano.

### Ventajas para el Proyecto
1. **Escalabilidad Comercial y Reducción de Costos:** Al compartir la misma infraestructura de servidores y base de datos, los costos operativos son bajos. Incorporar una nueva cooperativa (Onboarding) toma minutos, no días de configuración de servidores.
2. **Mantenimiento Centralizado:** Cualquier actualización de software, mejora o corrección de bugs impacta positivamente y de forma inmediata a todas las cooperativas.
3. **Marca Blanca (White-labeling):** Permite diseñar componentes dinámicos en React que absorban los colores y logos específicos de cada cooperativa a partir de la identificación del Tenant.
4. **Métricas Globales:** La administración de la plataforma SaaS tendrá visibilidad general del rendimiento y volumen de negocio de toda la red de cooperativas.

### Desventajas para el Proyecto
1. **Mayor Complejidad de Desarrollo:** Exige un esfuerzo de ingeniería mucho mayor para asegurar que absolutamente todas las consultas y acciones se filtren correctamente por tenant. Un error podría mostrar rutas o finanzas de una cooperativa a otra.
2. **Efecto del "Vecino Ruidoso" (Noisy Neighbor):** Si una cooperativa experimenta un tráfico masivo, podría consumir recursos de CPU/RAM o base de datos afectando el rendimiento de las demás cooperativas.
3. **Complejidad en Backups y Restauración:** Si una sola cooperativa corrompe sus datos y solicita restaurarlos, es muy complejo hacer un "rollback" en una base de datos compartida sin afectar a los demás.

## 3. Posible Migración de Arquitectura y Planificación a Futuro

Al comenzar como un SaaS Multi-Tenant, el principal reto futuro no es separar el frontend del backend (como en un monolito clásico), sino **separar infraestructuras a nivel de datos y cómputo**.

### ¿Cómo planificar el crecimiento?

1. **Fase 1: Multi-Tenant Lógico (Actual)**
   - Todos los clientes comparten la misma base de datos, el mismo esquema y la misma instancia de Next.js. El aislamiento se logra con la columna `tenantId` (o Row-Level Security).
   - Ideal para arrancar y soportar a los primeros decenas/cientos de cooperativas de tamaño pequeño-mediano.

2. **Fase 2: Migración a Esquemas Separados (Schema-per-tenant) o Fragmentación (Sharding)**
   - Cuando la tabla de `Boletos` o `Transacciones` crezca a cientos de millones de registros, las consultas pueden volverse lentas.
   - Plan: Implementar un modelo donde cada cooperativa tenga su propio "Esquema" dentro de PostgreSQL o, si es necesario, dividir los datos en distintos servidores de base de datos físicos (Sharding) utilizando reglas de enrutamiento basadas en el Tenant.

3. **Fase 3: Aislamiento para Grandes Clientes (Single-Tenant Híbrido)**
   - Algunas cooperativas inmensas o entidades gubernamentales pueden exigir exclusividad de servidores por motivos legales.
   - Plan: La arquitectura de Next.js deberá permitir desplegar copias "Stand-alone" de la aplicación apuntando a bases de datos dedicadas exclusivas, conviviendo con el SaaS principal.

4. **Fase 4: Extracción de Microservicios Comunes**
   - Servicios de alto consumo transversal a todos los tenants (ej. Websockets para el rastreo GPS de buses en tiempo real o el procesamiento de pagos transaccionales) serán extraídos del servidor de Next.js a microservicios independientes (Go, NestJS, etc.) que se auto-escalarán en un cluster (Kubernetes), liberando la carga de los procesos de servidor de React.
