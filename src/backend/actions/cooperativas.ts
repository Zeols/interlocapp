'use server';

import { prisma } from '../db';
import { revalidatePath } from 'next/cache';

export interface CooperativaInput {
  nombre: string;
  telefono?: string;
  direccion?: string;
}

// 1. Obtener todas las cooperativas
export async function getCooperativas() {
  try {
    const cooperativas = await prisma.cooperativa.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { unidades: true, usuarios: true, rutas: true },
        },
      },
    });
    return { success: true, data: cooperativas };
  } catch (error) {
    console.error('Error al obtener cooperativas:', error);
    return { success: false, error: 'No se pudieron obtener las cooperativas.' };
  }
}

// 2. Crear una cooperativa
export async function createCooperativa(data: CooperativaInput) {
  try {
    if (!data.nombre || data.nombre.trim() === '') {
      return { success: false, error: 'El nombre de la cooperativa es obligatorio.' };
    }

    const nuevaCooperativa = await prisma.cooperativa.create({
      data: {
        nombre: data.nombre.trim(),
        telefono: data.telefono?.trim() || null,
        direccion: data.direccion?.trim() || null,
      },
    });

    revalidatePath('/admin/cooperativas');
    return { success: true, data: nuevaCooperativa };
  } catch (error) {
    console.error('Error al crear cooperativa:', error);
    return { success: false, error: 'Error al registrar la cooperativa.' };
  }
}

// 3. Actualizar estado/datos de cooperativa
export async function updateCooperativa(
  idCooperativa: number,
  data: Partial<CooperativaInput> & { estado?: 'ACTIVO' | 'INACTIVO' }
) {
  try {
    const actualizada = await prisma.cooperativa.update({
      where: { idCooperativa },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.telefono !== undefined && { telefono: data.telefono?.trim() || null }),
        ...(data.direccion !== undefined && { direccion: data.direccion?.trim() || null }),
        ...(data.estado && { estado: data.estado }),
      },
    });

    revalidatePath('/admin/cooperativas');
    return { success: true, data: actualizada };
  } catch (error) {
    console.error('Error al actualizar cooperativa:', error);
    return { success: false, error: 'Error al actualizar la cooperativa.' };
  }
}
