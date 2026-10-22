'use server';

import { prisma } from '../db';
import { getSession } from '../lib/session';
import { revalidatePath } from 'next/cache';
import { EstadoCierre } from '@prisma/client';

export interface ResumenArqueoEnVivo {
  fecha: string;
  totalVentas: number;
  totalGastos: number;
  montoEsperado: number;
  cantidadVentas: number;
  cantidadGastos: number;
  taquillero: string;
  cooperativa: string;
}

export interface CierreJornadaItem {
  idCierre: number;
  fechaHora: string;
  montoEsperado: number;
  montoEntregado: number;
  diferencia: number;
  estado: EstadoCierre;
  usuarioNombre: string;
  cooperativaNombre: string;
  gastosAsociados: number;
}

/**
 * Calcula en tiempo real el arqueo de caja actual para la jornada:
 * Total Ventas (COMPLETADA) - Total Gastos Autorizados = Monto Esperado en Efectivo.
 */
export async function getArqueoEnVivoAction(): Promise<{
  success: boolean;
  data?: ResumenArqueoEnVivo;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Sesión no válida.' };
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Total ventas completadas hoy
    const ventasAgg = await prisma.venta.aggregate({
      where: {
        fechaHora: { gte: startOfDay },
        estado: 'COMPLETADA',
      },
      _sum: { total: true },
      _count: { idVenta: true },
    });

    // 2. Total gastos no cerrados hoy
    const gastosAgg = await prisma.gasto.aggregate({
      where: {
        fechaHora: { gte: startOfDay },
        idCierre: null,
      },
      _sum: { monto: true },
      _count: { idGasto: true },
    });

    const totalVentas = Number(ventasAgg._sum.total || 0);
    const totalGastos = Number(gastosAgg._sum.monto || 0);
    const montoEsperado = Math.max(0, totalVentas - totalGastos);

    return {
      success: true,
      data: {
        fecha: now.toLocaleDateString('es-NI', { dateStyle: 'full' }),
        totalVentas,
        totalGastos,
        montoEsperado,
        cantidadVentas: ventasAgg._count.idVenta,
        cantidadGastos: gastosAgg._count.idGasto,
        taquillero: session.nombre || 'Cajero / Taquillero',
        cooperativa: 'COOTRANSTEL R.L.',
      },
    };
  } catch (error) {
    console.error('Error al calcular arqueo en vivo:', error);
    return { success: false, error: 'Error al consultar datos de caja.' };
  }
}

/**
 * Guarda y firma el cierre de caja de la jornada:
 * Compara monto entregado vs monto esperado, calcula diferencia y vincula los gastos de hoy.
 */
export async function cerrarJornadaAction(data: {
  montoEntregado: number;
}): Promise<{ success: boolean; data?: CierreJornadaItem; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'No autorizado para cerrar caja.' };
    }

    const arqueoRes = await getArqueoEnVivoAction();
    if (!arqueoRes.success || !arqueoRes.data) {
      return { success: false, error: 'No se pudo obtener el arqueo previo.' };
    }

    const montoEsperado = arqueoRes.data.montoEsperado;
    const montoEntregado = data.montoEntregado;
    const diferencia = montoEntregado - montoEsperado;

    // Determinar estado según cuadre
    const estado: EstadoCierre = Math.abs(diferencia) < 0.01 ? 'CONFIRMADO' : 'PENDIENTE';

    // Determinar idCooperativa
    let idCoop = session.idCooperativa;
    if (!idCoop) {
      const firstCoop = await prisma.cooperativa.findFirst({ where: { estado: 'ACTIVO' } });
      idCoop = firstCoop ? firstCoop.idCooperativa : 1;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const cierre = await prisma.$transaction(async (tx) => {
      // a) Crear registro de CierreJornada
      const nuevoCierre = await tx.cierreJornada.create({
        data: {
          idCooperativa: idCoop!,
          idUsuario: session.idUsuario,
          montoEsperado,
          montoEntregado,
          diferencia,
          estado,
        },
        include: {
          cooperativa: true,
          usuario: true,
        },
      });

      // b) Vincular gastos de hoy que estaban pendientes de cierre
      await tx.gasto.updateMany({
        where: {
          fechaHora: { gte: startOfDay },
          idCierre: null,
        },
        data: {
          idCierre: nuevoCierre.idCierre,
        },
      });

      return nuevoCierre;
    });

    revalidatePath('/dashboard/cierres');
    revalidatePath('/dashboard/gastos');

    return {
      success: true,
      data: {
        idCierre: cierre.idCierre,
        fechaHora: cierre.fechaHora.toISOString(),
        montoEsperado: Number(cierre.montoEsperado),
        montoEntregado: Number(cierre.montoEntregado),
        diferencia: Number(cierre.diferencia),
        estado: cierre.estado,
        usuarioNombre: `${cierre.usuario.nombre} ${cierre.usuario.apellido}`.trim(),
        cooperativaNombre: cierre.cooperativa.nombre,
        gastosAsociados: arqueoRes.data.cantidadGastos,
      },
    };
  } catch (error: any) {
    console.error('Error al realizar cierre de jornada:', error);
    return { success: false, error: error.message || 'Error al guardar el cierre de caja.' };
  }
}

/**
 * Consulta el historial de cierres de caja realizados.
 */
export async function getHistorialCierresAction(): Promise<{
  success: boolean;
  data: CierreJornadaItem[];
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Sesión no válida.', data: [] };
    }

    const cierres = await prisma.cierreJornada.findMany({
      orderBy: { fechaHora: 'desc' },
      take: 50,
      include: {
        usuario: true,
        cooperativa: true,
        gastos: { select: { idGasto: true } },
      },
    });

    const items: CierreJornadaItem[] = cierres.map((c) => ({
      idCierre: c.idCierre,
      fechaHora: c.fechaHora.toISOString(),
      montoEsperado: Number(c.montoEsperado),
      montoEntregado: Number(c.montoEntregado),
      diferencia: Number(c.diferencia),
      estado: c.estado,
      usuarioNombre: `${c.usuario.nombre} ${c.usuario.apellido}`.trim(),
      cooperativaNombre: c.cooperativa.nombre,
      gastosAsociados: c.gastos.length,
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error('Error al consultar historial de cierres:', error);
    return { success: false, error: 'Error al consultar cierres.', data: [] };
  }
}
