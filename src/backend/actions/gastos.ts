'use server';

import { prisma } from '../db';
import { getSession } from '../lib/session';
import { revalidatePath } from 'next/cache';
import { TipoGasto } from '@prisma/client';

export interface GastoItem {
  idGasto: number;
  tipo: TipoGasto;
  descripcion: string | null;
  monto: number;
  fechaHora: string;
  abastecimientoGasolina?: {
    cantidadGalones: number;
    precioUnitario: number;
    montoTotal: number;
  } | null;
}

export interface RegistrarGastoInput {
  tipo: TipoGasto;
  monto: number;
  descripcion?: string;
  cantidadGalones?: number;
  precioUnitario?: number;
}

/**
 * Registra un gasto operativo o de combustible en la base de datos.
 */
export async function registrarGastoAction(data: RegistrarGastoInput): Promise<{
  success: boolean;
  data?: GastoItem;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Debe iniciar sesión para registrar gastos.' };
    }

    if (data.monto <= 0) {
      return { success: false, error: 'El monto del gasto debe ser mayor a 0.' };
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const gastoCreado = await tx.gasto.create({
        data: {
          tipo: data.tipo,
          descripcion: data.descripcion?.trim() || null,
          monto: data.monto,
        },
      });

      let abastecimiento = null;
      if (data.tipo === 'GASOLINA') {
        const galones = data.cantidadGalones || 0;
        const precioUnitario = data.precioUnitario || 0;
        const totalCalculado = galones > 0 && precioUnitario > 0 ? galones * precioUnitario : data.monto;

        const abast = await tx.abastecimientoGasolina.create({
          data: {
            idGasto: gastoCreado.idGasto,
            cantidad: galones,
            precioUnitario: precioUnitario,
            monto: totalCalculado,
          },
        });

        abastecimiento = {
          cantidadGalones: Number(abast.cantidad),
          precioUnitario: Number(abast.precioUnitario),
          montoTotal: Number(abast.monto),
        };
      }

      return {
        gasto: gastoCreado,
        abastecimiento,
      };
    });

    revalidatePath('/dashboard/gastos');
    revalidatePath('/dashboard/cierres');

    return {
      success: true,
      data: {
        idGasto: resultado.gasto.idGasto,
        tipo: resultado.gasto.tipo,
        descripcion: resultado.gasto.descripcion,
        monto: Number(resultado.gasto.monto),
        fechaHora: resultado.gasto.fechaHora.toISOString(),
        abastecimientoGasolina: resultado.abastecimiento,
      },
    };
  } catch (error: any) {
    console.error('Error al registrar gasto:', error);
    return { success: false, error: error.message || 'Error al guardar el gasto.' };
  }
}

/**
 * Consulta la lista de gastos operativos registrados en el sistema.
 */
export async function getGastosAction(): Promise<{
  success: boolean;
  data: GastoItem[];
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Sesión no válida.', data: [] };
    }

    const gastos = await prisma.gasto.findMany({
      orderBy: { fechaHora: 'desc' },
      take: 100,
      include: {
        abastecimientoGasolina: true,
      },
    });

    const items: GastoItem[] = gastos.map((g) => ({
      idGasto: g.idGasto,
      tipo: g.tipo,
      descripcion: g.descripcion,
      monto: Number(g.monto),
      fechaHora: g.fechaHora.toISOString(),
      abastecimientoGasolina: g.abastecimientoGasolina
        ? {
            cantidadGalones: Number(g.abastecimientoGasolina.cantidad),
            precioUnitario: Number(g.abastecimientoGasolina.precioUnitario),
            montoTotal: Number(g.abastecimientoGasolina.monto),
          }
        : null,
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    return { success: false, error: 'Error al consultar gastos.', data: [] };
  }
}

/**
 * Elimina un registro de gasto.
 */
export async function eliminarGastoAction(idGasto: number): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || (session.rolNombre !== 'SUPER_ADMIN' && session.rolNombre !== 'ADMIN_COOP')) {
      return { success: false, error: 'No tienes permisos para eliminar gastos.' };
    }

    await prisma.gasto.delete({
      where: { idGasto },
    });

    revalidatePath('/dashboard/gastos');
    revalidatePath('/dashboard/cierres');
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    return { success: false, error: 'No se pudo eliminar el gasto.' };
  }
}
