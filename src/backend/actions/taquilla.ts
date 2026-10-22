'use server';

import { prisma } from '../db';
import { getSession } from '../lib/session';
import { procesarVentaBoletos, ItemBoletoInput } from './ventas';
import { revalidatePath } from 'next/cache';

const TAQUILLA_ROLES = ['SUPER_ADMIN', 'ADMIN_COOP', 'TAQUILLERO'];

export interface SalidaTaquillaItem {
  idViaje: number;
  origen: string;
  destino: string;
  rutaNombre: string;
  cooperativa: string;
  fecha: string;
  horaSalida: string;
  horaEstimada?: string;
  unidadNumero: string;
  unidadPlaca: string;
  precioBase: number;
  totalAsientos: number;
  asientosDisponibles: number;
  asientosOcupados: number;
  estado: string;
}

export interface AsientoTaquillaItem {
  idAsiento: number;
  numero: string;
  estado: 'DISPONIBLE' | 'OCUPADO' | 'RESERVADO';
}

export interface ResultadoVentaTaquilla {
  idVenta: number;
  idViaje: number;
  codigoVenta: string;
  total: number;
  efectivoRecibido: number;
  cambio: number;
  cooperativa: string;
  origen: string;
  destino: string;
  fechaSalida: string;
  horaSalida: string;
  unidadNumero: string;
  unidadPlaca: string;
  taquillero: string;
  boletos: Array<{
    idBoleto: number;
    codigoBoleto: string;
    numeroAsiento: string;
    monto: number;
  }>;
}

/**
 * Obtiene las salidas activas del día listas para venta en ventanilla de terminal.
 * Aplica aislamiento por cooperativa si el usuario es TAQUILLERO o ADMIN_COOP.
 */
export async function getSalidasDelDiaTaquillaAction(): Promise<{
  success: boolean;
  data: SalidaTaquillaItem[];
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Sesión no válida.', data: [] };
    }

    if (!TAQUILLA_ROLES.includes(session.rolNombre)) {
      return { success: false, error: 'No tienes permisos de taquilla.', data: [] };
    }

    const coopFilter =
      session.rolNombre !== 'SUPER_ADMIN' && session.idCooperativa
        ? { idCooperativa: session.idCooperativa }
        : {};

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const viajes = await prisma.viaje.findMany({
      where: {
        fecha: { gte: startOfDay },
        estado: { in: ['PROGRAMADO', 'EN_CURSO'] },
        ruta: {
          ...coopFilter,
        },
      },
      include: {
        ruta: {
          include: {
            cooperativa: true,
            tarifas: { where: { estado: 'ACTIVO' } },
            puntosRuta: {
              include: { punto: true },
              orderBy: { orden: 'asc' },
            },
          },
        },
        despacho: {
          include: {
            asignacionUnidad: {
              include: {
                unidad: {
                  include: {
                    asientos: true,
                  },
                },
              },
            },
          },
        },
        boletos: {
          where: { estado: { in: ['PAGADO', 'RESERVADO', 'ABORDADO'] } },
          select: { idAsiento: true },
        },
      },
      orderBy: { hrSalidaProgramada: 'asc' },
    });

    const salidas: SalidaTaquillaItem[] = viajes.map((v) => {
      let origen = 'Origen';
      let destino = 'Destino';

      if (v.ruta.puntosRuta && v.ruta.puntosRuta.length > 0) {
        origen = v.ruta.puntosRuta[0].punto.nombre;
        destino = v.ruta.puntosRuta[v.ruta.puntosRuta.length - 1].punto.nombre;
      } else {
        const parts = v.ruta.nombre.split('-');
        origen = parts[0]?.trim() || v.ruta.nombre;
        destino = parts[1]?.trim() || 'Destino';
      }

      const totalAsientos = v.despacho?.asignacionUnidad?.unidad?.asientos?.length || 15;
      const asientosOcupados = v.boletos.length;
      const asientosDisponibles = Math.max(0, totalAsientos - asientosOcupados);
      const precioBase = Number(v.ruta.tarifas[0]?.monto) || 85;

      const salidaDate = new Date(v.hrSalidaProgramada);
      const horaSalida = !isNaN(salidaDate.getTime())
        ? salidaDate.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '06:00 AM';

      return {
        idViaje: v.idViaje,
        origen,
        destino,
        rutaNombre: v.ruta.nombre,
        cooperativa: v.ruta.cooperativa.nombre,
        fecha: new Date(v.fecha).toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' }),
        horaSalida,
        unidadNumero: v.despacho?.asignacionUnidad?.unidad?.numeroUnidad || 'Sin bus',
        unidadPlaca: v.despacho?.asignacionUnidad?.unidad?.placa || 'N/A',
        precioBase,
        totalAsientos,
        asientosDisponibles,
        asientosOcupados,
        estado: v.estado,
      };
    });

    return { success: true, data: salidas };
  } catch (error) {
    console.error('Error al obtener salidas para taquilla:', error);
    return { success: false, error: 'Error al consultar salidas.', data: [] };
  }
}

