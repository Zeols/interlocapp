'use server';

import { prisma } from '../db';
import { revalidatePath } from 'next/cache';

export interface ViajeInput {
  idRuta: number;
  fecha: string;
  hrSalidaProgramada: string;
  sentido?: string;
}

export interface AsignacionInput {
  idUnidad: number;
  idUsuarios?: number[];
  idUsuario?: number;
  fechaHInicio?: string;
}

export interface DespachoInput {
  idViaje: number;
  idAsignacion: number;
  observacion?: string;
}

// -------------------------------------------------------------
// 1. CONSULTA DE PERSONAL POR ROL
// -------------------------------------------------------------

export async function getChoferesByCooperativa(idCooperativa: number) {
  try {
    const choferes = await prisma.usuario.findMany({
      where: {
        idCooperativa,
        rol: { nombre: 'CHOFER' },
        estado: 'ACTIVO',
      },
      include: { rol: true },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: choferes };
  } catch (error) {
    console.error('Error al obtener choferes:', error);
    return { success: false, error: 'No se pudieron cargar los choferes.' };
  }
}

export async function getAyudantesByCooperativa(idCooperativa: number) {
  try {
    const ayudantes = await prisma.usuario.findMany({
      where: {
        idCooperativa,
        rol: { nombre: { in: ['AYUDANTE', 'COBRADOR'] } },
        estado: 'ACTIVO',
      },
      include: { rol: true },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: ayudantes };
  } catch (error) {
    console.error('Error al obtener ayudantes:', error);
    return { success: false, error: 'No se pudieron cargar los ayudantes.' };
  }
}

// -------------------------------------------------------------
// 2. PROGRAMACIÓN Y ASIGNACIÓN DE TRIPULACIÓN MULTI-USUARIO
// -------------------------------------------------------------

export async function createViaje(data: ViajeInput) {
  try {
    const nuevoViaje = await prisma.viaje.create({
      data: {
        idRuta: data.idRuta,
        fecha: new Date(data.fecha),
        hrSalidaProgramada: new Date(data.hrSalidaProgramada),
        sentido: data.sentido || 'IDA',
        estado: 'PROGRAMADO',
      },
    });

    revalidatePath('/admin/viajes');
    return { success: true, data: nuevoViaje };
  } catch (error) {
    console.error('Error al crear viaje:', error);
    return { success: false, error: 'No se pudo programar el viaje.' };
  }
}

export async function createAsignacionUnidad(data: AsignacionInput) {
  try {
    const listaUsuarios = data.idUsuarios
      ? data.idUsuarios
      : data.idUsuario
        ? [data.idUsuario]
        : [];

    if (listaUsuarios.length === 0) {
      return { success: false, error: 'Debe especificar al menos un usuario para asignar.' };
    }

    const unidad = await prisma.unidad.findUnique({
      where: { idUnidad: data.idUnidad },
    });
    if (!unidad) {
      return { success: false, error: `La unidad con ID ${data.idUnidad} no existe.` };
    }

    const usuarios = await prisma.usuario.findMany({
      where: { idUsuario: { in: listaUsuarios } },
      include: { rol: true },
    });

    if (usuarios.length !== listaUsuarios.length) {
      return { success: false, error: 'Uno o más usuarios seleccionados no existen en la BD.' };
    }

    const fechaInicio = data.fechaHInicio ? new Date(data.fechaHInicio) : new Date();

    const asignaciones = await prisma.$transaction(
      listaUsuarios.map((idUsuario) =>
        prisma.asignacionUnidad.create({
          data: {
            idUnidad: data.idUnidad,
            idUsuario,
            fechaHInicio: fechaInicio,
            estado: 'INICIADA',
          },
          include: {
            unidad: true,
            usuario: {
              include: { rol: true },
            },
          },
        })
      )
    );

    return {
      success: true,
      data: asignaciones,
      asignacionPrincipal: asignaciones[0],
    };
  } catch (error) {
    console.error('Error al asignar unidad:', error);
    return { success: false, error: 'Error al registrar la asignación de la tripulación.' };
  }
}

// -------------------------------------------------------------
// 3. DESPACHO Y FINALIZACIÓN DE VIAJE
// -------------------------------------------------------------

export async function despacharViaje(data: DespachoInput) {
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const despacho = await tx.despacho.create({
        data: {
          idViaje: data.idViaje,
          idAsignacion: data.idAsignacion,
          observacion: data.observacion || null,
          estado: 'EN_CURSO',
        },
      });

      await tx.viaje.update({
        where: { idViaje: data.idViaje },
        data: {
          estado: 'EN_CURSO',
          hrSalidaEstimada: new Date(),
        },
      });

      return despacho;
    });

    revalidatePath('/admin/viajes');
    return { success: true, data: resultado };
  } catch (error) {
    console.error('Error al despachar viaje:', error);
    return { success: false, error: 'Error al iniciar el despacho del viaje.' };
  }
}

