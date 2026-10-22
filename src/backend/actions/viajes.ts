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

    revalidatePath('/dashboard/viajes');
    revalidatePath('/dashboard');
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

    revalidatePath('/dashboard/viajes');
    revalidatePath('/dashboard');
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

    revalidatePath('/dashboard/viajes');
    revalidatePath('/dashboard');
    return { success: true, message: 'Viaje finalizado correctamente.' };
  } catch (error: any) {
    console.error('Error al finalizar viaje:', error);
    return { success: false, error: error.message || 'Error al finalizar el viaje.' };
  }
}

export interface ViajeMonitorItem {
  idViaje: number;
  idRuta: number;
  rutaNombre: string;
  cooperativaId: number;
  cooperativaNombre: string;
  fecha: string;
  hrSalidaProgramada: string;
  hrSalidaEstimada: string | null;
  hrLlegadaReal: string | null;
  sentido: string;
  estado: string;
  paradas: string[];
  unidad: {
    idUnidad: number;
    numeroUnidad: string;
    placa: string;
    capacidad: number;
    tipo: string;
  } | null;
  tripulacion: {
    chofer: { idUsuario: number; nombre: string; correo: string; telefono?: string | null } | null;
    ayudante: { idUsuario: number; nombre: string; correo: string; telefono?: string | null } | null;
  };
  ocupacion: {
    totalAsientos: number;
    boletosVendidos: number;
    porcentaje: number;
  };
  ultimaParada: {
    nombre: string;
    fechaHora: string;
  } | null;
  despacho: {
    idDespacho: number;
    fechaHora: string;
    estado: string;
    observacion?: string | null;
  } | null;
}

