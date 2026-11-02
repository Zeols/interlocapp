"use server";

import prisma from "@/backend/db";
import { getCurrentUserAction } from "@/backend/actions/auth";
import { revalidatePath } from "next/cache";

export async function registrarEmergenciaAyudanteAction(payload: {
  idViaje: number;
  tipo: "AVERIA_MECANICA" | "ACCIDENTE" | "RETRASO" | "OTRO";
  descripcion: string;
}) {
  try {
    const user = await getCurrentUserAction();
    if (!user || user.rolNombre !== "AYUDANTE") {
      return { success: false, error: "No autorizado para reportar emergencias." };
    }

    const despacho = await prisma.despacho.findUnique({
      where: { idViaje: payload.idViaje },
    });

    if (!despacho) {
      return { success: false, error: "No se encontró un despacho activo para este viaje." };
    }

    const nuevoIncidente = await prisma.incidente.create({
      data: {
        idDespacho: despacho.idDespacho,
        tipo: payload.tipo,
        descripcion: payload.descripcion,
        estado: "REGISTRADO",
      },
    });

    revalidatePath("/dashboard/emergencias");
    return { success: true, data: nuevoIncidente };
  } catch (err: any) {
    console.error("Error al registrar emergencia:", err);
    return { success: false, error: err.message || "Error al enviar la solicitud de emergencia." };
  }
}

export async function getEmergenciasViajeAction(idViaje: number) {
  try {
    const despacho = await prisma.despacho.findUnique({
      where: { idViaje },
      include: { incidente: true },
    });

    if (!despacho || !despacho.incidente) {
      return { success: true, data: [] };
    }

    return { success: true, data: [despacho.incidente] };
  } catch (err: any) {
    console.error("Error al consultar emergencias del viaje:", err);
    return { success: false, error: "No se pudieron consultar las emergencias." };
  }
}

export async function getIncidentesChequeadorAction() {
  try {
    const user = await getCurrentUserAction();
    if (!user) return { success: false, error: "No autorizado." };

    const incidentes = await prisma.incidente.findMany({
      include: {
        despacho: {
          include: {
            viaje: {
              include: {
                ruta: true,
                boletos: {
                  where: { estado: { in: ["PAGADO", "ABORDADO"] } },
                },
              },
            },
            asignacionUnidad: {
              include: {
                unidad: {
                  include: { tipoUnidad: true, asientos: true },
                },
                usuario: true,
              },
            },
          },
        },
      },
      orderBy: { fechaHora: "desc" },
    });

    return { success: true, data: incidentes };
  } catch (err: any) {
    console.error("Error al obtener incidentes para chequeador:", err);
    return { success: false, error: "Error al cargar incidentes de ruta." };
  }
}