export async function finalizarViaje(idViaje: number) {
  try {
    await prisma.$transaction(async (tx) => {
      const viaje = await tx.viaje.findUnique({
        where: { idViaje },
        include: {
          despacho: {
            include: { asignacionUnidad: true },
          },
        },
      });

      if (!viaje || !viaje.despacho) {
        throw new Error('El viaje especificado no existe o no ha sido despachado.');
      }

      await tx.viaje.update({
        where: { idViaje },
        data: {
          estado: 'FINALIZADO',
          hrLlegadaReal: new Date(),
        },
      });

      await tx.despacho.update({
        where: { idViaje },
        data: { estado: 'FINALIZADO' },
      });

      const idAsignacion = viaje.despacho.idAsignacion;
      const asignacion = await tx.asignacionUnidad.update({
        where: { idAsignacion },
        data: {
          estado: 'FINALIZADA',
          fechaHFin: new Date(),
        },
      });

      await tx.unidad.update({
        where: { idUnidad: asignacion.idUnidad },
        data: { estado: 'DISPONIBLE' },
      });

      await tx.asiento.updateMany({
        where: { idUnidad: asignacion.idUnidad, estado: 'OCUPADO' },
        data: { estado: 'DISPONIBLE' },
      });
    });

    revalidatePath('/admin/viajes');
    return { success: true, message: 'Viaje finalizado correctamente.' };
  } catch (error: any) {
    console.error('Error al finalizar viaje:', error);
    return { success: false, error: error.message || 'Error al finalizar el viaje.' };
  }
}

export async function getViajesByCooperativa(idCooperativa: number) {
  try {
    const viajes = await prisma.viaje.findMany({
      where: { ruta: { idCooperativa } },
      include: {
        ruta: true,
        despacho: {
          include: {
            asignacionUnidad: {
              include: {
                unidad: true,
                usuario: {
                  include: { rol: true },
                },
              },
            },
          },
        },
      },
      orderBy: { hrSalidaProgramada: 'asc' },
    });

    const viajesConTripulacionCompleta = await Promise.all(
      viajes.map(async (v) => {
        if (!v.despacho) return v;

        const idUnidad = v.despacho.asignacionUnidad.idUnidad;

        const asignacionesTripulacion = await prisma.asignacionUnidad.findMany({
          where: { idUnidad, estado: 'INICIADA' },
          include: {
            usuario: {
              include: { rol: true },
            },
          },
        });

        return {
          ...v,
          despacho: {
            ...v.despacho,
            tripulacion: asignacionesTripulacion.map((a) => a.usuario),
          },
        };
      })
    );

    return { success: true, data: viajesConTripulacionCompleta };
  } catch (error) {
    console.error('Error al obtener viajes:', error);
    return { success: false, error: 'No se pudieron consultar los viajes.' };
  }
}

// -------------------------------------------------------------
// 4. CREACIÓN RÁPIDA DE USUARIOS PARA PRUEBAS
// -------------------------------------------------------------

