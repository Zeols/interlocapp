"use server";

import prisma from "@/backend/db";
import { getCurrentUserAction } from "@/backend/actions/auth";
import { revalidatePath } from "next/cache";

const SUPERVISOR_EMERGENCIAS_ROLES = ["SUPER_ADMIN", "ADMIN_COOP", "CHEQUEADOR"];

export async function registrarEmergenciaAyudanteAction(payload: {
  idViaje: number;
  tipo: "AVERIA_MECANICA" | "ACCIDENTE" | "RETRASO" | "OTRO";
  descripcion: string;
}) {
  try {
    const user = await getCurrentUserAction();
    if (!user || !["AYUDANTE", "CHOFER"].includes(user.rolNombre)) {
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
    if (!user || !SUPERVISOR_EMERGENCIAS_ROLES.includes(user.rolNombre)) {
      return { success: false, error: "No autorizado." };
    }

    const coopFilter = user.rolNombre !== "SUPER_ADMIN" && user.idCooperativa ? user.idCooperativa : undefined;

    const incidentes = await prisma.incidente.findMany({
      where: coopFilter
        ? {
            despacho: {
              viaje: {
                ruta: { idCooperativa: coopFilter },
              },
            },
          }
        : undefined,
      include: {
        despacho: {
          include: {
            viaje: {
              include: {
                ruta: true,
                boletos: {
                  where: { estado: { in: ["PAGADO", "ABORDADO"] } },
                  select: { idBoleto: true},
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

    const unidadesIds = incidentes
      .map((inc) => inc.despacho?.asignacionUnidad?.idUnidad)
      .filter((id): id is number => typeof id === "number");

    const asignacionesAyudantes =
      unidadesIds.length > 0
        ? await prisma.asignacionUnidad.findMany({
            where: {
              idUnidad: { in: unidadesIds },
              usuario: {
                rol: { nombre: { in: ["AYUDANTE", "COBRADOR"] } },
              },
            },
            orderBy: { fechaHInicio: "desc" },
            include: { usuario: true },
          })
        : [];

    const incidentesConAyudante = incidentes.map((inc) => {
      const uId = inc.despacho?.asignacionUnidad?.idUnidad;
      const asignacionAyudante = asignacionesAyudantes.find((a) => a.idUnidad === uId);
      return {
        ...inc,
        ayudanteOriginal: asignacionAyudante?.usuario || null,
      };
    });

    return { success: true, data: incidentesConAyudante };
  } catch (err: any) {
    console.error("Error al obtener incidentes para chequeador:", err);
    return { success: false, error: "Error al cargar incidentes de ruta." };
  }
}

export async function getDatosGestionEmergenciaAction(idCooperativa?: number) {
  try {
    const user = await getCurrentUserAction();
    if (!user || !SUPERVISOR_EMERGENCIAS_ROLES.includes(user.rolNombre)) {
      return { success: false, error: "No autorizado." };
    }

    const effectiveCoopId =
      user.rolNombre !== "SUPER_ADMIN" && user.idCooperativa ? user.idCooperativa : idCooperativa;

    const incidentes = await prisma.incidente.findMany({
      where: {
        estado: { not: "RESUELTO" },
        ...(effectiveCoopId
          ? {
              despacho: {
                viaje: {
                  ruta: { idCooperativa: effectiveCoopId },
                },
              },
            }
          : {}),
      },
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

    const unidadesIds = incidentes
      .map((inc) => inc.despacho?.asignacionUnidad?.idUnidad)
      .filter((id): id is number => typeof id === "number");

    const asignacionesAyudantes =
      unidadesIds.length > 0
        ? await prisma.asignacionUnidad.findMany({
            where: {
              idUnidad: { in: unidadesIds },
              usuario: {
                rol: { nombre: { in: ["AYUDANTE", "COBRADOR"] } },
              },
            },
            orderBy: { fechaHInicio: "desc" },
            include: { usuario: true },
          })
        : [];

    const incidentesConAyudante = incidentes.map((inc) => {
      const uId = inc.despacho?.asignacionUnidad?.idUnidad;
      const asignacionAyudante = asignacionesAyudantes.find((a) => a.idUnidad === uId);
      return {
        ...inc,
        ayudanteOriginal: asignacionAyudante?.usuario || null,
      };
    });

    // 1. Obtener los IDs de todos los usuarios (choferes y ayudantes) y unidades que tienen una asignación activa
    const asignacionesActivas = await prisma.asignacionUnidad.findMany({
      where: { estado: "INICIADA" },
      select: { idUsuario: true, idUnidad: true },
    });

    const idsUsuariosOcupados = Array.from(new Set(asignacionesActivas.map((a) => a.idUsuario)));
    const idsUnidadesOcupadas = Array.from(new Set(asignacionesActivas.map((a) => a.idUnidad)));

    const unidadesDisponibles = await prisma.unidad.findMany({
      where: {
        ...(effectiveCoopId ? { idCooperativa: effectiveCoopId } : {}),
        estado: "DISPONIBLE",
        ...(idsUnidadesOcupadas.length > 0 ? { idUnidad: { notIn: idsUnidadesOcupadas } } : {}),
      },
      include: {
        tipoUnidad: true,
        asientos: true,
      },
    });

    // 2. Filtrar choferes que NO estén ocupados en otro viaje activo
    const choferes = await prisma.usuario.findMany({
      where: {
        ...(effectiveCoopId ? { idCooperativa: effectiveCoopId } : {}),
        rol: { nombre: "CHOFER" },
        estado: "ACTIVO",
        idUsuario: { notIn: idsUsuariosOcupados.length > 0 ? idsUsuariosOcupados : [-1] },
      },
    });

    // 3. Filtrar ayudantes que NO estén ocupados en otro viaje activo
    const ayudantes = await prisma.usuario.findMany({
      where: {
        ...(effectiveCoopId ? { idCooperativa: effectiveCoopId } : {}),
        rol: { nombre: { in: ["AYUDANTE", "COBRADOR"] } },
        estado: "ACTIVO",
        idUsuario: { notIn: idsUsuariosOcupados.length > 0 ? idsUsuariosOcupados : [-1] },
      },
    });

    return { success: true, data: { incidentes: incidentesConAyudante, unidadesDisponibles, choferes, ayudantes } };
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
    if (!user || !SUPERVISOR_EMERGENCIAS_ROLES.includes(user.rolNombre)) {
      return { success: false, error: "No autorizado." };
    }

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
                usuario: true, // Chofer original
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
    const choferOriginalId = incidente.despacho.asignacionUnidad.idUsuario;

    // Buscar el ayudante original real de la unidad afectada
    const asignacionAyudanteOriginal = await prisma.asignacionUnidad.findFirst({
      where: {
        idUnidad: unidadAfectada.idUnidad,
        idUsuario: { not: choferOriginalId },
        usuario: {
          rol: { nombre: { in: ["AYUDANTE", "COBRADOR"] } },
        },
      },
      orderBy: { fechaHInicio: "desc" },
      include: { usuario: true },
    });
    const ayudanteOriginalId = asignacionAyudanteOriginal?.idUsuario || null;

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
      const ahora = new Date();

      // 1. Resolver incidente
      await tx.incidente.update({
        where: { idIncidente },
        data: { estado: "RESUELTO" },
      });

      // 2. Enviar unidad afectada a mantenimiento y finalizar sus asignaciones activas
      await tx.unidad.update({
        where: { idUnidad: unidadAfectada.idUnidad },
        data: { estado: "MANTENIMIENTO" },
      });

      await tx.asignacionUnidad.updateMany({
        where: { idUnidad: unidadAfectada.idUnidad, estado: "INICIADA" },
        data: { estado: "FINALIZADA", fechaHFin: ahora },
      });

      // Liberar asientos de la unidad averiada
      await tx.asiento.updateMany({
        where: { idUnidad: unidadAfectada.idUnidad },
        data: { estado: "DISPONIBLE" },
      });

      // 3. Cancelar viaje original
      await tx.viaje.update({
        where: { idViaje: viajeOriginal.idViaje },
        data: { estado: "CANCELADO" },
      });

      let boletoIndex = 0;

      // 4. Iterar sobre las unidades de repuesto asignando viaje, personal y pasaje
      for (let i = 0; i < unidadesRepuesto.length; i++) {
        const unidadRepuesto = unidadesRepuesto[i];
        const choferId = idsChoferes[i];

        // Cada despacho requiere un idViaje único (@unique en Despacho)
        const viajeUnidad = await tx.viaje.create({
          data: {
            idRuta: viajeOriginal.idRuta,
            fecha: ahora,
            hrSalidaProgramada: ahora,
            sentido: i === 0
              ? `${viajeOriginal.sentido ?? "RUTA"} (DESPACHO EXTRAORDINARIO)`
              : `${viajeOriginal.sentido ?? "RUTA"} (DESPACHO EXTRAORDINARIO - U${i + 1})`,
            estado: "EN_CURSO",
          },
        });

        // Definir el ayudante según las reglas de negocio
        let ayudanteId: number | null = null;
        if (i === 0 && mantenerAyudanteOriginal && ayudanteOriginalId) {
          ayudanteId = ayudanteOriginalId;
        } else {
          const indexAyudante = (i === 0 || !mantenerAyudanteOriginal) ? i : i - 1;
          if (idsAyudantesAdicionales && idsAyudantesAdicionales.length > indexAyudante) {
            ayudanteId = idsAyudantesAdicionales[indexAyudante];
          }
        }

        // Asignar Chofer
        const asignacionChofer = await tx.asignacionUnidad.create({
          data: {
            idUnidad: unidadRepuesto.idUnidad,
            idUsuario: choferId,
            fechaHInicio: ahora,
            estado: "INICIADA",
          },
        });

        // Asignar Ayudante si aplica
        if (ayudanteId) {
          await tx.asignacionUnidad.create({
            data: {
              idUnidad: unidadRepuesto.idUnidad,
              idUsuario: ayudanteId,
              fechaHInicio: ahora,
              estado: "INICIADA",
            },
          });
        }

        // Crear despacho vinculado al viaje de esta unidad y la asignación del chofer
        await tx.despacho.create({
          data: {
            idViaje: viajeUnidad.idViaje,
            idAsignacion: asignacionChofer.idAsignacion,
            estado: "EN_CURSO",
            observacion: `Despacho extraordinario por emergencia (Incidente #${idIncidente}) - Unidad ${unidadRepuesto.numeroUnidad}`,
            fechaHora: ahora,
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
            observacion: `Transbordo de ${pasajerosEnEstaUnidad} pasajeros a la unidad ${unidadRepuesto.numeroUnidad} con chofer ID ${choferId}${ayudanteId ? ` y ayudante ID ${ayudanteId}` : ""}`,
          },
        });

        // Migrar boletos y asientos
        for (let j = 0; j < pasajerosEnEstaUnidad; j++) {
          const boletoActual = boletosVarados[boletoIndex];
          const asientoDestino = asientosUnidad[j];

          const idAsientoFinal =
            unidadesRepuesto.length === 1 && boletoActual.idAsiento
              ? boletoActual.idAsiento
              : (asientoDestino ? asientoDestino.idAsiento : boletoActual.idAsiento);

          if (idAsientoFinal) {
            await tx.asiento.update({
              where: { idAsiento: idAsientoFinal },
              data: { estado: "OCUPADO" },
            });
          }

          await tx.boleto.update({
            where: { idBoleto: boletoActual.idBoleto },
            data: {
              idViaje: viajeUnidad.idViaje,
              idAsiento: idAsientoFinal,
            },
          });

          boletoIndex++;
        }
      }
    });

    revalidatePath("/dashboard/emergencias");
    revalidatePath("/dashboard/ayudante");
    revalidatePath("/dashboard/viajes");
    revalidatePath("/dashboard");
    revalidatePath("/trips");
    return { success: true, message: "Despacho de emergencia autorizado y ejecutado exitosamente." };
  } catch (err: any) {
    console.error("Error al autorizar despacho extraordinario:", err);
    return { success: false, error: err.message || "Error al procesar el despacho de emergencia." };
  }
}
