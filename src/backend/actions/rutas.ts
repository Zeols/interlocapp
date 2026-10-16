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
  idTipoRuta?: number;
  nombre: string;
  descripcion?: string;
  puntosIds: number[]; // Arreglo ordenado de IDs de paradas [1, 2, 3]
  tarifas: TarifaInput[]; // Lista de tarifas entre puntos
}

// -------------------------------------------------------------
// 1. CATÁLOGO DE TIPOS DE RUTA
// -------------------------------------------------------------

export async function getTiposRutaAction() {
  try {
    let tipos = await prisma.tipoRuta.findMany({
      where: { estado: 'ACTIVO' },
      orderBy: { nombre: 'asc' },
    });

    if (tipos.length === 0) {
      await prisma.tipoRuta.createMany({
        data: [
          { nombre: 'Expreso Directo', descripcion: 'Viaje directo de terminal a terminal sin paradas intermedias.' },
          { nombre: 'Ordinario Rutero', descripcion: 'Servicio con paradas intermedias autorizadas en empalmes y estaciones.' },
          { nombre: 'Interurbano Semidirecto', descripcion: 'Paradas exclusivas en terminales de cabeceras departamentales.' },
        ],
      });

      tipos = await prisma.tipoRuta.findMany({
        where: { estado: 'ACTIVO' },
        orderBy: { nombre: 'asc' },
      });
    }

    return { success: true, data: tipos };
  } catch (error) {
    console.error('Error al obtener tipos de ruta:', error);
    return { success: false, error: 'No se pudieron consultar los tipos de ruta.', data: [] };
  }
}

export async function createTipoRutaAction(nombre: string, descripcion?: string) {
  try {
    if (!nombre || nombre.trim() === '') {
      return { success: false, error: 'El nombre del tipo de ruta es obligatorio.' };
    }

    const cleanName = nombre.trim();
    const existing = await prisma.tipoRuta.findUnique({
      where: { nombre: cleanName },
    });

    if (existing) {
      return { success: false, error: 'Ya existe un tipo de ruta registrado con este nombre.' };
    }

    const nuevoTipo = await prisma.tipoRuta.create({
      data: {
        nombre: cleanName,
        descripcion: descripcion?.trim() || null,
        estado: 'ACTIVO',
      },
    });

    revalidatePath('/dashboard/rutas');
    return { success: true, data: nuevoTipo };
  } catch (error) {
    console.error('Error al registrar tipo de ruta:', error);
    return { success: false, error: 'No se pudo crear el tipo de ruta.' };
  }
}

// -------------------------------------------------------------
// 2. CATÁLOGO DE PUNTOS (Terminales / Paradas)
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

    const serializedRutas = rutas.map((r) => ({
      ...r,
      tarifas: r.tarifas.map((t) => ({
        ...t,
        monto: Number(t.monto),
      })),
    }));

    return { success: true, data: serializedRutas };
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
          idTipoRuta: data.idTipoRuta || null,
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

    revalidatePath('/dashboard/rutas');
    revalidatePath('/admin/rutas');
    return { success: true, data: nuevaRuta };
  } catch (error) {
    console.error('Error al crear ruta:', error);
    return { success: false, error: 'Error al registrar la ruta, sus puntos y tarifas.' };
  }
}

export async function getAllRutasAction() {
  try {
    const rutas = await prisma.ruta.findMany({
      include: {
        cooperativa: true,
        tipoRuta: true,
        puntosRuta: {
          include: { punto: true },
          orderBy: { orden: 'asc' },
        },
        tarifas: {
          include: {
            puntoOrigen: true,
            puntoDestino: true,
          },
          orderBy: { monto: 'asc' },
        },
        _count: {
          select: { viajes: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    const serializedRutas = rutas.map((r) => ({
      ...r,
      tarifas: r.tarifas.map((t) => ({
        ...t,
        monto: Number(t.monto),
      })),
    }));

    return { success: true, data: serializedRutas };
  } catch (error) {
    console.error('Error al consultar todas las rutas:', error);
    return { success: false, error: 'No se pudieron consultar las rutas.', data: [] };
  }
}

export async function updateEstadoRutaAction(idRuta: number, estado: 'ACTIVO' | 'INACTIVO') {
  try {
    const ruta = await prisma.ruta.update({
      where: { idRuta },
      data: { estado },
    });
    revalidatePath('/dashboard/rutas');
    return { success: true, data: ruta };
  } catch (error) {
    console.error('Error al actualizar estado de la ruta:', error);
    return { success: false, error: 'No se pudo actualizar el estado de la ruta.' };
  }
}

export async function deleteRutaAction(idRuta: number) {
  try {
    await prisma.ruta.delete({
      where: { idRuta },
    });
    revalidatePath('/dashboard/rutas');
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar la ruta:', error);
    return { success: false, error: 'No se pudo eliminar la ruta. Asegúrese de que no tenga viajes asignados.' };
  }
}

export async function getRutasActivas() {
  try {
    const rutas = await prisma.ruta.findMany({
      where: { estado: 'ACTIVO' },
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
      orderBy: { nombre: 'asc' },
    });

    const formatted = rutas.map((r) => {
      const puntos = r.puntosRuta.map((pr) => pr.punto.nombre);
      const origin = puntos[0] || r.nombre.split('-')[0]?.trim() || 'Origen';
      const destination = puntos[puntos.length - 1] || r.nombre.split('-')[1]?.trim() || 'Destino';
      const price = r.tarifas[0]?.monto ? Number(r.tarifas[0].monto) : 80;

      return {
        id: r.idRuta,
        name: r.nombre,
        origin,
        destination,
        duration: '2h 30min',
        price,
        cooperative: r.cooperativa.nombre,
      };
    });

    return { success: true, data: formatted };
  } catch (error) {
    console.error('Error al consultar rutas activas:', error);
    return { success: false, error: 'No se pudieron consultar las rutas.', data: [] };
  }
}