export async function getDatosGestionEmergenciaAction(idCooperativa?: number) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return { success: false, error: "No autorizado." };

    const incidentes = await prisma.incidente.findMany({
      where: { estado: { not: "RESUELTO" } },
      include: {
        despacho: {
          include: {
            viaje: {
              include: {
                ruta: true,
                boletos: {
                  where: { estado: { in: ["PAGADO", "ABORDADO"] } },
                },
              },
            },
            asignacionUnidad: {
              include: {
                unidad: {
                  include: { tipoUnidad: true, asientos: true },
                },
                usuario: true,
              },
            },
          },
        },
      },
      orderBy: { fechaHora: "desc" },
    });

    const unidadesDisponibles = await prisma.unidad.findMany({
      where: {
        ...(idCooperativa ? { idCooperativa } : {}),
        estado: "DISPONIBLE",
      },
      include: {
        tipoUnidad: true,
        asientos: true,
      },
    });

    // 1. Obtener los IDs de todos los usuarios (choferes y ayudantes) que tienen una asignación activa (en ruta)
    const asignacionesActivas = await prisma.asignacionUnidad.findMany({
      where: { estado: "INICIADA" },
      select: { idUsuario: true },
    });

    const idsUsuariosOcupados = asignacionesActivas.map(a => a.idUsuario);

    // 2. Filtrar choferes que NO estén ocupados en otro viaje activo
    const choferes = await prisma.usuario.findMany({
      where: {
        ...(idCooperativa ? { idCooperativa } : {}),
        rol: { nombre: "CHOFER" },
        estado: "ACTIVO",
        idUsuario: { notIn: idsUsuariosOcupados.length > 0 ? idsUsuariosOcupados : [-1] },
      },
    });

    
    // 3. Filtrar ayudantes que NO estén ocupados en otro viaje activo
    const ayudantes = await prisma.usuario.findMany({
      where: {
        ...(idCooperativa ? { idCooperativa } : {}),
        rol: { nombre: "AYUDANTE" },
        estado: "ACTIVO",
        idUsuario: { notIn: idsUsuariosOcupados.length > 0 ? idsUsuariosOcupados : [-1] },
      },
    });

    return { success: true, data: { incidentes, unidadesDisponibles, choferes, ayudantes } };
  } catch (err: any) {
    console.error("Error al cargar datos de gestión de emergencia:", err);
    return { success: false, error: "Error al cargar la información." };
  }
}

