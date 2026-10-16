'use server';

import { prisma } from '../db';
import { revalidatePath } from 'next/cache';
import { getSession } from '../lib/session';
import { sendTicketEmail } from '../lib/mail';

// Interfaces
export interface EquipajeInput {
  idTarifaEquipaje: number;
  descripcion?: string;
  cantidad?: number;
  monto: number;
}

export interface ItemBoletoInput {
  idAsiento: number;
  idTarifa: number;
  monto: number;
  equipaje?: EquipajeInput; // Equipaje opcional asignado a este boleto
}

export interface VentaInput {
  idViaje: number;
  idTipoVenta: number;
  boletos: ItemBoletoInput[];
}

export interface TarifaEquipajeInput {
  descripcion: string;
  monto: number;
}

// -------------------------------------------------------------
// 1. CATÁLOGOS: TIPO DE VENTA Y TARIFAS DE EQUIPAJE
// -------------------------------------------------------------

export async function createTipoVenta(nombre: string, descripcion?: string) {
  try {
    const tipo = await prisma.tipoVenta.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        estado: 'ACTIVO',
      },
    });
    return { success: true, data: tipo };
  } catch (error) {
    console.error('Error al crear tipo de venta:', error);
    return { success: false, error: 'No se pudo crear el tipo de venta.' };
  }
}

export async function createTarifaEquipaje(data: TarifaEquipajeInput) {
  try {
    const tarifa = await prisma.tarifaEquipaje.create({
      data: {
        descripcion: data.descripcion.trim(),
        monto: data.monto,
        estado: 'ACTIVO',
      },
    });
    return { success: true, data: { ...tarifa, monto: Number(tarifa.monto) } };
  } catch (error) {
    console.error('Error al crear tarifa de equipaje:', error);
    return { success: false, error: 'No se pudo crear la tarifa de equipaje.' };
  }
}

// -------------------------------------------------------------
// 2. MAPA DE ASIENTOS Y ESTADO DEL VIAJE
// -------------------------------------------------------------

export async function getMapaAsientosViaje(idViaje: number) {
  try {
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
          where: { estado: { in: ['PAGADO', 'RESERVADO'] } },
          select: { idAsiento: true, estado: true },
        },
      },
    });

    if (!viaje || !viaje.despacho) {
      return {
        success: false,
        error: 'El viaje no existe o no tiene autobús y chofer asignado.',
      };
    }

    const asientosBase = viaje.despacho.asignacionUnidad.unidad.asientos;
    const boletosOcupadosMap = new Map(viaje.boletos.map((b) => [b.idAsiento, b.estado]));

    const mapaAsientos = asientosBase.map((asiento) => ({
      ...asiento,
      estadoEnViaje: boletosOcupadosMap.get(asiento.idAsiento) || asiento.estado,
    }));

    return { success: true, data: mapaAsientos };
  } catch (error) {
    console.error('Error al obtener mapa de asientos:', error);
    return { success: false, error: 'No se pudo cargar el mapa de asientos.' };
  }
}

// -------------------------------------------------------------
// 3. PROCESAR VENTA DE BOLETOS CON EQUIPAJE (Transacción Atómica)
// -------------------------------------------------------------

