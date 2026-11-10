'use server';

import { prisma } from '../db';
import { getSession } from '../lib/session';
import { revalidatePath } from 'next/cache';
import { EstadoCierre } from '@prisma/client';
import {
  getNowInManagua,
  getManaguaStartOfDay,
  getManaguaEndOfDay,
  formatManaguaDate,
  formatManaguaDateTime,
} from '@/lib/date-time';

const CIERRES_ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN_COOP', 'TAQUILLERO'];
const SUPERVISOR_CIERRES_ROLES = ['SUPER_ADMIN', 'ADMIN_COOP'];

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
  ventasWeb: number;
  totalGastos: number;
  montoEsperado: number;
  cantidadVentas: number;
  cantidadGastos: number;
  taquillero: string;
  cooperativa: string;
  idCooperativa: number | null;
  ultimoCierreHoy?: {
    idCierre: number;
    fechaHoraFormatted: string;
    estado: EstadoCierre;
  } | null;
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
  idCooperativa: number;
  gastosAsociados: number;
  observaciones?: string | null;
  desgloseJson?: string | null;
}

export interface CerrarJornadaInput {
  montoEntregado: number;
  observaciones?: string;
  desglose?: DenominacionConteo[];
  idCooperativa?: number;
}

/**
 * Calcula en tiempo real el arqueo de caja actual para la jornada según la hora oficial de Managua:
 * Total Ventas en Efectivo (POS Taquilla + A_BORDO desde el último cierre activo) - Total Gastos Pendientes = Monto Esperado en Efectivo.
 */
export async function getArqueoEnVivoAction(idCooperativaFilter?: number): Promise<{
  success: boolean;
  data?: ResumenArqueoEnVivo;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session || !CIERRES_ALLOWED_ROLES.includes(session.rolNombre)) {
      return { success: false, error: 'Sesión no válida o sin permisos de arqueo.' };
    }

    const nowManagua = getNowInManagua();
    const startOfDay = getManaguaStartOfDay();
    const endOfDay = getManaguaEndOfDay();

    const effectiveCoopId =
      session.rolNombre !== 'SUPER_ADMIN' && session.idCooperativa
        ? session.idCooperativa
        : idCooperativaFilter || session.idCooperativa || undefined;

    // Buscar el último cierre no rechazado hoy para cortar el turno correctamente
    const ultimoCierreValidoHoy = await prisma.cierreJornada.findFirst({
      where: {
        fechaHora: { gte: startOfDay, lte: endOfDay },
        estado: { in: ['CONFIRMADO', 'PENDIENTE'] },
        ...(effectiveCoopId ? { idCooperativa: effectiveCoopId } : {}),
      },
      orderBy: { fechaHora: 'desc' },
    });

    const fechaCorteInicio = ultimoCierreValidoHoy ? ultimoCierreValidoHoy.fechaHora : startOfDay;

    // 1. Consultar ventas completadas en el turno actual (filtradas por cooperativa si aplica)
    const ventasHoy = await prisma.venta.findMany({
      where: {
        fechaHora: ultimoCierreValidoHoy
          ? { gt: fechaCorteInicio, lte: endOfDay }
          : { gte: startOfDay, lte: endOfDay },
        estado: 'COMPLETADA',
        ...(effectiveCoopId
          ? {
              viaje: {
                ruta: {
                  idCooperativa: effectiveCoopId,
                },
              },
            }
          : {}),
      },
      select: {
        idVenta: true,
        total: true,
        tipoVenta: { select: { nombre: true } },
      },
    });

    let ventasTaquilla = 0;
    let ventasABordo = 0;
    let ventasWeb = 0;
    let cantidadVentasEfectivo = 0;

    for (const v of ventasHoy) {
      const monto = Number(v.total || 0);
      const tipoNombre = (v.tipoVenta?.nombre || '').trim().toUpperCase();

      if (tipoNombre === 'A_BORDO') {
        ventasABordo += monto;
        cantidadVentasEfectivo++;
      } else if (tipoNombre === 'WEB' || tipoNombre === 'EN_LINEA') {
        // Las ventas pagadas digitalmente en portal B2C no entran como efectivo físico en gaveta
        ventasWeb += monto;
      } else {
        ventasTaquilla += monto;
        cantidadVentasEfectivo++;
      }
    }

    const totalVentasEfectivo = Number((ventasTaquilla + ventasABordo).toFixed(2));

    // 2. Total gastos pendientes de cierre en la jornada
    const gastosAgg = await prisma.gasto.aggregate({
      where: {
        fechaHora: { gte: startOfDay, lte: endOfDay },
        idCierre: null,
      },
      _sum: { monto: true },
      _count: { idGasto: true },
    });

    const totalGastos = Number(Number(gastosAgg._sum.monto || 0).toFixed(2));
    const montoEsperado = Number(Math.max(0, totalVentasEfectivo - totalGastos).toFixed(2));

    // Cooperativa activa
    let nombreCoop = 'Todas las Cooperativas';
    if (effectiveCoopId) {
      const coop = await prisma.cooperativa.findUnique({
        where: { idCooperativa: effectiveCoopId },
        select: { nombre: true },
      });
      if (coop) nombreCoop = coop.nombre;
    }

    return {
      success: true,
      data: {
        fecha: formatManaguaDate(nowManagua),
        totalVentas: totalVentasEfectivo,
        ventasTaquilla: Number(ventasTaquilla.toFixed(2)),
        ventasABordo: Number(ventasABordo.toFixed(2)),
        ventasWeb: Number(ventasWeb.toFixed(2)),
        totalGastos,
        montoEsperado,
        cantidadVentas: cantidadVentasEfectivo,
        cantidadGastos: gastosAgg._count.idGasto,
        taquillero: session.nombre || 'Cajero / Taquillero',
        cooperativa: nombreCoop,
        idCooperativa: effectiveCoopId || null,
        ultimoCierreHoy: ultimoCierreValidoHoy
          ? {
              idCierre: ultimoCierreValidoHoy.idCierre,
              fechaHoraFormatted: formatManaguaDateTime(ultimoCierreValidoHoy.fechaHora),
              estado: ultimoCierreValidoHoy.estado,
            }
          : null,
      },
    };
  } catch (error) {
    console.error('Error al calcular arqueo en vivo:', error);
    return { success: false, error: 'Error al consultar datos de caja.' };
  }
}