export async function getViajesByCooperativa(idCooperativa?: number): Promise<{ success: boolean; data: ViajeMonitorItem[]; error?: string }> {
  try {
    const whereClause: any = {};
    if (idCooperativa) {
      whereClause.ruta = { idCooperativa };
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
          },
        },
        despacho: {
          include: {
            asignacionUnidad: {
              include: {
                unidad: {
                  include: {
                    tipoUnidad: true,
                    asientos: true,
                  },
                },
                usuario: {
                  include: { rol: true },
                },
              },
            },
          },
        },
        controlesViaje: {
          include: {
            puntoRuta: {
              include: { punto: true },
            },
          },
          orderBy: { fechaHora: 'desc' },
          take: 1,
        },
        boletos: {
          where: { estado: { not: 'CANCELADO' } },
          select: { idBoleto: true, estado: true },
        },
      },
      orderBy: { hrSalidaProgramada: 'asc' },
    });

    const items: ViajeMonitorItem[] = await Promise.all(
      viajes.map(async (v) => {
        let chofer: any = null;
        let ayudante: any = null;
        let unidadData: any = null;

        if (v.despacho?.asignacionUnidad) {
          const u = v.despacho.asignacionUnidad.unidad;
          unidadData = {
            idUnidad: u.idUnidad,
            numeroUnidad: u.numeroUnidad,
            placa: u.placa,
            capacidad: u.asientos.length || 15,
            tipo: u.tipoUnidad?.nombre || 'Microbús Interlocal',
          };

          // Obtenemos todos los operarios asignados a esa unidad en esta jornada
          const asignacionesTripulacion = await prisma.asignacionUnidad.findMany({
            where: {
              idUnidad: u.idUnidad,
              estado: 'INICIADA',
            },
            include: {
              usuario: {
                include: { rol: true },
              },
            },
          });

          for (const a of asignacionesTripulacion) {
            const user = a.usuario;
            const rolName = user.rol.nombre.toUpperCase();
            const operario = {
              idUsuario: user.idUsuario,
              nombre: `${user.nombre} ${user.apellido}`.trim(),
              correo: user.correo,
              telefono: user.telefono,
            };
            if (rolName === 'CHOFER') {
              chofer = operario;
            } else if (rolName === 'AYUDANTE' || rolName === 'COBRADOR') {
              ayudante = operario;
            }
          }

          // Respaldo: si el usuario de la asignación principal es Chofer
          if (!chofer && v.despacho.asignacionUnidad.usuario) {
            const uMain = v.despacho.asignacionUnidad.usuario;
            chofer = {
              idUsuario: uMain.idUsuario,
              nombre: `${uMain.nombre} ${uMain.apellido}`.trim(),
              correo: uMain.correo,
              telefono: uMain.telefono,
            };
          }
        }

        const paradasNombres = v.ruta.puntosRuta.map((pr) => pr.punto.nombre);
        const totalAsientos = unidadData?.capacidad || 15;
        const boletosVendidos = v.boletos.length;
        const porcentaje = Math.min(100, Math.round((boletosVendidos / totalAsientos) * 100));

        const lastControl = v.controlesViaje?.[0];
        const ultimaParada = lastControl
          ? {
              nombre: lastControl.puntoRuta.punto.nombre,
              fechaHora: lastControl.fechaHora.toISOString(),
            }
          : null;

        return {
          idViaje: v.idViaje,
          idRuta: v.idRuta,
          rutaNombre: v.ruta.nombre,
          cooperativaId: v.ruta.cooperativa.idCooperativa,
          cooperativaNombre: v.ruta.cooperativa.nombre,
          fecha: v.fecha.toISOString(),
          hrSalidaProgramada: v.hrSalidaProgramada.toISOString(),
          hrSalidaEstimada: v.hrSalidaEstimada ? v.hrSalidaEstimada.toISOString() : null,
          hrLlegadaReal: v.hrLlegadaReal ? v.hrLlegadaReal.toISOString() : null,
          sentido: v.sentido || 'IDA',
          estado: v.estado,
          paradas: paradasNombres,
          unidad: unidadData,
          tripulacion: { chofer, ayudante },
          ocupacion: {
            totalAsientos,
            boletosVendidos,
            porcentaje,
          },
          ultimaParada,
          despacho: v.despacho
            ? {
                idDespacho: v.despacho.idDespacho,
                fechaHora: v.despacho.fechaHora.toISOString(),
                estado: v.despacho.estado,
                observacion: v.despacho.observacion,
              }
            : null,
        };
      })
    );

    return { success: true, data: items };
  } catch (error) {
    console.error('Error al obtener viajes para monitor:', error);
    return { success: false, error: 'No se pudieron consultar los viajes del monitor.', data: [] };
  }
}

// -------------------------------------------------------------
// 3.1 DESPACHO COMPLETO ATÓMICO (UNIDAD + CHOFER + AYUDANTE)
// -------------------------------------------------------------

export interface DespachoCompletoInput {
  idViaje: number;
  idUnidad: number;
  idChofer: number;
  idAyudante?: number;
  observacion?: string;
}