export async function procesarVentaBoletos(data: VentaInput) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Debe iniciar sesión para realizar la compra de boletos.' };
    }

    if (!data.boletos || data.boletos.length === 0) {
      return { success: false, error: 'Debe seleccionar al menos un asiento.' };
    }

    // Calcular monto total sumando pasaje + equipaje de cada boleto
    const totalVenta = data.boletos.reduce((acc, item) => {
      const montoEquipaje = item.equipaje ? item.equipaje.monto : 0;
      return acc + item.monto + montoEquipaje;
    }, 0);

    const resultado = await prisma.$transaction(async (tx) => {
      // a) Validar disponibilidad de asientos
      const asientosIds = data.boletos.map((b) => b.idAsiento);
      const ocupados = await tx.boleto.findMany({
        where: {
          idViaje: data.idViaje,
          idAsiento: { in: asientosIds },
          estado: { in: ['PAGADO', 'RESERVADO'] },
        },
      });

      if (ocupados.length > 0) {
        throw new Error('Uno o más asientos ya se encuentran ocupados o reservados.');
      }

      // b) Crear Venta (Cabecera)
      const nuevaVenta = await tx.venta.create({
        data: {
          idViaje: data.idViaje,
          idTipoVenta: data.idTipoVenta,
          total: totalVenta,
          estado: 'COMPLETADA',
        },
      });

      // c) Crear Boletos e integrar su Equipaje correspondiente
      for (const item of data.boletos) {
        const boletoCreado = await tx.boleto.create({
          data: {
            idVenta: nuevaVenta.idVenta,
            idViaje: data.idViaje,
            idAsiento: item.idAsiento,
            idTarifa: item.idTarifa,
            monto: item.monto,
            estado: 'PAGADO',
          },
        });

        // Registrar equipaje adjunto si fue especificado
        if (item.equipaje) {
          await tx.equipaje.create({
            data: {
              idBoleto: boletoCreado.idBoleto,
              idTarifaEquipaje: item.equipaje.idTarifaEquipaje,
              descripcion: item.equipaje.descripcion?.trim() || null,
              cantidad: item.equipaje.cantidad || 1,
              monto: item.equipaje.monto,
            },
          });
        }
      }

      // d) Cambiar estado de los asientos a OCUPADO
      await tx.asiento.updateMany({
        where: { idAsiento: { in: asientosIds } },
        data: { estado: 'OCUPADO' },
      });

      return nuevaVenta;
    });

    // Enviar confirmación electrónica del boleto si el usuario tiene correo en sesión
    if (session.correo) {
      prisma.viaje.findUnique({
        where: { idViaje: data.idViaje },
        include: {
          ruta: true,
          despacho: {
            include: {
              asignacionUnidad: {
                include: { unidad: true },
              },
            },
          },
        },
      }).then(async (viajeInfo) => {
        if (!viajeInfo) return;
        const asientosNumeros = await prisma.asiento.findMany({
          where: { idAsiento: { in: data.boletos.map((b) => b.idAsiento) } },
          select: { numero: true },
        });

        const partesRuta = viajeInfo.ruta.nombre.split('-');
        const origen = partesRuta[0]?.trim() || viajeInfo.ruta.nombre;
        const destino = partesRuta[1]?.trim() || 'Destino';
        const fechaStr = new Date(viajeInfo.fecha).toLocaleDateString('es-NI', { dateStyle: 'medium' });
        const horaStr = new Date(viajeInfo.hrSalidaProgramada).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });

        await sendTicketEmail({
          to: session.correo,
          passengerName: session.nombre || 'Pasajero',
          ticketCode: `TK-${resultado.idVenta}`,
          origin: origen,
          destination: destino,
          departureDate: fechaStr,
          departureTime: horaStr,
          seats: asientosNumeros.map((a) => a.numero),
          unitPlate: viajeInfo.despacho?.asignacionUnidad?.unidad?.placa,
          totalAmount: totalVenta,
        });
      }).catch((mailError) => {
        console.warn('[Venta] No se pudo enviar el correo de confirmación de boletos:', mailError);
      });
    }

    revalidatePath('/admin/ventas');
    return {
      success: true,
      data: {
        ...resultado,
        total: Number(resultado.total),
      },
    };
  } catch (error: any) {
    console.error('Error al procesar la venta:', error);
    return {
      success: false,
      error: error.message || 'Error al completar la venta.',
    };
  }
}

// -------------------------------------------------------------
// 4. MÉTRICAS REALES PARA EL PANEL ADMINISTRATIVO (SIN SLOP)
// -------------------------------------------------------------