/**
 * Obtiene el croquis de asientos y ocupación de un viaje específico para la ventanilla.
 */
export async function getAsientosSalidaTaquillaAction(idViaje: number): Promise<{
  success: boolean;
  data: AsientoTaquillaItem[];
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session || !TAQUILLA_ROLES.includes(session.rolNombre)) {
      return { success: false, error: 'No autorizado.', data: [] };
    }

    const viaje = await prisma.viaje.findUnique({
      where: { idViaje },
      include: {
        despacho: {
          include: {
            asignacionUnidad: {
              include: {
                unidad: {
                  include: {
                    asientos: { orderBy: { idAsiento: 'asc' } },
                  },
                },
              },
            },
          },
        },
        boletos: {
          where: { estado: { in: ['PAGADO', 'RESERVADO', 'ABORDADO'] } },
          select: { idAsiento: true, estado: true },
        },
      },
    });

    if (!viaje || !viaje.despacho?.asignacionUnidad?.unidad) {
      return { success: false, error: 'El viaje no tiene unidad asignada.', data: [] };
    }

    const ocupadosSet = new Set(viaje.boletos.map((b) => b.idAsiento));
    const asientos = viaje.despacho.asignacionUnidad.unidad.asientos.map((a) => {
      const isOcupado = ocupadosSet.has(a.idAsiento);
      return {
        idAsiento: a.idAsiento,
        numero: a.numero,
        estado: isOcupado ? ('OCUPADO' as const) : ('DISPONIBLE' as const),
      };
    });

    return { success: true, data: asientos };
  } catch (error) {
    console.error('Error al obtener asientos para taquilla:', error);
    return { success: false, error: 'Error al cargar asientos.', data: [] };
  }
}

/**
 * Procesa la venta directa en ventanilla de taquilla:
 * - Cobra en efectivo
 * - Calcula el cambio/vuelto
 * - Registra la venta atómica con tipo VENTANILLA_TERMINAL
 * - Genera el voucher térmico con código QR
 */
