'use server';

import { prisma } from '../db';
import { revalidatePath } from 'next/cache';

// Interfaces acordes a schema.prisma
export interface PuntoInput {
  nombre: string;
  descripcion?: string;
}

export interface TarifaInput {
  idPuntoOrigen: number;
  idPuntoDestino: number;
  monto: number;
}

export interface RutaInput {
  idCooperativa: number;
  nombre: string;
  descripcion?: string;
  puntosIds: number[]; // Arreglo ordenado de IDs de paradas [1, 2, 3]
  tarifas: TarifaInput[]; // Lista de tarifas entre puntos
}

// -------------------------------------------------------------
// 1. CATÁLOGO DE PUNTOS (Terminales / Paradas)
// -------------------------------------------------------------

export async function createPunto(data: PuntoInput) {
  try {
    if (!data.nombre || data.nombre.trim() === '') {
      return { success: false, error: 'El nombre del punto es obligatorio.' };
    }

    const nuevoPunto = await prisma.punto.create({
      data: {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        estado: 'ACTIVO',
      },
    });

    return { success: true, data: nuevoPunto };
  } catch (error) {
    console.error('Error al crear punto:', error);
    return { success: false, error: 'No se pudo registrar el punto.' };
  }
}

export async function getPuntos() {
  try {
    const puntos = await prisma.punto.findMany({
      where: { estado: 'ACTIVO' },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: puntos };
  } catch (error) {
    console.error('Error al obtener puntos:', error);
    return { success: false, error: 'No se pudieron cargar los puntos.' };
  }
}

// -------------------------------------------------------------
// 2. GESTIÓN DE RUTAS, PUNTOS Y TARIFAS
// -------------------------------------------------------------

export async function getRutasByCooperativa(idCooperativa: number) {
  try {
    const rutas = await prisma.ruta.findMany({
      where: { idCooperativa },
      include: {
        puntosRuta: {
          include: {
            punto: true,
          },
          orderBy: { orden: 'asc' },
        },
        tarifas: {
          include: {
            puntoOrigen: true,
            puntoDestino: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: rutas };
  } catch (error) {
    console.error('Error al obtener rutas:', error);
    return { success: false, error: 'No se pudieron cargar las rutas.' };
  }
}

export async function createRutaConPuntosYTarifas(data: RutaInput) {
  try {
    if (!data.nombre || data.puntosIds.length < 2) {
      return {
        success: false,
        error: 'El nombre de la ruta y al menos 2 puntos de parada son obligatorios.',
      };
    }

    const nuevaRuta = await prisma.$transaction(async (tx) => {
      // a) Crear cabecera de la Ruta
      const ruta = await tx.ruta.create({
        data: {
          idCooperativa: data.idCooperativa,
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || null,
          estado: 'ACTIVO',
        },
      });

      // b) Guardar la secuencia ordenada de paradas (puntosRuta)
      const puntosRutaData = data.puntosIds.map((idPunto, index) => ({
        idRuta: ruta.idRuta,
        idPunto: idPunto,
        orden: index + 1,
      }));

      await tx.puntoRuta.createMany({
        data: puntosRutaData,
      });

      // c) Guardar las tarifas asociadas
      if (data.tarifas && data.tarifas.length > 0) {
        const tarifasData = data.tarifas.map((tarifa) => ({
          idRuta: ruta.idRuta,
          idPuntoOrigen: tarifa.idPuntoOrigen,
          idPuntoDestino: tarifa.idPuntoDestino,
          monto: tarifa.monto,
          estado: 'ACTIVO' as const,
        }));

        await tx.tarifa.createMany({
          data: tarifasData,
        });
      }

      return ruta;
    });

    revalidatePath('/admin/rutas');
    return { success: true, data: nuevaRuta };
  } catch (error) {
    console.error('Error al crear ruta:', error);
    return { success: false, error: 'Error al registrar la ruta, sus puntos y tarifas.' };
  }
}