/**
 * Guarda y firma el cierre de caja de la jornada:
 * - Si el arqueo cuadra (|diferencia| <= 0.05) -> Estado CONFIRMADO.
 * - Si existe descuadre (faltante o sobrante |diferencia| > 0.05) -> Exige justificación y pasa a estado PENDIENTE para auditoría.
 */
export async function cerrarJornadaAction(
  input: CerrarJornadaInput
): Promise<{ success: boolean; data?: CierreJornadaItem; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !CIERRES_ALLOWED_ROLES.includes(session.rolNombre)) {
      return { success: false, error: 'No autorizado para cerrar caja.' };
    }

    const arqueoRes = await getArqueoEnVivoAction(input.idCooperativa);
    if (!arqueoRes.success || !arqueoRes.data) {
      return { success: false, error: 'No se pudo obtener el arqueo previo del sistema.' };
    }

    const montoEsperado = Number(arqueoRes.data.montoEsperado.toFixed(2));
    const montoEntregado = Number((Number(input.montoEntregado) || 0).toFixed(2));

    if (montoEntregado < 0) {
      return { success: false, error: 'El monto entregado no puede ser negativo.' };
    }

    const diferencia = Number((montoEntregado - montoEsperado).toFixed(2));
    const tieneDescuadre = Math.abs(diferencia) > 0.05;

    // Regla de Negocio: Si hay descuadre (faltante o sobrante > C$ 0.05), es obligatoria la justificación
    if (tieneDescuadre && (!input.observaciones || input.observaciones.trim().length < 5)) {
      return {
        success: false,
        error:
          diferencia < 0
            ? 'Existe un faltante en caja. Debe registrar una justificación detallada (mínimo 5 caracteres) antes de cerrar la jornada.'
            : 'Existe un sobrante en caja. Debe registrar una nota de justificación antes de cerrar la jornada.',
      };
    }

    // Determinar estado inicial del cierre según cuadre contable:
    // - Cuadre exacto (|diferencia| <= 0.05) -> CONFIRMADO automáticamente
    // - Descuadre (faltante o sobrante) -> PENDIENTE de validación por Administración
    const estado: EstadoCierre = tieneDescuadre ? 'PENDIENTE' : 'CONFIRMADO';

    // Determinar idCooperativa
    let idCoop =
      session.rolNombre !== 'SUPER_ADMIN' && session.idCooperativa
        ? session.idCooperativa
        : input.idCooperativa || session.idCooperativa;

    if (!idCoop) {
      const firstCoop = await prisma.cooperativa.findFirst({ where: { estado: 'ACTIVO' } });
      idCoop = firstCoop ? firstCoop.idCooperativa : 1;
    }

    const nowManagua = getNowInManagua();
    const startOfDay = getManaguaStartOfDay();
    const endOfDay = getManaguaEndOfDay();

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
          fechaHora: { gte: startOfDay, lte: endOfDay },
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
        usuarioNombre: `${cierre.usuario.nombre} ${cierre.usuario.apellido || ''}`.trim(),
        cooperativaNombre: cierre.cooperativa.nombre,
        idCooperativa: cierre.idCooperativa,
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
 * Permite a SUPER_ADMIN o ADMIN_COOP auditar un cierre en estado PENDIENTE y cambiarlo a CONFIRMADO o RECHAZADO.
 * Si se marca como RECHAZADO, se desvinculan los gastos asociados para que el turno pueda volver a arquearse correctamente.
 */
