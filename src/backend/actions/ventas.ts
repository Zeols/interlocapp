'use server';

import { prisma } from '../db';
import { revalidatePath } from 'next/cache';

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
    return { success: true, data: tarifa };
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

    revalidatePath('/admin/ventas');
    return { success: true, data: resultado };
  } catch (error: any) {
    console.error('Error al procesar la venta:', error);
    return {
      success: false,
      error: error.message || 'Error al completar la venta.',
    };
  }
}
