-- CreateEnum
CREATE TYPE "EstadoCatalogo" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INACTIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "EstadoUnidad" AS ENUM ('DISPONIBLE', 'EN_RUTA', 'MANTENIMIENTO', 'INOPERATIVA');

-- CreateEnum
CREATE TYPE "EstadoAsignacion" AS ENUM ('INICIADA', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoAsiento" AS ENUM ('DISPONIBLE', 'OCUPADO', 'RESERVADO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "EstadoDespacho" AS ENUM ('PENDIENTE', 'EN_CURSO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoViaje" AS ENUM ('PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoBoleto" AS ENUM ('RESERVADO', 'PAGADO', 'ABORDADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('PENDIENTE', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoIncidente" AS ENUM ('REGISTRADO', 'EN_ATENCION', 'RESUELTO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoCierre" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoGasto" AS ENUM ('GASOLINA', 'MANTENIMIENTO', 'PEAJE', 'VIATICOS', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoIncidente" AS ENUM ('AVERIA_MECANICA', 'ACCIDENTE', 'RETRASO', 'OTRO');

-- CreateTable
CREATE TABLE "cooperativas" (
    "idCooperativa" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "estado" "EstadoCatalogo" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cooperativas_pkey" PRIMARY KEY ("idCooperativa")
);

-- CreateTable
CREATE TABLE "roles" (
    "idRol" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoCatalogo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "roles_pkey" PRIMARY KEY ("idRol")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "idUsuario" SERIAL NOT NULL,
    "idCooperativa" INTEGER,
    "idRol" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "passwd" TEXT NOT NULL,
    "telefono" TEXT,
    "correo" TEXT NOT NULL,
    "direccion" TEXT,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("idUsuario")
);

-- CreateTable
CREATE TABLE "cierres_jornada" (
    "idCierre" SERIAL NOT NULL,
    "idCooperativa" INTEGER NOT NULL,
    "idUsuario" INTEGER NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montoEsperado" DECIMAL(10,2) NOT NULL,
    "montoEntregado" DECIMAL(10,2) NOT NULL,
    "diferencia" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoCierre" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "cierres_jornada_pkey" PRIMARY KEY ("idCierre")
);

-- CreateTable
CREATE TABLE "gastos" (
    "idGasto" SERIAL NOT NULL,
    "idCierre" INTEGER,
    "tipo" "TipoGasto" NOT NULL,
    "descripcion" TEXT,
    "monto" DECIMAL(10,2) NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("idGasto")
);

-- CreateTable
CREATE TABLE "abastecimientos_gasolina" (
    "idAbastecGasol" SERIAL NOT NULL,
    "idGasto" INTEGER NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "abastecimientos_gasolina_pkey" PRIMARY KEY ("idAbastecGasol")
);

-- CreateTable
CREATE TABLE "tipos_unidad" (
    "idTipoUnidad" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoCatalogo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "tipos_unidad_pkey" PRIMARY KEY ("idTipoUnidad")
);

-- CreateTable
CREATE TABLE "unidades" (
    "idUnidad" SERIAL NOT NULL,
    "idCooperativa" INTEGER NOT NULL,
    "idTipoUnidad" INTEGER NOT NULL,
    "numeroUnidad" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "estado" "EstadoUnidad" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("idUnidad")
);

-- CreateTable
CREATE TABLE "asignaciones_unidad" (
    "idAsignacion" SERIAL NOT NULL,
    "idUnidad" INTEGER NOT NULL,
    "idUsuario" INTEGER NOT NULL,
    "fechaHInicio" TIMESTAMP(3) NOT NULL,
    "fechaHFin" TIMESTAMP(3),
    "estado" "EstadoAsignacion" NOT NULL DEFAULT 'INICIADA',

    CONSTRAINT "asignaciones_unidad_pkey" PRIMARY KEY ("idAsignacion")
);

-- CreateTable
CREATE TABLE "asientos" (
    "idAsiento" SERIAL NOT NULL,
    "idUnidad" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "estado" "EstadoAsiento" NOT NULL DEFAULT 'DISPONIBLE',

    CONSTRAINT "asientos_pkey" PRIMARY KEY ("idAsiento")
);

-- CreateTable
CREATE TABLE "rutas" (
    "idRuta" SERIAL NOT NULL,
    "idCooperativa" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoCatalogo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "rutas_pkey" PRIMARY KEY ("idRuta")
);

-- CreateTable
CREATE TABLE "puntos" (
    "idPunto" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoCatalogo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "puntos_pkey" PRIMARY KEY ("idPunto")
);

-- CreateTable
CREATE TABLE "puntos_ruta" (
    "idPuntoRuta" SERIAL NOT NULL,
    "idRuta" INTEGER NOT NULL,
    "idPunto" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "puntos_ruta_pkey" PRIMARY KEY ("idPuntoRuta")
);

-- CreateTable
CREATE TABLE "tarifas" (
    "idTarifa" SERIAL NOT NULL,
    "idRuta" INTEGER NOT NULL,
    "idPuntoOrigen" INTEGER,
    "idPuntoDestino" INTEGER,
    "monto" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoCatalogo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "tarifas_pkey" PRIMARY KEY ("idTarifa")
);

-- CreateTable
CREATE TABLE "viajes" (
    "idViaje" SERIAL NOT NULL,
    "idRuta" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "hrSalidaProgramada" TIMESTAMP(3) NOT NULL,
    "hrSalidaEstimada" TIMESTAMP(3),
    "hrLlegadaReal" TIMESTAMP(3),
    "sentido" TEXT,
    "estado" "EstadoViaje" NOT NULL DEFAULT 'PROGRAMADO',

    CONSTRAINT "viajes_pkey" PRIMARY KEY ("idViaje")
);

-- CreateTable
CREATE TABLE "despachos" (
    "idDespacho" SERIAL NOT NULL,
    "idViaje" INTEGER NOT NULL,
    "idAsignacion" INTEGER NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoDespacho" NOT NULL DEFAULT 'PENDIENTE',
    "observacion" TEXT,

    CONSTRAINT "despachos_pkey" PRIMARY KEY ("idDespacho")
);

-- CreateTable
CREATE TABLE "controles_viaje" (
    "idControlViaje" SERIAL NOT NULL,
    "idViaje" INTEGER NOT NULL,
    "idPuntoRuta" INTEGER NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "controles_viaje_pkey" PRIMARY KEY ("idControlViaje")
);

-- CreateTable
CREATE TABLE "incidentes" (
    "idIncidente" SERIAL NOT NULL,
    "idDespacho" INTEGER,
    "tipo" "TipoIncidente" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoIncidente" NOT NULL DEFAULT 'REGISTRADO',

    CONSTRAINT "incidentes_pkey" PRIMARY KEY ("idIncidente")
);

-- CreateTable
CREATE TABLE "tipos_venta" (
    "idTipoVenta" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoCatalogo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "tipos_venta_pkey" PRIMARY KEY ("idTipoVenta")
);

-- CreateTable
CREATE TABLE "ventas" (
    "idVenta" SERIAL NOT NULL,
    "idViaje" INTEGER,
    "idTipoVenta" INTEGER NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("idVenta")
);

-- CreateTable
CREATE TABLE "boletos" (
    "idBoleto" SERIAL NOT NULL,
    "idVenta" INTEGER NOT NULL,
    "idViaje" INTEGER NOT NULL,
    "idAsiento" INTEGER NOT NULL,
    "idTarifa" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoBoleto" NOT NULL DEFAULT 'RESERVADO',

    CONSTRAINT "boletos_pkey" PRIMARY KEY ("idBoleto")
);

-- CreateTable
CREATE TABLE "tarifas_equipaje" (
    "idTarifaEquipaje" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoCatalogo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "tarifas_equipaje_pkey" PRIMARY KEY ("idTarifaEquipaje")
);

-- CreateTable
CREATE TABLE "equipajes" (
    "idEquipaje" SERIAL NOT NULL,
    "idBoleto" INTEGER,
    "idTarifaEquipaje" INTEGER NOT NULL,
    "descripcion" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "monto" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "equipajes_pkey" PRIMARY KEY ("idEquipaje")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "abastecimientos_gasolina_idGasto_key" ON "abastecimientos_gasolina"("idGasto");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_placa_key" ON "unidades"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "despachos_idViaje_key" ON "despachos"("idViaje");

-- CreateIndex
CREATE UNIQUE INDEX "incidentes_idDespacho_key" ON "incidentes"("idDespacho");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_venta_nombre_key" ON "tipos_venta"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "equipajes_idBoleto_key" ON "equipajes"("idBoleto");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_idCooperativa_fkey" FOREIGN KEY ("idCooperativa") REFERENCES "cooperativas"("idCooperativa") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_idRol_fkey" FOREIGN KEY ("idRol") REFERENCES "roles"("idRol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cierres_jornada" ADD CONSTRAINT "cierres_jornada_idCooperativa_fkey" FOREIGN KEY ("idCooperativa") REFERENCES "cooperativas"("idCooperativa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cierres_jornada" ADD CONSTRAINT "cierres_jornada_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "usuarios"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_idCierre_fkey" FOREIGN KEY ("idCierre") REFERENCES "cierres_jornada"("idCierre") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimientos_gasolina" ADD CONSTRAINT "abastecimientos_gasolina_idGasto_fkey" FOREIGN KEY ("idGasto") REFERENCES "gastos"("idGasto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_idCooperativa_fkey" FOREIGN KEY ("idCooperativa") REFERENCES "cooperativas"("idCooperativa") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_idTipoUnidad_fkey" FOREIGN KEY ("idTipoUnidad") REFERENCES "tipos_unidad"("idTipoUnidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_unidad" ADD CONSTRAINT "asignaciones_unidad_idUnidad_fkey" FOREIGN KEY ("idUnidad") REFERENCES "unidades"("idUnidad") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_unidad" ADD CONSTRAINT "asignaciones_unidad_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "usuarios"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asientos" ADD CONSTRAINT "asientos_idUnidad_fkey" FOREIGN KEY ("idUnidad") REFERENCES "unidades"("idUnidad") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutas" ADD CONSTRAINT "rutas_idCooperativa_fkey" FOREIGN KEY ("idCooperativa") REFERENCES "cooperativas"("idCooperativa") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puntos_ruta" ADD CONSTRAINT "puntos_ruta_idRuta_fkey" FOREIGN KEY ("idRuta") REFERENCES "rutas"("idRuta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puntos_ruta" ADD CONSTRAINT "puntos_ruta_idPunto_fkey" FOREIGN KEY ("idPunto") REFERENCES "puntos"("idPunto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifas" ADD CONSTRAINT "tarifas_idRuta_fkey" FOREIGN KEY ("idRuta") REFERENCES "rutas"("idRuta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifas" ADD CONSTRAINT "tarifas_idPuntoOrigen_fkey" FOREIGN KEY ("idPuntoOrigen") REFERENCES "puntos"("idPunto") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifas" ADD CONSTRAINT "tarifas_idPuntoDestino_fkey" FOREIGN KEY ("idPuntoDestino") REFERENCES "puntos"("idPunto") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_idRuta_fkey" FOREIGN KEY ("idRuta") REFERENCES "rutas"("idRuta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_idViaje_fkey" FOREIGN KEY ("idViaje") REFERENCES "viajes"("idViaje") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_idAsignacion_fkey" FOREIGN KEY ("idAsignacion") REFERENCES "asignaciones_unidad"("idAsignacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controles_viaje" ADD CONSTRAINT "controles_viaje_idViaje_fkey" FOREIGN KEY ("idViaje") REFERENCES "viajes"("idViaje") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controles_viaje" ADD CONSTRAINT "controles_viaje_idPuntoRuta_fkey" FOREIGN KEY ("idPuntoRuta") REFERENCES "puntos_ruta"("idPuntoRuta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidentes" ADD CONSTRAINT "incidentes_idDespacho_fkey" FOREIGN KEY ("idDespacho") REFERENCES "despachos"("idDespacho") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_idViaje_fkey" FOREIGN KEY ("idViaje") REFERENCES "viajes"("idViaje") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_idTipoVenta_fkey" FOREIGN KEY ("idTipoVenta") REFERENCES "tipos_venta"("idTipoVenta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletos" ADD CONSTRAINT "boletos_idVenta_fkey" FOREIGN KEY ("idVenta") REFERENCES "ventas"("idVenta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletos" ADD CONSTRAINT "boletos_idViaje_fkey" FOREIGN KEY ("idViaje") REFERENCES "viajes"("idViaje") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletos" ADD CONSTRAINT "boletos_idAsiento_fkey" FOREIGN KEY ("idAsiento") REFERENCES "asientos"("idAsiento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletos" ADD CONSTRAINT "boletos_idTarifa_fkey" FOREIGN KEY ("idTarifa") REFERENCES "tarifas"("idTarifa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipajes" ADD CONSTRAINT "equipajes_idBoleto_fkey" FOREIGN KEY ("idBoleto") REFERENCES "boletos"("idBoleto") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipajes" ADD CONSTRAINT "equipajes_idTarifaEquipaje_fkey" FOREIGN KEY ("idTarifaEquipaje") REFERENCES "tarifas_equipaje"("idTarifaEquipaje") ON DELETE RESTRICT ON UPDATE CASCADE;
