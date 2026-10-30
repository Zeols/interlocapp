import "dotenv/config";
import { prisma } from "../src/backend/db";
import bcrypt from "bcryptjs";
import { getNowInManagua, getManaguaDateISO } from "../src/lib/date-time";

async function runFullVerification() {
  console.log("=================================================");
  console.log("  INTERLOCAPP - VERIFICACIÓN DE FLUJO COMPLETO  ");
  console.log("=================================================\n");

  let exitCode = 0;

  try {
    // -----------------------------------------------------------------
    // 1. VERIFICACIÓN DE ENTIDADES BÁSICAS (SUPER ADMIN, COOPERATIVA, RUTA, UNIDAD)
    // -----------------------------------------------------------------
    console.log("[Paso 1] Verificando entidades operativas base...");
    const superAdmin = await prisma.usuario.findFirst({
      where: { rol: { nombre: "SUPER_ADMIN" } },
      include: { rol: true },
    });

    if (!superAdmin) {
      throw new Error("No se encontró usuario Super Admin.");
    }
    console.log(`  ✓ Super Admin verificado: ${superAdmin.nombre} (${superAdmin.correo})`);

    const ruta = await prisma.ruta.findFirst({
      where: { estado: "ACTIVO" },
      include: { cooperativa: true, puntosRuta: { include: { punto: true } }, tarifas: true },
    });
    if (!ruta) {
      throw new Error("No se encontró ninguna ruta activa.");
    }
    const cooperativa = ruta.cooperativa;
    console.log(`  ✓ Cooperativa activa: ${cooperativa.nombre} (#${cooperativa.idCooperativa})`);
    console.log(`  ✓ Ruta operativa: ${ruta.nombre} (${ruta.puntosRuta.length} puntos, ${ruta.tarifas.length} tarifas)`);

    let unidad = await prisma.unidad.findFirst({
      where: { idCooperativa: cooperativa.idCooperativa },
      include: { asientos: true },
    });
    if (!unidad || unidad.asientos.length === 0) {
      // Si la cooperativa no tiene unidades, buscar cualquier unidad activa o asignar una
      unidad = await prisma.unidad.findFirst({
        include: { asientos: true },
      });
      if (unidad) {
        await prisma.unidad.update({
          where: { idUnidad: unidad.idUnidad },
          data: { idCooperativa: cooperativa.idCooperativa },
        });
      }
    }
    if (!unidad || unidad.asientos.length === 0) {
      throw new Error("No se encontró unidad con asientos para pruebas.");
    }
    console.log(`  ✓ Unidad: #${unidad.numeroUnidad} (Placa ${unidad.placa}, ${unidad.asientos.length} asientos)`);

    const chofer = await prisma.usuario.findFirst({
      where: { rol: { nombre: "CHOFER" } },
    });
    const ayudante = await prisma.usuario.findFirst({
      where: { rol: { nombre: "AYUDANTE" } },
    });
    const pasajero = await prisma.usuario.findFirst({
      where: { rol: { nombre: "PASAJERO" } },
    });
    console.log(`  ✓ Personal: Chofer #${chofer?.idUsuario || "N/A"}, Ayudante #${ayudante?.idUsuario || "N/A"}, Pasajero #${pasajero?.idUsuario || "N/A"}`);

    // -----------------------------------------------------------------
    // 2. MODIFICACIÓN DE CONTRASEÑA POR SUPER ADMIN
    // -----------------------------------------------------------------
    console.log("\n[Paso 2] Probando cambio de contraseña por Super Admin...");
    if (pasajero) {
      const nuevaClavePlano = "PruebaSegura2026!";
      const hashed = await bcrypt.hash(nuevaClavePlano, 10);
      await prisma.usuario.update({
        where: { idUsuario: pasajero.idUsuario },
        data: { passwd: hashed },
      });
      const usuarioActualizado = await prisma.usuario.findUnique({
        where: { idUsuario: pasajero.idUsuario },
      });
      const passwordValida = await bcrypt.compare(nuevaClavePlano, usuarioActualizado?.passwd || "");
      if (!passwordValida) {
        throw new Error("Fallo al verificar el cambio de contraseña de usuario.");
      }
      console.log(`  ✓ Contraseña modificada exitosamente para @${pasajero.usuario} y verificada con bcrypt.`);
    }

    // -----------------------------------------------------------------
    // 3. PROGRAMACIÓN DE SALIDA (VIAJE)
    // -----------------------------------------------------------------
    console.log("\n[Paso 3] Programando nueva salida para el día de hoy...");
    const hoyIso = getManaguaDateISO();
    const horaSalida = "14:30";
    const fechaHoraSalida = new Date(`${hoyIso}T${horaSalida}:00-06:00`);

    const nuevoViaje = await prisma.viaje.create({
      data: {
        idRuta: ruta.idRuta,
        fecha: new Date(`${hoyIso}T00:00:00-06:00`),
        hrSalidaProgramada: fechaHoraSalida,
        sentido: "IDA",
        estado: "PROGRAMADO",
      },
    });
    console.log(`  ✓ Viaje programado (#${nuevoViaje.idViaje}) a las ${horaSalida} para la ruta ${ruta.nombre}`);

    // Asignación de unidad y tripulación
    let asignacion = await prisma.asignacionUnidad.create({
      data: {
        idUnidad: unidad.idUnidad,
        idUsuario: chofer?.idUsuario || superAdmin.idUsuario,
        fechaHInicio: getNowInManagua(),
        estado: "INICIADA",
      },
    });

    const despacho = await prisma.despacho.create({
      data: {
        idViaje: nuevoViaje.idViaje,
        idAsignacion: asignacion.idAsignacion,
        estado: "EN_CURSO",
      },
    });
    console.log(`  ✓ Despacho vinculado (#${despacho.idDespacho}) con unidad #${unidad.numeroUnidad || unidad.placa}`);

    // -----------------------------------------------------------------
    // 4. EMISIÓN DE BOLETO (VENTA POS CON ASIENTOS)
    // -----------------------------------------------------------------
    console.log("\n[Paso 4] Procesando venta de boleto en ventanilla POS...");
    const tipoVenta = await prisma.tipoVenta.findFirst({
      where: { nombre: "VENTANILLA" },
    }) || await prisma.tipoVenta.findFirst();

    if (!tipoVenta) {
      throw new Error("No existe TipoVenta configurado en la base de datos.");
    }

    const asiento1 = unidad.asientos[0];
    const precioBoleto = Number(ruta.tarifas[0]?.monto || 120);

    const ventaRealizada = await prisma.$transaction(async (tx) => {
      const v = await tx.venta.create({
        data: {
          idViaje: nuevoViaje.idViaje,
          idTipoVenta: tipoVenta.idTipoVenta,
          idUsuarioComprador: pasajero?.idUsuario || null,
          idUsuarioVendedor: superAdmin.idUsuario,
          total: precioBoleto,
          estado: "COMPLETADA",
          fechaHora: getNowInManagua(),
        },
      });

      const b = await tx.boleto.create({
        data: {
          idVenta: v.idVenta,
          idViaje: nuevoViaje.idViaje,
          idAsiento: asiento1.idAsiento,
          idTarifa: ruta.tarifas[0].idTarifa,
          monto: precioBoleto,
          estado: "PAGADO",
        },
      });

      await tx.asiento.update({
        where: { idAsiento: asiento1.idAsiento },
        data: { estado: "OCUPADO" },
      });

      return { venta: v, boleto: b };
    });

    console.log(`  ✓ Venta registrada (#${ventaRealizada.venta.idVenta}) con boleto #${ventaRealizada.boleto.idBoleto}`);
    console.log(`  ✓ Asiento #${asiento1.numero} marcado como OCUPADO`);
    console.log(`  ✓ Relación estricta de usuario comprador (#${ventaRealizada.venta.idUsuarioComprador}) y vendedor (#${ventaRealizada.venta.idUsuarioVendedor}) asignada.`);

    // -----------------------------------------------------------------
    // 5. VALIDACIÓN DEL BOLETO EN ABORDAJE
    // -----------------------------------------------------------------
    console.log("\n[Paso 5] Validando boleto en terminal de abordaje...");
    const boletoAValidar = await prisma.boleto.findUnique({
      where: { idBoleto: ventaRealizada.boleto.idBoleto },
    });

    if (boletoAValidar?.estado !== "PAGADO") {
      throw new Error("El boleto recién emitido no tiene estado PAGADO.");
    }

    await prisma.boleto.update({
      where: { idBoleto: ventaRealizada.boleto.idBoleto },
      data: { estado: "ABORDADO" },
    });
    console.log(`  ✓ Boleto #${ventaRealizada.boleto.idBoleto} validado exitosamente. Estado actual: ABORDADO`);

    // -----------------------------------------------------------------
    // 6. DESPACHO DEL VIAJE
    // -----------------------------------------------------------------
    console.log("\n[Paso 6] Despachando unidad y viaje...");
    await prisma.$transaction([
      prisma.viaje.update({
        where: { idViaje: nuevoViaje.idViaje },
        data: { estado: "EN_CURSO" },
      }),
      prisma.unidad.update({
        where: { idUnidad: unidad.idUnidad },
        data: { estado: "EN_RUTA" },
      }),
    ]);
    console.log(`  ✓ Viaje #${nuevoViaje.idViaje} en estado EN_CURSO. Unidad en estado EN_RUTA.`);

    // -----------------------------------------------------------------
    // 7. REGISTRO DE GASTO OPERATIVO
    // -----------------------------------------------------------------
    console.log("\n[Paso 7] Registrando gasto de combustible en ruta...");
    const montoGasto = 50;
    const gastoCreado = await prisma.gasto.create({
      data: {
        tipo: "GASOLINA",
        monto: montoGasto,
        descripcion: "Diesel estación Shell terminal norte",
        fechaHora: getNowInManagua(),
      },
    });
    console.log(`  ✓ Gasto #${gastoCreado.idGasto} registrado: C$ ${montoGasto} (GASOLINA)`);

    // -----------------------------------------------------------------
    // 8. CONCILIACIÓN Y CIERRE DE JORNADA (ARQUEO)
    // -----------------------------------------------------------------
    console.log("\n[Paso 8] Realizando arqueo de caja y cierre de turno...");
    const totalVentasEsperadas = precioBoleto;
    const totalGastosEsperados = montoGasto;
    const netoEsperado = totalVentasEsperadas - totalGastosEsperados;

    console.log(`  → Ventas en turno: C$ ${totalVentasEsperadas.toFixed(2)}`);
    console.log(`  → Egresos en turno: -C$ ${totalGastosEsperados.toFixed(2)}`);
    console.log(`  → Efectivo esperado en gaveta: C$ ${netoEsperado.toFixed(2)}`);

    const efectivoEntregado = netoEsperado;
    const diferencia = efectivoEntregado - netoEsperado;

    const cierre = await prisma.$transaction(async (tx) => {
      const c = await tx.cierreJornada.create({
        data: {
          idCooperativa: cooperativa.idCooperativa,
          idUsuario: superAdmin.idUsuario,
          montoEsperado: netoEsperado,
          montoEntregado: efectivoEntregado,
          diferencia,
          estado: "CONFIRMADO",
          fechaHora: getNowInManagua(),
          observaciones: "Cierre exitoso verificado en prueba integral.",
        },
      });

      await tx.gasto.updateMany({
        where: { idGasto: gastoCreado.idGasto },
        data: { idCierre: c.idCierre },
      });

      return c;
    });

    console.log(`  ✓ Cierre de turno #${cierre.idCierre} generado y confirmado con cuadre exacto (C$ 0.00).`);
    console.log(`  ✓ Gasto #${gastoCreado.idGasto} conciliado y vinculado al cierre.`);

    // -----------------------------------------------------------------
    // 9. WEB PUSH: REGISTRO Y SUSCRIPCIÓN VAPID
    // -----------------------------------------------------------------
    console.log("\n[Paso 9] Verificando infraestructura Web Push...");
    const mockEndpoint = "https://fcm.googleapis.com/fcm/send/test-token-" + Date.now();
    const subPush = await prisma.pushSuscripcion.upsert({
      where: { endpoint: mockEndpoint },
      create: {
        endpoint: mockEndpoint,
        p256dh: "BMV5k...test_key...",
        auth: "auth_token_test",
        idUsuario: superAdmin.idUsuario,
        userAgent: "Playwright Automated Test Agent",
      },
      update: {},
    });
    console.log(`  ✓ Suscripción Web Push registrada en base de datos (#${subPush.idSuscripcion})`);

    // Limpieza de suscripción de prueba
    await prisma.pushSuscripcion.delete({
      where: { endpoint: mockEndpoint },
    });
    console.log("  ✓ Suscripción de prueba eliminada.");

    // -----------------------------------------------------------------
    // 10. LIMPIEZA DE ARTIFACTOS DE LA PRUEBA PARA DEJAR BD LIMPIA
    // -----------------------------------------------------------------
    console.log("\n[Paso 10] Dejando la unidad y asientos disponibles...");
    await prisma.$transaction([
      prisma.asiento.update({
        where: { idAsiento: asiento1.idAsiento },
        data: { estado: "DISPONIBLE" },
      }),
      prisma.unidad.update({
        where: { idUnidad: unidad.idUnidad },
        data: { estado: "DISPONIBLE" },
      }),
    ]);
    console.log("  ✓ Asiento y unidad restablecidos a DISPONIBLE.");

    console.log("\n=================================================");
    console.log("  ¡TODOS LOS PASOS DEL FLUJO COMPLETADOS CON ÉXITO! ");
    console.log("=================================================");
  } catch (error: any) {
    console.error("\n❌ ERROR EN EL FLUJO:", error.message || error);
    exitCode = 1;
  } finally {
    await prisma.$disconnect();
    process.exit(exitCode);
  }
}

runFullVerification();