export async function createChofer(data: { idCooperativa: number; nombre: string; apellido: string; usuario: string }) {
  try {
    let rol = await prisma.rol.findFirst({ where: { nombre: 'CHOFER' } });
    if (!rol) {
      rol = await prisma.rol.create({ data: { nombre: 'CHOFER', descripcion: 'Conductor de unidad' } });
    }

    const chofer = await prisma.usuario.create({
      data: {
        idCooperativa: data.idCooperativa,
        idRol: rol.idRol,
        nombre: data.nombre,
        apellido: data.apellido,
        usuario: data.usuario,
        passwd: 'password_segura',
        correo: `${data.usuario}@cooperativa.com`,
        estado: 'ACTIVO',
      },
      include: { rol: true },
    });

    return { success: true, data: chofer };
  } catch (error) {
    return { success: false, error: 'No se pudo crear el chofer.' };
  }
}

export async function createAyudante(data: { idCooperativa: number; nombre: string; apellido: string; usuario: string }) {
  try {
    let rol = await prisma.rol.findFirst({ where: { nombre: 'AYUDANTE' } });
    if (!rol) {
      rol = await prisma.rol.create({ data: { nombre: 'AYUDANTE', descripcion: 'Colector de autobús' } });
    }

    const ayudante = await prisma.usuario.create({
      data: {
        idCooperativa: data.idCooperativa,
        idRol: rol.idRol,
        nombre: data.nombre,
        apellido: data.apellido,
        usuario: data.usuario,
        passwd: 'password_segura',
        correo: `${data.usuario}@cooperativa.com`,
        estado: 'ACTIVO',
      },
      include: { rol: true },
    });

    return { success: true, data: ayudante };
  } catch (error) {
    return { success: false, error: 'No se pudo crear el ayudante.' };
  }
}

// -------------------------------------------------------------
// 5. CONSULTA PÚBLICA DE VIAJES DISPONIBLES (PARA PASAJEROS)
// -------------------------------------------------------------

export interface ViajeDisponibleItem {
  id: number;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: string;
  cooperative: string;
  price: number;
  schedule: "mañana" | "tarde" | "noche";
  type: string;
  occupancy: number;
}

export async function getViajesDisponiblesAction(filters?: {
  origin?: string;
  destination?: string;
  date?: string;
}): Promise<{ success: boolean; data: ViajeDisponibleItem[]; error?: string }> {
  try {
    const whereClause: any = {
      estado: { in: ['PROGRAMADO', 'EN_CURSO'] },
    };

    if (filters?.date) {
      const parsedDate = new Date(filters.date);
      if (!isNaN(parsedDate.getTime())) {
        whereClause.fecha = parsedDate;
      }
    }

    const viajes = await prisma.viaje.findMany({
      where: whereClause,
      include: {
        ruta: {
          include: {
            cooperativa: true,
            puntosRuta: {
              include: { punto: true },
              orderBy: { orden: 'asc' },
            },
            tarifas: {
              where: { estado: 'ACTIVO' },
              orderBy: { monto: 'asc' },
            },
          },
        },
        despacho: {
          include: {
            asignacionUnidad: {
              include: {
                unidad: {
                  include: {
                    asientos: true,
                  },
                },
              },
            },
          },
        },
        boletos: {
          where: { estado: { not: 'CANCELADO' } },
        },
      },
      orderBy: { hrSalidaProgramada: 'asc' },
    });

    const items: ViajeDisponibleItem[] = viajes.map((v) => {
      const puntos = v.ruta.puntosRuta.map((pr) => pr.punto.nombre);
      const origin = puntos[0] || v.ruta.nombre.split('-')[0]?.trim() || 'Origen';
      const destination = puntos[puntos.length - 1] || v.ruta.nombre.split('-')[1]?.trim() || 'Destino';

      const salidaDate = new Date(v.hrSalidaProgramada);
      const departure = !isNaN(salidaDate.getTime())
        ? salidaDate.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '06:00 AM';

      const arrivalDate = new Date(salidaDate.getTime() + 2 * 60 * 60 * 1000);
      const arrival = !isNaN(arrivalDate.getTime())
        ? arrivalDate.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '08:00 AM';

      const hour = salidaDate.getHours();
      const schedule: 'mañana' | 'tarde' | 'noche' = hour < 12 ? 'mañana' : hour < 18 ? 'tarde' : 'noche';

      const price = v.ruta.tarifas[0]?.monto ? Number(v.ruta.tarifas[0].monto) : 80;

      const totalSeats = v.despacho?.asignacionUnidad?.unidad?.asientos?.length || 15;
      const occupiedSeats = v.boletos.length;
      const occupancy = totalSeats > 0 ? Math.min(100, Math.round((occupiedSeats / totalSeats) * 100)) : 0;

      return {
        id: v.idViaje,
        origin,
        destination,
        departure,
        arrival,
        duration: '2h 00min',
        cooperative: v.ruta.cooperativa.nombre,
        price,
        schedule,
        type: 'Directo',
        occupancy,
      };
    });

    const filtered = items.filter((item) => {
      if (filters?.origin && !item.origin.toLowerCase().includes(filters.origin.toLowerCase())) {
        return false;
      }
      if (filters?.destination && !item.destination.toLowerCase().includes(filters.destination.toLowerCase())) {
        return false;
      }
      return true;
    });

    return { success: true, data: filtered };
  } catch (error) {
    console.error('Error al consultar viajes disponibles:', error);
    return { success: false, error: 'No se pudieron consultar los viajes disponibles.', data: [] };
  }
}

