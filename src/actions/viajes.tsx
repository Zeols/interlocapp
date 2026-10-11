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
  idUsuario: number; // ID del Chofer/Operario seleccionado por el admin
  fechaHInicio?: string;
}

export interface DespachoInput {
  idViaje: number;
  idAsignacion: number;
  observacion?: string;
}

// -------------------------------------------------------------
// 1. CONSULTA DE CHOFERES Y UNIDADES PARA EL SELECTOR DEL ADMIN
// -------------------------------------------------------------

// Obtener la lista de Choferes / Conductores de la cooperativa
export async function getChoferesByCooperativa(idCooperativa: number) {
  try {
    const choferes = await prisma.usuario.findMany({
      where: {
        idCooperativa,
        rol: { nombre: 'CHOFER' },
        estado: 'ACTIVO',
      },
      select: {
        idUsuario: true,
        nombre: true,
        apellido: true,
        usuario: true,
        telefono: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: choferes };
  } catch (error) {
    console.error('Error al obtener choferes:', error);
    return { success: false, error: 'No se pudieron cargar los choferes.' };
  }
}

// -------------------------------------------------------------
// 2. PROGRAMACIÓN Y ASIGNACIÓN DE VIAJES
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

// Crear asignación validando que la unidad y el chofer existan
export async function createAsignacionUnidad(data: AsignacionInput) {
  try {
    // Validar existencia de la Unidad
    const unidad = await prisma.unidad.findUnique({
      where: { idUnidad: data.idUnidad },
    });
    if (!unidad) {
      return { success: false, error: `La unidad seleccionada (ID: ${data.idUnidad}) no existe.` };
    }

    // Validar existencia del Chofer/Usuario
    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: data.idUsuario },
    });
    if (!usuario) {
      return { success: false, error: `El chofer/usuario seleccionado (ID: ${data.idUsuario}) no existe.` };
    }

    const nuevaAsignacion = await prisma.asignacionUnidad.create({
      data: {
        idUnidad: data.idUnidad,
        idUsuario: data.idUsuario,
        fechaHInicio: data.fechaHInicio ? new Date(data.fechaHInicio) : new Date(),
        estado: 'INICIADA',
      },
    });

    return { success: true, data: nuevaAsignacion };
  } catch (error) {
    console.error('Error al asignar unidad:', error);
    return { success: false, error: 'Error de base de datos al registrar la asignación.' };
  }
}

// -------------------------------------------------------------
// 3. DESPACHO DE VIAJE (Atómico)
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
                usuario: true,
              },
            },
          },
        },
      },
      orderBy: { hrSalidaProgramada: 'asc' },
    });
    return { success: true, data: viajes };
  } catch (error) {
    console.error('Error al obtener viajes:', error);
    return { success: false, error: 'No se pudieron consultar los viajes.' };
  }
}

// -------------------------------------------------------------
// 4. AUXILIAR: CREAR UN CHOFER REAL (Para pruebas de administración)
// -------------------------------------------------------------

export async function createChofer(data: { idCooperativa: number; nombre: string; apellido: string; usuario: string }) {
  try {
    let rol = await prisma.rol.findFirst({ where: { nombre: 'CHOFER' } });
    if (!rol) {
      rol = await prisma.rol.create({
        data: { nombre: 'CHOFER', descripcion: 'Conductor de unidad de transporte' },
      });
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
    });

    return { success: true, data: chofer };
  } catch (error) {
    console.error('Error al registrar chofer:', error);
    return { success: false, error: 'No se pudo crear el chofer.' };
  }
}