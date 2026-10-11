'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface UnidadInput {
  idCooperativa: number;
  idTipoUnidad: number;
  numeroUnidad: string;
  placa: string;
  capacidadAsientos: number; // Ej: 15 o 30
}

// 1. Obtener unidades por cooperativa
export async function getUnidadesByCooperativa(idCooperativa: number) {
  try {
    const unidades = await prisma.unidad.findMany({
      where: { idCooperativa },
      include: {
        tipoUnidad: true,
        asientos: {
          orderBy: { idAsiento: 'asc' },
        },
      },
      orderBy: { numeroUnidad: 'asc' },
    });
    return { success: true, data: unidades };
  } catch (error) {
    console.error('Error al obtener unidades:', error);
    return { success: false, error: 'No se pudieron cargar las unidades.' };
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