// -------------------------------------------------------------
// 6. GESTIÓN DE JORNADA Y PARADAS EN TIEMPO REAL PARA TRIPULACIÓN (AYUDANTE / CHOFER)
// -------------------------------------------------------------

export async function getViajeActivoAyudanteAction(idUsuario: number) {
  try {
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);

    const asignacion = await prisma.asignacionUnidad.findFirst({
      where: {
        idUsuario: idUsuario,
        estado: 'INICIADA',
        fechaHInicio: {
          gte: hoyInicio,
          lte: hoyFin,
        },
      },
    });

    if (!asignacion) {
      return {
        success: false,
        error: 'No tienes ninguna unidad asignada activa para el día de hoy.',
      };
    }

    const unidad = await prisma.unidad.findUnique({
      where: { idUnidad: asignacion.idUnidad },
    });

    if (!unidad) {
      return {
        success: false,
        error: 'No se encontró la unidad asignada.',
      };
    }

    let viajeObjetivo: any = null;

    const despacho = await prisma.despacho.findFirst({
      where: {
        idAsignacion: asignacion.idAsignacion,
      },
    });

    if (despacho && despacho.idViaje) {
      viajeObjetivo = await prisma.viaje.findUnique({
        where: { idViaje: despacho.idViaje },
        include: {
          ruta: {
            include: {
              puntosRuta: {
                include: { punto: true },
                orderBy: { orden: 'asc' },
              },
            },
          },
          controlesViaje: {
            include: { puntoRuta: true },
            orderBy: { fechaHora: 'desc' },
            take: 1,
          },
        },
      });
    }

    if (!viajeObjetivo) {
      viajeObjetivo = await prisma.viaje.findFirst({
        where: {
          fecha: {
            gte: hoyInicio,
            lte: hoyFin,
          },
          ruta: {
            idCooperativa: unidad.idCooperativa,
          },
          estado: { in: ['EN_CURSO', 'PROGRAMADO'] },
        },
        include: {
          ruta: {
            include: {
              puntosRuta: {
                include: { punto: true },
                orderBy: { orden: 'asc' },
              },
            },
          },
          controlesViaje: {
            include: { puntoRuta: true },
            orderBy: { fechaHora: 'desc' },
            take: 1,
          },
        },
      });
    }

    if (!viajeObjetivo) {
      return {
        success: false,
        error: 'No se encontró un viaje activo o programado para tu unidad el día de hoy.',
      };
    }

    const paradasList = viajeObjetivo.ruta.puntosRuta.map((pr: any) => ({
      id: pr.punto.idPunto,
      idPuntoRuta: pr.idPuntoRuta,
      nombre: pr.punto.nombre,
    }));

    // Determinamos el último punto reportado en la tabla controles_viaje
    const ultimoControl = viajeObjetivo.controlesViaje?.[0];
    let ultimaParadaId = null;

    if (ultimoControl) {
      const matchPuntoRuta = viajeObjetivo.ruta.puntosRuta.find(
        (pr: any) => pr.idPuntoRuta === ultimoControl.idPuntoRuta
      );
      if (matchPuntoRuta) {
        ultimaParadaId = matchPuntoRuta.punto.idPunto;
      }
    }

    return {
      success: true,
      data: {
        idViaje: viajeObjetivo.idViaje,
        rutaNombre: viajeObjetivo.ruta.nombre,
        sentido: viajeObjetivo.sentido || 'IDA', // Incluye el sentido (IDA / RETORNO)
        busNumero: unidad.numeroUnidad || `Unidad #${unidad.idUnidad}`,
        busPlaca: unidad.placa || 'Sin placa',
        paradaActualId: ultimaParadaId || paradasList[0]?.id || null,
        paradas: paradasList,
      },
    };
  } catch (error) {
    console.error('Error al obtener viaje activo del ayudante:', error);
    return {
      success: false,
      error: 'Ocurrió un error al consultar la jornada operativa.',
    };
  }
}

