'use server';

import { prisma } from '../db';
import { revalidatePath } from 'next/cache';

export interface UnidadInput {
  idCooperativa: number;
  idTipoUnidad: number;
  numeroUnidad: string;
  placa: string;
  capacidadAsientos: number; // Ej: 15 o 30
}

// 1. Obtener unidades (con soporte para cooperativa específica o todas)
export async function getUnidadesByCooperativa(idCooperativa: number) {
  try {
    const unidades = await prisma.unidad.findMany({
      where: { idCooperativa },
      include: {
        tipoUnidad: true,
        cooperativa: true,
        asientos: {
          orderBy: { idAsiento: 'asc' },
        },
        _count: {
          select: { asientos: true },
        },
      },
      orderBy: { numeroUnidad: 'asc' },
    });
    return { success: true, data: unidades };
  } catch (error) {
    console.error('Error al obtener unidades:', error);
    return { success: false, error: 'No se pudieron cargar las unidades.', data: [] };
  }
}

export async function getAllUnidadesAction() {
  try {
    const unidades = await prisma.unidad.findMany({
      include: {
        tipoUnidad: true,
        cooperativa: true,
        asientos: {
          orderBy: { idAsiento: 'asc' },
        },
        _count: {
          select: { asientos: true },
        },
      },
      orderBy: { numeroUnidad: 'asc' },
    });
    return { success: true, data: unidades };
  } catch (error) {
    console.error('Error al obtener todas las unidades:', error);
    return { success: false, error: 'No se pudieron cargar las unidades.', data: [] };
  }
}

// 2. Registrar Unidad y Autogenerar Asientos (#1 hasta #N)
export async function createUnidadWithAsientos(data: UnidadInput) {
  try {
    if (!data.numeroUnidad || !data.placa) {
      return { success: false, error: 'El número de unidad y la placa son obligatorios.' };
    }

    // Verificar si la placa ya existe
    const existePlaca = await prisma.unidad.findUnique({
      where: { placa: data.placa.trim().toUpperCase() },
    });

    if (existePlaca) {
      return { success: false, error: 'Ya existe una unidad registrada con esta placa.' };
    }

    // Transacción atómica: Crear unidad + crear asientos
    const resultado = await prisma.$transaction(async (tx) => {
      // a) Crear Unidad
      const nuevaUnidad = await tx.unidad.create({
        data: {
          idCooperativa: data.idCooperativa,
          idTipoUnidad: data.idTipoUnidad,
          numeroUnidad: data.numeroUnidad.trim(),
          placa: data.placa.trim().toUpperCase(),
          estado: 'DISPONIBLE',
        },
      });

      // b) Generar mapa de asientos (#1 al #capacidadAsientos)
      const asientosData = Array.from({ length: data.capacidadAsientos }, (_, index) => ({
        idUnidad: nuevaUnidad.idUnidad,
        numero: `${index + 1}`,
        estado: 'DISPONIBLE' as const,
      }));

      await tx.asiento.createMany({
        data: asientosData,
      });

      return nuevaUnidad;
    });

    revalidatePath('/dashboard/flota');
    revalidatePath('/admin/unidades');
    return { success: true, data: resultado };
  } catch (error) {
    console.error('Error al crear unidad con asientos:', error);
    return { success: false, error: 'Error al registrar la unidad y generar sus asientos.' };
  }
}

// 3. Crear Tipo de Unidad (Catálogo)
export async function createTipoUnidad(nombre: string, descripcion?: string) {
  try {
    const tipo = await prisma.tipoUnidad.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
      },
    });
    return { success: true, data: tipo };
  } catch (error) {
    console.error('Error al crear tipo de unidad:', error);
    return { success: false, error: 'No se pudo crear el tipo de unidad.' };
  }
}

// 4. Obtener tipos de unidad existentes (o inicializar catálogo por defecto)
export async function getTiposUnidadAction() {
  try {
    let tipos = await prisma.tipoUnidad.findMany({
      where: { estado: 'ACTIVO' },
      orderBy: { idTipoUnidad: 'asc' },
    });

    if (tipos.length === 0) {
      // Si la base de datos no tiene tipos, inicializamos los 3 estándares nicaragüenses
      await prisma.tipoUnidad.createMany({
        data: [
          { nombre: 'Microbús (15 Asientos)', descripcion: 'Microbús compacto para rutas intermedias (configuración 1x2)' },
          { nombre: 'Interlocal Estándar (20 Asientos)', descripcion: 'Interlocal interurbano estándar (configuración 2x2)' },
          { nombre: 'Pullman (40 Asientos)', descripcion: 'Autobús de larga distancia con aire acondicionado' },
        ],
      });
      tipos = await prisma.tipoUnidad.findMany({
        where: { estado: 'ACTIVO' },
        orderBy: { idTipoUnidad: 'asc' },
      });
    }

    return { success: true, data: tipos };
  } catch (error) {
    console.error('Error al obtener tipos de unidad:', error);
    return { success: false, error: 'No se pudieron consultar los tipos de unidad.', data: [] };
  }
}

// 5. Actualizar estado operativo de una unidad
export async function updateEstadoUnidadAction(
  idUnidad: number,
  estado: 'DISPONIBLE' | 'EN_RUTA' | 'MANTENIMIENTO' | 'INOPERATIVA'
) {
  try {
    const unidad = await prisma.unidad.update({
      where: { idUnidad },
      data: { estado },
    });

    revalidatePath('/dashboard/flota');
    return { success: true, data: unidad };
  } catch (error) {
    console.error('Error al actualizar estado de unidad:', error);
    return { success: false, error: 'No se pudo actualizar el estado de la unidad.' };
  }
}

// 6. Dar de baja / eliminar unidad
export async function deleteUnidadAction(idUnidad: number) {
  try {
    await prisma.unidad.delete({
      where: { idUnidad },
    });

    revalidatePath('/dashboard/flota');
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar unidad:', error);
    return { success: false, error: 'No se pudo eliminar la unidad. Podría tener viajes asociados.' };
  }
}
