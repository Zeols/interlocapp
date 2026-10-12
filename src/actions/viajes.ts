'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface ViajeInput {
  idRuta: number;
  fecha: string;
  hrSalidaProgramada: string;
  sentido?: string;
}

export interface AsignacionInput {
  idUnidad: number;
  idUsuarios?: number[]; // Lista con los IDs de la tripulación (ej: [idChofer, idAyudante])
  idUsuario?: number;    // Compatible con asignación individual
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
    // Determinar la lista de usuarios a asignar
    const listaUsuarios = data.idUsuarios
      ? data.idUsuarios
      : data.idUsuario
        ? [data.idUsuario]
        : [];

    if (listaUsuarios.length === 0) {
      return { success: false, error: 'Debe especificar al menos un usuario para asignar.' };
    }

    // 1. Validar existencia de la Unidad
    const unidad = await prisma.unidad.findUnique({
      where: { idUnidad: data.idUnidad },
    });
    if (!unidad) {
      return { success: false, error: `La unidad con ID ${data.idUnidad} no existe.` };
    }

    // 2. Validar existencia de todos los Usuarios especificados
    const usuarios = await prisma.usuario.findMany({
      where: { idUsuario: { in: listaUsuarios } },
      include: { rol: true },
    });

    if (usuarios.length !== listaUsuarios.length) {
      return { success: false, error: 'Uno o más usuarios seleccionados no existen en la BD.' };
    }

    // 3. Crear los registros de asignación en una transacción atómica
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
      // Devolvemos la primera asignación como referencia principal para el despacho
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

    // Enriquecer cada viaje despachado con la tripulación completa (Chofer + Ayudante)
    const viajesConTripulacionCompleta = await Promise.all(
      viajes.map(async (v) => {
        if (!v.despacho) return v;

        const idUnidad = v.despacho.asignacionUnidad.idUnidad;

        // Consultar todas las asignaciones de esta unidad
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