export async function actualizarParadaActualAction(idViaje: number, idPunto: number) {
  try {
    // 1. Buscamos el viaje con su ruta, puntos ordenados y el despacho asociado
    const viaje = await prisma.viaje.findUnique({
      where: { idViaje },
      include: {
        ruta: {
          include: {
            puntosRuta: {
              orderBy: { orden: 'asc' },
            },
          },
        },
        despacho: {
          include: { asignacionUnidad: true },
        },
      },
    });

    if (!viaje) {
      return { success: false, error: 'Viaje no encontrado.' };
    }

    const puntosRuta = viaje.ruta.puntosRuta;
    const puntoRutaEncontrado = puntosRuta.find((pr) => pr.idPunto === idPunto);

    if (!puntoRutaEncontrado) {
      return { success: false, error: 'El punto seleccionado no pertenece a la ruta de este viaje.' };
    }

    // 2. Verificamos si es el último punto (punto final de la ruta)
    const esPuntoFinal = puntosRuta[puntosRuta.length - 1].idPuntoRuta === puntoRutaEncontrado.idPuntoRuta;

    // 3. Ejecutamos la transacción en la base de datos
    await prisma.$transaction(async (tx) => {
      // Registramos el control en la tabla controles_viaje
      await tx.controlViaje.create({
        data: {
          idViaje: idViaje,
          idPuntoRuta: puntoRutaEncontrado.idPuntoRuta,
          fechaHora: new Date(),
        },
      });

      // Si es la última parada, finalizamos el viaje automáticamente
      if (esPuntoFinal) {
        await tx.viaje.update({
          where: { idViaje },
          data: {
            estado: 'FINALIZADO',
            hrLlegadaReal: new Date(), // Se registra la hora real de llegada
          },
        });

        if (viaje.despacho) {
          await tx.despacho.update({
            where: { idViaje },
            data: { estado: 'FINALIZADO' },
          });

          const asignacion = await tx.asignacionUnidad.update({
            where: { idAsignacion: viaje.despacho.idAsignacion },
            data: {
              estado: 'FINALIZADA',
              fechaHFin: new Date(),
            },
          });

          // Liberamos la unidad y los asientos
          await tx.unidad.update({
            where: { idUnidad: asignacion.idUnidad },
            data: { estado: 'DISPONIBLE' },
          });

          await tx.asiento.updateMany({
            where: { idUnidad: asignacion.idUnidad, estado: 'OCUPADO' },
            data: { estado: 'DISPONIBLE' },
          });
        }
      }
    });

    revalidatePath('/dashboard');
    return { success: true, esPuntoFinal };
  } catch (error) {
    console.error('Error al registrar la parada actual del viaje en controles_viaje:', error);
    return {
      success: false,
      error: 'No se pudo actualizar la posición de la parada en el sistema.',
    };
  }
}