export async function actualizarEstadoCierreAction(payload: {
  idCierre: number;
  nuevoEstado: 'CONFIRMADO' | 'RECHAZADO';
  motivoRevision?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !SUPERVISOR_CIERRES_ROLES.includes(session.rolNombre)) {
      return {
        success: false,
        error: 'Solo un Administrador puede aprobar o rechazar cierres pendientes.',
      };
    }

    const { idCierre, nuevoEstado, motivoRevision } = payload;

    const cierreExistente = await prisma.cierreJornada.findUnique({
      where: { idCierre },
    });

    if (!cierreExistente) {
      return { success: false, error: 'El registro de cierre no existe.' };
    }

    if (
      session.rolNombre !== 'SUPER_ADMIN' &&
      session.idCooperativa &&
      cierreExistente.idCooperativa !== session.idCooperativa
    ) {
      return { success: false, error: 'No tienes permisos sobre cierres de otra cooperativa.' };
    }

    if (cierreExistente.estado !== 'PENDIENTE') {
      return {
        success: false,
        error: `Este cierre ya fue procesado anteriormente (Estado actual: ${cierreExistente.estado}).`,
      };
    }

    if (nuevoEstado === 'RECHAZADO' && (!motivoRevision || motivoRevision.trim().length < 4)) {
      return {
        success: false,
        error: 'Debe indicar el motivo del rechazo para que el cajero corrija el arqueo.',
      };
    }

    const selloSupervisor =
      nuevoEstado === 'CONFIRMADO'
        ? `[CONFIRMADO por ${session.nombre}${motivoRevision?.trim() ? `: ${motivoRevision.trim()}` : ''}]`
        : `[RECHAZADO por ${session.nombre}: ${motivoRevision?.trim() || 'Descuadre no autorizado'}]`;

    const nuevaObservacion = cierreExistente.observaciones
      ? `${cierreExistente.observaciones} | ${selloSupervisor}`
      : selloSupervisor;

    await prisma.$transaction(async (tx) => {
      await tx.cierreJornada.update({
        where: { idCierre },
        data: {
          estado: nuevoEstado,
          observaciones: nuevaObservacion,
        },
      });

      // Si se rechaza el cierre, liberamos sus gastos para que vuelvan a contabilizarse en el nuevo arqueo
      if (nuevoEstado === 'RECHAZADO') {
        await tx.gasto.updateMany({
          where: { idCierre },
          data: { idCierre: null },
        });
      }
    });

    revalidatePath('/dashboard/cierres');
    revalidatePath('/dashboard/gastos');

    return { success: true };
  } catch (error: any) {
    console.error('Error al actualizar estado de cierre:', error);
    return { success: false, error: error.message || 'No se pudo actualizar el estado del cierre.' };
  }
}

/**
 * Consulta el historial de cierres de caja realizados con fecha de Managua y observaciones.
 */
export async function getHistorialCierresAction(idCooperativaFilter?: number): Promise<{
  success: boolean;
  data: CierreJornadaItem[];
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session || !CIERRES_ALLOWED_ROLES.includes(session.rolNombre)) {
      return { success: false, error: 'Sesión no válida.', data: [] };
    }

    const effectiveCoopId =
      session.rolNombre !== 'SUPER_ADMIN' && session.idCooperativa
        ? session.idCooperativa
        : idCooperativaFilter || undefined;

    const cierres = await prisma.cierreJornada.findMany({
      where: effectiveCoopId ? { idCooperativa: effectiveCoopId } : undefined,
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
      usuarioNombre: `${c.usuario.nombre} ${c.usuario.apellido || ''}`.trim(),
      cooperativaNombre: c.cooperativa.nombre,
      idCooperativa: c.idCooperativa,
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