export async function getDashboardStatsAction(idCooperativa?: number) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const coopFilter = idCooperativa ? { idCooperativa } : {};
    const tripCoopFilter = idCooperativa ? { viaje: { ruta: { idCooperativa } } } : {};

    const [
      ventasHoyAggregate,
      ventasHistoricasAggregate,
      boletosCount,
      unidades,
      pasajerosCount,
      ultimasVentas,
      asientosTotalesCount,
      boletosOcupadosCount,
    ] = await Promise.all([
      // Ventas de hoy
      prisma.venta.aggregate({
        _sum: { total: true },
        _count: { idVenta: true },
        where: {
          fechaHora: { gte: startOfDay },
          estado: 'COMPLETADA',
          ...tripCoopFilter,
        },
      }),
      // Ventas totales acumuladas
      prisma.venta.aggregate({
        _sum: { total: true },
        where: {
          estado: 'COMPLETADA',
          ...tripCoopFilter,
        },
      }),
      // Boletos emitidos en total
      prisma.boleto.count({
        where: {
          estado: { in: ['PAGADO', 'ABORDADO'] },
          ...tripCoopFilter,
        },
      }),
      // Unidades y disponibilidad
      prisma.unidad.findMany({
        where: coopFilter,
        select: { idUnidad: true, estado: true },
      }),
      // Pasajeros registrados
      prisma.usuario.count({
        where: { rol: { nombre: 'PASAJERO' } },
      }),
      // Últimas 6 ventas reales
      prisma.venta.findMany({
        take: 6,
        where: tripCoopFilter,
        orderBy: { fechaHora: 'desc' },
        include: {
          tipoVenta: true,
          viaje: {
            include: { ruta: true },
          },
          boletos: {
            include: { asiento: true },
          },
        },
      }),
      // Total de asientos instalados
      prisma.asiento.count({
        where: idCooperativa ? { unidad: { idCooperativa } } : {},
      }),
      // Asientos ocupados en boletos activos
      prisma.boleto.count({
        where: {
          estado: { in: ['PAGADO', 'RESERVADO'] },
          ...tripCoopFilter,
        },
      }),
    ]);

    const totalVentasHoy = Number(ventasHoyAggregate._sum.total || 0);
    const totalVentasHistoricas = Number(ventasHistoricasAggregate._sum.total || 0);
    const transaccionesHoy = ventasHoyAggregate._count.idVenta || 0;

    const totalUnidades = unidades.length;
    const unidadesOperativas = unidades.filter(
      (u) => u.estado === 'DISPONIBLE' || u.estado === 'EN_RUTA'
    ).length;

    // Calcular ocupación real basada en asientos ocupados vs total de asientos
    const ocupacionCalculada =
      asientosTotalesCount > 0
        ? Math.round((boletosOcupadosCount / asientosTotalesCount) * 100)
        : 0;

    return {
      success: true,
      data: {
        ventasHoy: totalVentasHoy,
        ventasHistoricas: totalVentasHistoricas,
        transaccionesHoy,
        boletosCount,
        unidadesActivas: unidadesOperativas,
        totalUnidades,
        pasajerosCount,
        ocupacionPorcentaje: Math.min(ocupacionCalculada, 100),
        ultimasVentas: ultimasVentas.map((v) => ({
          idVenta: v.idVenta,
          total: Number(v.total),
          estado: v.estado,
          tipoVenta: v.tipoVenta.nombre,
          rutaNombre: v.viaje?.ruta?.nombre || 'Ruta sin asignar',
          boletosCantidad: v.boletos.length,
          asientosNumeros: v.boletos.map((b) => b.asiento.numero),
          fechaHora: v.fechaHora.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error('Error al calcular estadísticas reales del dashboard:', error);
    return {
      success: false,
      error: 'No se pudieron consultar las métricas del dashboard.',
      data: {
        ventasHoy: 0,
        ventasHistoricas: 0,
        transaccionesHoy: 0,
        boletosCount: 0,
        unidadesActivas: 0,
        totalUnidades: 0,
        pasajerosCount: 0,
        ocupacionPorcentaje: 0,
        ultimasVentas: [],
      },
    };
  }
}