export async function despacharViajeCompletoAction(data: DespachoCompletoInput) {
  try {
    const { idViaje, idUnidad, idChofer, idAyudante, observacion } = data;

    const viaje = await prisma.viaje.findUnique({
      where: { idViaje },
      include: { despacho: true },
    });
    if (!viaje) {
      return { success: false, error: 'El viaje especificado no existe.' };
    }
    if (viaje.estado !== 'PROGRAMADO') {
      return { success: false, error: `El viaje ya se encuentra en estado ${viaje.estado}.` };
    }

    const unidad = await prisma.unidad.findUnique({
      where: { idUnidad },
    });
    if (!unidad) {
      return { success: false, error: 'La unidad seleccionada no existe.' };
    }

    const chofer = await prisma.usuario.findUnique({
      where: { idUsuario: idChofer },
      include: { rol: true },
    });
    if (!chofer || chofer.rol.nombre !== 'CHOFER') {
      return { success: false, error: 'El usuario seleccionado no es un chofer válido.' };
    }

    let ayudante = null;
    if (idAyudante) {
      ayudante = await prisma.usuario.findUnique({
        where: { idUsuario: idAyudante },
        include: { rol: true },
      });
      if (!ayudante || !['AYUDANTE', 'COBRADOR'].includes(ayudante.rol.nombre)) {
        return { success: false, error: 'El usuario seleccionado no es un ayudante válido.' };
      }
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const fechaInicio = new Date();

      // 1. Asignación del Chofer
      const asignacionChofer = await tx.asignacionUnidad.create({
        data: {
          idUnidad,
          idUsuario: idChofer,
          fechaHInicio: fechaInicio,
          estado: 'INICIADA',
        },
      });

      // 2. Asignación del Ayudante (opcional)
      if (idAyudante) {
        await tx.asignacionUnidad.create({
          data: {
            idUnidad,
            idUsuario: idAyudante,
            fechaHInicio: fechaInicio,
            estado: 'INICIADA',
          },
        });
      }

      // 3. Pasar la unidad a EN_RUTA
      await tx.unidad.update({
        where: { idUnidad },
        data: { estado: 'EN_RUTA' },
      });

      // 4. Crear el registro de Despacho
      const despacho = await tx.despacho.create({
        data: {
          idViaje,
          idAsignacion: asignacionChofer.idAsignacion,
          observacion: observacion || null,
          estado: 'EN_CURSO',
          fechaHora: fechaInicio,
        },
      });

      // 5. Poner el viaje en EN_CURSO
      await tx.viaje.update({
        where: { idViaje },
        data: {
          estado: 'EN_CURSO',
          hrSalidaEstimada: fechaInicio,
        },
      });

      return despacho;
    });

    revalidatePath('/dashboard/viajes');
    revalidatePath('/dashboard');
    return { success: true, data: resultado };
  } catch (error: any) {
    console.error('Error al ejecutar despacho completo:', error);
    return { success: false, error: error.message || 'Error al autorizar y despachar el viaje.' };
  }
}

// -------------------------------------------------------------
// 3.2 CANCELAR SALIDA PROGRAMADA
// -------------------------------------------------------------

export async function cancelarViajeAction(idViaje: number, motivo?: string) {
  try {
    const viaje = await prisma.viaje.findUnique({
      where: { idViaje },
      include: {
        despacho: {
          include: { asignacionUnidad: true },
        },
      },
    });

    if (!viaje) {
      return { success: false, error: 'El viaje no existe.' };
    }

    if (viaje.estado === 'FINALIZADO') {
      return { success: false, error: 'No se puede cancelar un viaje que ya ha finalizado.' };
    }

    await prisma.$transaction(async (tx) => {
      // Si el viaje ya tenía unidad asignada / despacho, liberamos los recursos
      if (viaje.despacho) {
        await tx.despacho.update({
          where: { idViaje },
          data: {
            estado: 'CANCELADO',
            observacion: motivo ? `Cancelado: ${motivo}` : viaje.despacho.observacion,
          },
        });

        const idUnidad = viaje.despacho.asignacionUnidad.idUnidad;
        await tx.asignacionUnidad.updateMany({
          where: { idUnidad, estado: 'INICIADA' },
          data: { estado: 'CANCELADA', fechaHFin: new Date() },
        });

        await tx.unidad.update({
          where: { idUnidad },
          data: { estado: 'DISPONIBLE' },
        });

        await tx.asiento.updateMany({
          where: { idUnidad, estado: 'OCUPADO' },
          data: { estado: 'DISPONIBLE' },
        });
      }

      // Marcamos el viaje como cancelado
      await tx.viaje.update({
        where: { idViaje },
        data: { estado: 'CANCELADO' },
      });
    });

    revalidatePath('/dashboard/viajes');
    revalidatePath('/dashboard');
    return { success: true, message: 'El viaje ha sido cancelado exitosamente.' };
  } catch (error: any) {
    console.error('Error al cancelar viaje:', error);
    return { success: false, error: error.message || 'No se pudo cancelar el viaje.' };
  }
}

// -------------------------------------------------------------
// 3.3 CONSULTA DE RECURSOS PARA PROGRAMACIÓN Y DESPACHO
// -------------------------------------------------------------