export async function autorizarDespachoExtraordinarioAction(payload: {
  idIncidente: number;
  idsUnidadesRepuesto: number[];
  idsChoferes: number[];
  mantenerAyudanteOriginal: boolean;
  idsAyudantesAdicionales?: number[];
}) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return { success: false, error: "No autorizado." };

    const { idIncidente, idsUnidadesRepuesto, idsChoferes, mantenerAyudanteOriginal, idsAyudantesAdicionales } = payload;

    if (!idsUnidadesRepuesto.length || idsUnidadesRepuesto.length !== idsChoferes.length) {
      return { success: false, error: "Debe asignar un chofer por cada unidad de repuesto seleccionada." };
    }

    const incidente = await prisma.incidente.findUnique({
      where: { idIncidente },
      include: {
        despacho: {
          include: {
            viaje: {
              include: {
                boletos: {
                  where: { estado: { in: ["PAGADO", "ABORDADO"] } },
                  include: { asiento: true },
                },
              },
            },
            asignacionUnidad: {
              include: {
                unidad: { include: { asientos: true } },
                usuario: true, // Ayudante original del despacho
              },
            },
          },
        },
      },
    });

    if (!incidente || !incidente.despacho) {
      return { success: false, error: "Incidente o despacho no encontrado." };
    }

    const viajeOriginal = incidente.despacho.viaje;
    const boletosVarados = viajeOriginal.boletos;
    const pasajerosVarados = boletosVarados.length;
    const unidadAfectada = incidente.despacho.asignacionUnidad.unidad;
    const ayudanteOriginalId = incidente.despacho.asignacionUnidad.idUsuario;

    const unidadesRepuesto = await prisma.unidad.findMany({
      where: { idUnidad: { in: idsUnidadesRepuesto } },
      include: { asientos: true },
    });

    const capacidadTotalRepuesto = unidadesRepuesto.reduce(
      (acc, u) => acc + u.asientos.length,
      0
    );

    if (capacidadTotalRepuesto < pasajerosVarados) {
      return {
        success: false,
        error: `Capacidad insuficiente. Hay ${pasajerosVarados} pasajeros varados y las unidades seleccionadas ofrecen ${capacidadTotalRepuesto} asientos.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Resolver incidente
      await tx.incidente.update({
        where: { idIncidente },
        data: { estado: "RESUELTO" },
      });

      // 2. Enviar unidad afectada a mantenimiento
      await tx.unidad.update({
        where: { idUnidad: unidadAfectada.idUnidad },
        data: { estado: "MANTENIMIENTO" },
      });

      // 3. Cancelar viaje original
      await tx.viaje.update({
        where: { idViaje: viajeOriginal.idViaje },
        data: { estado: "CANCELADO" },
      });

      // 4. Crear nuevo viaje de respaldo
      const viajeDeRespaldo = await tx.viaje.create({
        data: {
          idRuta: viajeOriginal.idRuta,
          fecha: new Date(),
          hrSalidaProgramada: new Date(),
          sentido: `${viajeOriginal.sentido ?? "RUTA"} (DESPACHO EXTRAORDINARIO)`,
          estado: "EN_CURSO",
        },
      });

      let boletoIndex = 0;

      // 5. Iterar sobre las unidades de repuesto asignando personal y pasaje
      for (let i = 0; i < unidadesRepuesto.length; i++) {
        const unidadRepuesto = unidadesRepuesto[i];
        const choferId = idsChoferes[i];

        // Definir el ayudante según las reglas de negocio
        let ayudanteId = ayudanteOriginalId;

        if (i === 0 && mantenerAyudanteOriginal) {
          ayudanteId = ayudanteOriginalId;
        } else {
          const indexAyudante = i === 0 ? 0 : i - 1;
          if (idsAyudantesAdicionales && idsAyudantesAdicionales.length > indexAyudante) {
            ayudanteId = idsAyudantesAdicionales[indexAyudante];
          }
        }

        const nuevaAsignacion = await tx.asignacionUnidad.create({
          data: {
            idUnidad: unidadRepuesto.idUnidad,
            idUsuario: choferId, // Asignación del chofer para la unidad de repuesto
            fechaHInicio: new Date(),
            estado: "INICIADA",
          },
        });

        // Crear despacho vinculado al nuevo viaje de respaldo
        await tx.despacho.create({
          data: {
            idViaje: viajeDeRespaldo.idViaje,
            idAsignacion: nuevaAsignacion.idAsignacion,
            estado: "EN_CURSO",
            observacion: `Despacho extraordinario por emergencia (Incidente #${idIncidente}) - Unidad ${i + 1}`,
          },
        });

        await tx.unidad.update({
          where: { idUnidad: unidadRepuesto.idUnidad },
          data: { estado: "EN_RUTA" },
        });

        const asientosUnidad = unidadRepuesto.asientos;
        const pasajerosEnEstaUnidad = Math.min(
          boletosVarados.length - boletoIndex,
          asientosUnidad.length
        );

        // Registrar en historico_repuestos
        await (tx as any).historicoRepuesto.create({
          data: {
            idIncidente: incidente.idIncidente,
            idUnidadAfectada: unidadAfectada.idUnidad,
            idUnidadRepuesto: unidadRepuesto.idUnidad,
            pasajerosVarados: pasajerosEnEstaUnidad,
            observacion: `Transbordo de ${pasajerosEnEstaUnidad} pasajeros a la unidad ${unidadRepuesto.numeroUnidad} con chofer ID ${choferId}`,
          },
        });

        // Migrar boletos y asientos
        for (let j = 0; j < pasajerosEnEstaUnidad; j++) {
          const boletoActual = boletosVarados[boletoIndex];
          const asientoDestino = asientosUnidad[j];

          const idAsientoFinal = unidadesRepuesto.length === 1 && boletoActual.idAsiento
            ? boletoActual.idAsiento
            : asientoDestino.idAsiento;

          await tx.boleto.update({
            where: { idBoleto: boletoActual.idBoleto },
            data: {
              idViaje: viajeDeRespaldo.idViaje,
              idAsiento: idAsientoFinal,
            },
          });

          boletoIndex++;
        }
      }
    });

    revalidatePath("/dashboard/emergencias");
    return { success: true, message: "Despacho de emergencia autorizado y ejecutado exitosamente." };
  } catch (err: any) {
    console.error("Error al autorizar despacho extraordinario:", err);
    return { success: false, error: err.message || "Error al procesar el despacho de emergencia." };
  }
}