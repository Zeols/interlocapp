'use server';

import { prisma } from '../db';
import { getSession } from '../lib/session';
import { revalidatePath } from 'next/cache';
import { EstadoCierre } from '@prisma/client';
import { getNowInManagua, formatManaguaDate, formatManaguaDateTime } from '@/lib/date-time';

export interface DenominacionConteo {
  denominacion: number;
  tipo: 'BILLETE' | 'MONEDA';
  cantidad: number;
  subtotal: number;
}

export interface ResumenArqueoEnVivo {
  fecha: string;
  totalVentas: number;
  ventasTaquilla: number;
  ventasABordo: number;
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
  fechaHoraFormatted: string;
  montoEsperado: number;
  montoEntregado: number;
  diferencia: number;
  estado: EstadoCierre;
  usuarioNombre: string;
  cooperativaNombre: string;
  gastosAsociados: number;
  observaciones?: string | null;
  desgloseJson?: string | null;
}

export interface CerrarJornadaInput {
  montoEntregado: number;
  observaciones?: string;
  desglose?: DenominacionConteo[];
}

/**
 * Calcula en tiempo real el arqueo de caja actual para la jornada según la hora oficial de Managua:
 * Total Ventas (COMPLETADA, POS + A_BORDO) - Total Gastos Pendientes = Monto Esperado en Efectivo.
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

    const nowManagua = getNowInManagua();
    // Inicio del día en hora de Managua
    const startOfDay = new Date(nowManagua);
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Consultar ventas completadas hoy
    const ventasHoy = await prisma.venta.findMany({
      where: {
        fechaHora: { gte: startOfDay },
        estado: 'COMPLETADA',
      },
      select: {
        idVenta: true,
        total: true,
        tipoVenta: { select: { nombre: true } },
      },
    });

    let totalVentas = 0;
    let ventasTaquilla = 0;
    let ventasABordo = 0;

    for (const v of ventasHoy) {
      const monto = Number(v.total || 0);
      totalVentas += monto;
      if (v.tipoVenta?.nombre === 'A_BORDO') {
        ventasABordo += monto;
      } else {
        ventasTaquilla += monto;
      }
    }

    // 2. Total gastos no cerrados hoy
    const gastosAgg = await prisma.gasto.aggregate({
      where: {
        fechaHora: { gte: startOfDay },
        idCierre: null,
      },
      _sum: { monto: true },
      _count: { idGasto: true },
    });

    const totalGastos = Number(gastosAgg._sum.monto || 0);
    const montoEsperado = Math.max(0, totalVentas - totalGastos);

    // Cooperativa del usuario
    let nombreCoop = 'Cooperativa de Transporte';
    if (session.idCooperativa) {
      const coop = await prisma.cooperativa.findUnique({
        where: { idCooperativa: session.idCooperativa },
        select: { nombre: true },
      });
      if (coop) nombreCoop = coop.nombre;
    }

    return {
      success: true,
      data: {
        fecha: formatManaguaDate(nowManagua),
        totalVentas,
        ventasTaquilla,
        ventasABordo,
        totalGastos,
        montoEsperado,
        cantidadVentas: ventasHoy.length,
        cantidadGastos: gastosAgg._count.idGasto,
        taquillero: session.nombre || 'Cajero / Taquillero',
        cooperativa: nombreCoop,
      },
    };
  } catch (error) {
    console.error('Error al calcular arqueo en vivo:', error);
    return { success: false, error: 'Error al consultar datos de caja.' };
  }
}

/**
 * Guarda y firma el cierre de caja de la jornada:
 * Valida diferencias, exige justificación obligatoria en caso de faltante y guarda el desglose peso a peso.
 */
export async function cerrarJornadaAction(
  input: CerrarJornadaInput
): Promise<{ success: boolean; data?: CierreJornadaItem; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'No autorizado para cerrar caja.' };
    }

    const arqueoRes = await getArqueoEnVivoAction();
    if (!arqueoRes.success || !arqueoRes.data) {
      return { success: false, error: 'No se pudo obtener el arqueo previo del sistema.' };
    }

    const montoEsperado = arqueoRes.data.montoEsperado;
    const montoEntregado = Number(input.montoEntregado) || 0;
    const diferencia = montoEntregado - montoEsperado;

    // Regla de Negocio: Si hay faltante (más de C$ 0.05), es obligatoria la justificación
    if (diferencia < -0.05 && (!input.observaciones || input.observaciones.trim().length < 5)) {
      return {
        success: false,
        error: 'Existe un faltante en caja. Debe registrar una justificación detallada antes de cerrar la jornada.',
      };
    }

    // Determinar estado según cuadre
    const estado: EstadoCierre = Math.abs(diferencia) <= 0.05 ? 'CONFIRMADO' : 'PENDIENTE';

    // Determinar idCooperativa
    let idCoop = session.idCooperativa;
    if (!idCoop) {
      const firstCoop = await prisma.cooperativa.findFirst({ where: { estado: 'ACTIVO' } });
      idCoop = firstCoop ? firstCoop.idCooperativa : 1;
    }

    const nowManagua = getNowInManagua();
    const startOfDay = new Date(nowManagua);
    startOfDay.setHours(0, 0, 0, 0);

    const cierre = await prisma.$transaction(async (tx) => {
      // 1. Crear registro de CierreJornada
      const nuevoCierre = await tx.cierreJornada.create({
        data: {
          idCooperativa: idCoop!,
          idUsuario: session.idUsuario,
          fechaHora: nowManagua,
          montoEsperado,
          montoEntregado,
          diferencia,
          observaciones: input.observaciones?.trim() || null,
          desgloseJson: input.desglose && input.desglose.length > 0 ? JSON.stringify(input.desglose) : null,
          estado,
        },
        include: {
          cooperativa: true,
          usuario: true,
        },
      });

      // 2. Vincular gastos de hoy que estaban pendientes de cierre
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
        fechaHoraFormatted: formatManaguaDateTime(cierre.fechaHora),
        montoEsperado: Number(cierre.montoEsperado),
        montoEntregado: Number(cierre.montoEntregado),
        diferencia: Number(cierre.diferencia),
        estado: cierre.estado,
        usuarioNombre: `${cierre.usuario.nombre} ${cierre.usuario.apellido}`.trim(),
        cooperativaNombre: cierre.cooperativa.nombre,
        gastosAsociados: arqueoRes.data.cantidadGastos,
        observaciones: cierre.observaciones,
        desgloseJson: cierre.desgloseJson,
      },
    };
  } catch (error: any) {
    console.error('Error al realizar cierre de jornada:', error);
    return { success: false, error: error.message || 'Error al guardar el cierre de caja.' };
  }
}

/**
 * Consulta el historial de cierres de caja realizados con fecha de Managua y observaciones.
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
      fechaHoraFormatted: formatManaguaDateTime(c.fechaHora),
      montoEsperado: Number(c.montoEsperado),
      montoEntregado: Number(c.montoEntregado),
      diferencia: Number(c.diferencia),
      estado: c.estado,
      usuarioNombre: `${c.usuario.nombre} ${c.usuario.apellido}`.trim(),
      cooperativaNombre: c.cooperativa.nombre,
      gastosAsociados: c.gastos.length,
      observaciones: c.observaciones,
      desgloseJson: c.desgloseJson,
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error('Error al consultar historial de cierres:', error);
    return { success: false, error: 'Error al consultar cierres.', data: [] };
  }
}