export async function getDatosParaDespachoAction(idCooperativa?: number) {
  try {
    const whereCoop = idCooperativa ? { idCooperativa } : {};

    // 1. Unidades disponibles
    const unidades = await prisma.unidad.findMany({
      where: {
        estado: 'DISPONIBLE',
        ...whereCoop,
      },
      include: {
        tipoUnidad: true,
        cooperativa: true,
        asientos: true,
      },
      orderBy: { numeroUnidad: 'asc' },
    });

    // 2. Choferes activos
    const choferes = await prisma.usuario.findMany({
      where: {
        rol: { nombre: 'CHOFER' },
        estado: 'ACTIVO',
        ...whereCoop,
      },
      orderBy: { nombre: 'asc' },
    });

    // 3. Ayudantes / Cobradores activos
    const ayudantes = await prisma.usuario.findMany({
      where: {
        rol: { nombre: { in: ['AYUDANTE', 'COBRADOR'] } },
        estado: 'ACTIVO',
        ...whereCoop,
      },
      orderBy: { nombre: 'asc' },
    });

    // 4. Rutas activas
    const rutas = await prisma.ruta.findMany({
      where: {
        estado: 'ACTIVO',
        ...whereCoop,
      },
      include: {
        cooperativa: true,
        puntosRuta: {
          include: { punto: true },
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return {
      success: true,
      data: {
        unidades: unidades.map((u) => ({
          idUnidad: u.idUnidad,
          numeroUnidad: u.numeroUnidad,
          placa: u.placa,
          tipo: u.tipoUnidad.nombre,
          capacidad: u.asientos.length || 15,
          cooperativa: u.cooperativa.nombre,
        })),
        choferes: choferes.map((c) => ({
          idUsuario: c.idUsuario,
          nombre: `${c.nombre} ${c.apellido}`.trim(),
          telefono: c.telefono,
          correo: c.correo,
        })),
        ayudantes: ayudantes.map((a) => ({
          idUsuario: a.idUsuario,
          nombre: `${a.nombre} ${a.apellido}`.trim(),
          telefono: a.telefono,
          correo: a.correo,
        })),
        rutas: rutas.map((r) => ({
          idRuta: r.idRuta,
          nombre: r.nombre,
          cooperativa: r.cooperativa.nombre,
          paradas: r.puntosRuta.map((pr) => pr.punto.nombre),
        })),
      },
    };
  } catch (error) {
    console.error('Error al consultar datos de despacho:', error);
    return {
      success: false,
      error: 'No se pudieron consultar los recursos de despacho.',
      data: { unidades: [], choferes: [], ayudantes: [], rutas: [] },
    };
  }
}

// -------------------------------------------------------------
// 3.4 MANIFIESTO DE PASAJEROS DEL VIAJE
// -------------------------------------------------------------

export async function getManifiestoPasajerosAction(idViaje: number) {
  try {
    const boletos = await prisma.boleto.findMany({
      where: {
        idViaje,
        estado: { not: 'CANCELADO' },
      },
      include: {
        asiento: true,
        tarifa: {
          include: {
            puntoOrigen: true,
            puntoDestino: true,
          },
        },
        venta: true,
      },
      orderBy: {
        asiento: { numero: 'asc' },
      },
    });

    const pasajeros = boletos.map((b) => ({
      idBoleto: b.idBoleto,
      asientoNumero: b.asiento.numero,
      monto: Number(b.monto),
      estado: b.estado, // 'PAGADO' | 'ABORDADO' | 'RESERVADO'
      fechaHora: b.fechaHora.toISOString(),
      origen: b.tarifa.puntoOrigen?.nombre || 'Origen',
      destino: b.tarifa.puntoDestino?.nombre || 'Destino',
    }));

    return { success: true, data: pasajeros };
  } catch (error) {
    console.error('Error al obtener manifiesto de pasajeros:', error);
    return { success: false, error: 'No se pudo consultar el manifiesto.', data: [] };
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