export async function venderBoletosTaquillaAction(input: {
  idViaje: number;
  asientos: Array<{ idAsiento: number; numero: string; monto: number }>;
  equipajeCantidad?: number;
  equipajeMonto?: number;
  efectivoRecibido: number;
}): Promise<{ success: boolean; data?: ResultadoVentaTaquilla; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !TAQUILLA_ROLES.includes(session.rolNombre)) {
      return { success: false, error: 'No autorizado para emitir boletos de taquilla.' };
    }

    if (!input.asientos || input.asientos.length === 0) {
      return { success: false, error: 'Selecciona al menos un asiento para emitir.' };
    }

    const totalBoletos = input.asientos.reduce((sum, a) => sum + a.monto, 0);
    const totalEquipaje = input.equipajeMonto || 0;
    const totalVenta = totalBoletos + totalEquipaje;

    if (input.efectivoRecibido < totalVenta) {
      return {
        success: false,
        error: `El efectivo recibido (C$ ${input.efectivoRecibido.toFixed(2)}) es menor al total a cobrar (C$ ${totalVenta.toFixed(2)}).`,
      };
    }

    const cambio = input.efectivoRecibido - totalVenta;

    // Buscar o crear TipoVenta = VENTANILLA_TERMINAL
    let tipoVenta = await prisma.tipoVenta.findFirst({
      where: { nombre: 'VENTANILLA_TERMINAL' },
    });
    if (!tipoVenta) {
      tipoVenta = await prisma.tipoVenta.create({
        data: {
          nombre: 'VENTANILLA_TERMINAL',
          descripcion: 'Venta física presencial en taquilla de terminal',
        },
      });
    }

    // Preparar payload para procesarVentaBoletos
    const boletosPayload: ItemBoletoInput[] = input.asientos.map((a, idx) => ({
      idAsiento: a.idAsiento,
      monto: a.monto,
      ...(idx === 0 && (input.equipajeCantidad || 0) > 0
        ? {
            equipaje: {
              cantidad: input.equipajeCantidad,
              monto: totalEquipaje,
              descripcion: `Equipaje taquilla (${input.equipajeCantidad} bultos)`,
            },
          }
        : {}),
    }));

    const resVenta = await procesarVentaBoletos({
      idViaje: input.idViaje,
      idTipoVenta: tipoVenta.idTipoVenta,
      boletos: boletosPayload,
    });

    if (!resVenta.success || !resVenta.data) {
      return { success: false, error: resVenta.error || 'Error al emitir boletos.' };
    }

    // Consultar detalles para el recibo térmico
    const viaje = await prisma.viaje.findUnique({
      where: { idViaje: input.idViaje },
      include: {
        ruta: {
          include: {
            cooperativa: true,
            puntosRuta: { include: { punto: true }, orderBy: { orden: 'asc' } },
          },
        },
        despacho: {
          include: {
            asignacionUnidad: {
              include: { unidad: true },
            },
          },
        },
      },
    });

    let origen = 'Managua';
    let destino = 'Destino';
    if (viaje?.ruta.puntosRuta && viaje.ruta.puntosRuta.length > 0) {
      origen = viaje.ruta.puntosRuta[0].punto.nombre;
      destino = viaje.ruta.puntosRuta[viaje.ruta.puntosRuta.length - 1].punto.nombre;
    }

    const fechaSalida = viaje ? new Date(viaje.fecha).toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const horaSalida = viaje ? new Date(viaje.hrSalidaProgramada).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

    const asientosMap = new Map(input.asientos.map((a) => [a.idAsiento, a.numero]));

    revalidatePath('/dashboard/pos');
    revalidatePath('/admin/ventas');

    return {
      success: true,
      data: {
        idVenta: resVenta.data.idVenta,
        idViaje: input.idViaje,
        codigoVenta: `VTA-${resVenta.data.idVenta}`,
        total: totalVenta,
        efectivoRecibido: input.efectivoRecibido,
        cambio,
        cooperativa: viaje?.ruta.cooperativa.nombre || 'Cooperativa',
        origen,
        destino,
        fechaSalida,
        horaSalida,
        unidadNumero: viaje?.despacho?.asignacionUnidad?.unidad.numeroUnidad || 'N/A',
        unidadPlaca: viaje?.despacho?.asignacionUnidad?.unidad.placa || 'N/A',
        taquillero: session.nombre || 'Taquilla',
        boletos: resVenta.data.boletos.map((b) => ({
          idBoleto: b.idBoleto,
          codigoBoleto: b.codigoBoleto,
          numeroAsiento: asientosMap.get(b.idAsiento) || String(b.idAsiento),
          monto: b.monto,
        })),
      },
    };
  } catch (error: any) {
    console.error('Error al vender boletos en taquilla:', error);
    return { success: false, error: error.message || 'Error al emitir boleto en taquilla.' };
  }
}
