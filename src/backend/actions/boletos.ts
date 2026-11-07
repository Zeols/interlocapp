'use server';

import { prisma } from '../db';
import { getSession } from '../lib/session';
import { revalidatePath } from 'next/cache';
import { formatManaguaTime, formatDateOnlyEsNI } from '@/lib/date-time';
import { notificarUsuarioPush } from './push';

const OPERATIONAL_ROLES = ['SUPER_ADMIN', 'ADMIN_COOP', 'TAQUILLERO', 'CHOFER', 'AYUDANTE', 'CHEQUEADOR'];

export interface ResultadoValidacionBoleto {
  idBoleto: number;
  codigoBoleto: string;
  estadoAnterior: string;
  nuevoEstado: string;
  fechaValidacion: string;
  pasajeroNombre: string;
  asientoNumero: string | number;
  origen: string;
  destino: string;
  unidadNumero: string;
  placaUnidad: string;
  horaSalida: string;
  cooperativaNombre: string;
}

function parseOrigenDestino(
  ruta: {
    nombre: string;
    puntosRuta?: { orden: number; punto: { nombre: string } }[];
  },
  sentido?: string | null
): { origen: string; destino: string } {
  const esRetorno = sentido?.includes('VUELTA') || sentido?.includes('RETORNO');
  if (ruta.puntosRuta && ruta.puntosRuta.length > 0) {
    const sorted = [...ruta.puntosRuta].sort((a, b) => a.orden - b.orden);
    const ordered = esRetorno ? [...sorted].reverse() : sorted;
    return {
      origen: ordered[0].punto.nombre,
      destino: ordered[ordered.length - 1].punto.nombre,
    };
  }
  const parts = ruta.nombre.split('-');
  const first = parts[0]?.trim() || 'Origen';
  const second = parts[1]?.trim() || 'Destino';
  return esRetorno
    ? { origen: second, destino: first }
    : { origen: first, destino: second };
}

/**
 * Valida un boleto y lo marca en estado ABORDADO.
 * Restringido a roles operativos: SUPER_ADMIN, ADMIN_COOP, TAQUILLERO, CHOFER, AYUDANTE.
 * Aplica aislamiento multi-tenant: si el usuario pertenece a una cooperativa, solo valida boletos de su cooperativa.
 */
export async function validarBoletoAction(
  rawInput: string | number
): Promise<{ success: boolean; data?: ResultadoValidacionBoleto; error?: string; alreadyBoarded?: boolean }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Debes iniciar sesión para realizar esta operación.' };
    }

    if (!OPERATIONAL_ROLES.includes(session.rolNombre)) {
      return {
        success: false,
        error: `Acceso denegado. Tu rol (${session.rolNombre}) no tiene permisos para validar boletos.`,
      };
    }

    // Extraer idBoleto numérico de diferentes formatos posibles (JSON de QR, prefijo BOLETO-, número directo)
    let idBoleto: number | null = null;

    if (typeof rawInput === 'number') {
      idBoleto = rawInput;
    } else if (typeof rawInput === 'string') {
      const trimmed = rawInput.trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.b !== undefined && parsed.b !== null) {
            idBoleto = Number(parsed.b);
          } else if (parsed.idBoleto !== undefined && parsed.idBoleto !== null) {
            idBoleto = Number(parsed.idBoleto);
          } else if (parsed.c && typeof parsed.c === 'string') {
            const m = parsed.c.match(/(\d+)/);
            if (m) idBoleto = Number(m[1]);
          }
        } catch {
          // No es JSON válido, continúa con parsing de texto
        }
      }

      if (!idBoleto) {
        // Verificar si viene con formato BOLETO-123 o similar
        const boletoMatch = trimmed.match(/BOLETO[ -_:]*(\d+)/i);
        if (boletoMatch) {
          idBoleto = Number(boletoMatch[1]);
        } else if (/^\d+$/.test(trimmed)) {
          // Número directo
          idBoleto = Number(trimmed);
        } else {
          // Extraer únicamente secuencias numéricas cortas (1 a 9 dígitos) para ignorar timestamps (Date.now())
          const matches = trimmed.match(/\b\d{1,9}\b/g);
          if (matches && matches.length > 0) {
            idBoleto = Number(matches[0]);
          }
        }
      }
    }

    // Proteger contra overflow de INTEGER en PostgreSQL (máximo 2,147,483,647)
    if (!idBoleto || isNaN(idBoleto) || idBoleto <= 0 || idBoleto > 2147483647) {
      return { success: false, error: 'Código de boleto inválido o no reconocido.' };
    }

    // Consultar boleto con información completa de viaje, unidad y ruta
    const boletoInclude = {
      asiento: true,
      viaje: {
        include: {
          ruta: {
            include: {
              cooperativa: true,
              puntosRuta: {
                include: { punto: true },
              },
            },
          },
          despacho: {
            include: {
              asignacionUnidad: {
                include: {
                  unidad: true,
                },
              },
            },
          },
        },
      },
      venta: true,
    };

    let boleto = await prisma.boleto.findUnique({
      where: { idBoleto },
      include: boletoInclude,
    });

    if (!boleto) {
      // Fallback: Si el código escaneado corresponde al ID de la transacción de venta (TK-#)
      boleto = await prisma.boleto.findFirst({
        where: { idVenta: idBoleto },
        include: boletoInclude,
        orderBy: { idBoleto: 'asc' },
      });
    }

    if (!boleto) {
      return { success: false, error: `No se encontró ningún boleto registrado con el código #${idBoleto}.` };
    }

    const coopBoleto = boleto.viaje.ruta.cooperativa;

    // Validación multi-tenant: Si no es Super Admin, debe pertenecer a la misma cooperativa
    if (session.rolNombre !== 'SUPER_ADMIN' && session.idCooperativa) {
      if (coopBoleto.idCooperativa !== session.idCooperativa) {
        return {
          success: false,
          error: `Este boleto pertenece a "${coopBoleto.nombre}". No tienes autorización para validarlo desde otra cooperativa.`,
        };
      }
    }

    const { origen, destino } = parseOrigenDestino(boleto.viaje.ruta, boleto.viaje.sentido);

    // Si ya fue abordado
    if (boleto.estado === 'ABORDADO') {
      return {
        success: false,
        alreadyBoarded: true,
        error: `El boleto #${boleto.idBoleto} ya fue ABORDADO anteriormente.`,
        data: {
          idBoleto: boleto.idBoleto,
          codigoBoleto: `BOLETO-${boleto.idBoleto}`,
          estadoAnterior: boleto.estado,
          nuevoEstado: boleto.estado,
          fechaValidacion: boleto.fechaHora.toISOString(),
          pasajeroNombre: 'Pasajero Verificado',
          asientoNumero: boleto.asiento?.numero || 'De pie',
          origen,
          destino,
          unidadNumero: boleto.viaje.despacho?.asignacionUnidad.unidad.numeroUnidad || 'S/N',
          placaUnidad: boleto.viaje.despacho?.asignacionUnidad.unidad.placa || 'N/A',
          horaSalida: formatManaguaTime(boleto.viaje.hrSalidaProgramada),
          cooperativaNombre: coopBoleto.nombre,
        },
      };
    }

    // Si está cancelado
    if (boleto.estado === 'CANCELADO') {
      return {
        success: false,
        error: `El boleto #${boleto.idBoleto} está CANCELADO y no es válido para abordar.`,
      };
    }

    // Actualizar estado a ABORDADO
    const boletoActualizado = await prisma.boleto.update({
      where: { idBoleto },
      data: {
        estado: 'ABORDADO',
      },
      include: {
        asiento: true,
        viaje: {
          include: {
            ruta: {
              include: {
                cooperativa: true,
                puntosRuta: {
                  include: { punto: true },
                },
              },
            },
            despacho: {
              include: {
                asignacionUnidad: {
                  include: {
                    unidad: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    revalidatePath('/validar-boleto');
    revalidatePath('/taquilla');
    revalidatePath('/dashboard');

    if (boleto.venta?.idUsuarioComprador) {
      notificarUsuarioPush(boleto.venta.idUsuarioComprador, {
        title: 'Boleto validado',
        body: `Tu boleto #${boletoActualizado.idBoleto} (Asiento #${boletoActualizado.asiento?.numero || 'Asignado'}) ha sido verificado para el viaje. ¡Buen viaje!`,
        url: '/tickets',
      }).catch((e) => console.error('Error enviando push abordaje:', e));
    }

    const rutasPuntos = parseOrigenDestino(boletoActualizado.viaje.ruta, boletoActualizado.viaje.sentido);

    return {
      success: true,
      data: {
        idBoleto: boletoActualizado.idBoleto,
        codigoBoleto: `BOLETO-${boletoActualizado.idBoleto}`,
        estadoAnterior: boleto.estado,
        nuevoEstado: boletoActualizado.estado,
        fechaValidacion: new Date().toISOString(),
        pasajeroNombre: 'Pasajero con Boleto Oficial',
        asientoNumero: boletoActualizado.asiento?.numero || 'De pie',
        origen: rutasPuntos.origen,
        destino: rutasPuntos.destino,
        unidadNumero: boletoActualizado.viaje.despacho?.asignacionUnidad.unidad.numeroUnidad || 'S/N',
        placaUnidad: boletoActualizado.viaje.despacho?.asignacionUnidad.unidad.placa || 'N/A',
        horaSalida: formatManaguaTime(boletoActualizado.viaje.hrSalidaProgramada),
        cooperativaNombre: coopBoleto.nombre,
      },
    };
  } catch (error) {
    console.error('Error en validarBoletoAction:', error);
    return { success: false, error: 'Ocurrió un error al validar el boleto.' };
  }
}

/**
 * Consulta el estado operativo actual de un viaje para la tripulación (Ayudante / Chofer).
 * Retorna la unidad asignada, lista de boletos y conteo de abordaje.
 */
export async function getManifiestoViajeAction(idViaje?: number) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'No autorizado' };
    }

    const coopFilter = session.rolNombre === 'SUPER_ADMIN' ? {} : session.idCooperativa ? { idCooperativa: session.idCooperativa } : {};

    const viajeInclude = {
      ruta: {
        include: {
          cooperativa: true,
          puntosRuta: {
            include: { punto: true },
            orderBy: { orden: 'asc' as const },
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
              usuario: {
                select: { nombre: true, apellido: true },
              },
            },
          },
        },
      },
      boletos: {
        include: {
          asiento: true,
        },
        orderBy: { asiento: { numero: 'asc' as const } },
      },
    };

    // Si no se especifica viaje, busca el viaje programado o en curso más reciente
    const viaje = idViaje
      ? await prisma.viaje.findUnique({
          where: { idViaje },
          include: viajeInclude,
        })
      : await prisma.viaje.findFirst({
          where: {
            ruta: coopFilter,
            estado: { in: ['PROGRAMADO', 'EN_CURSO'] },
          },
          orderBy: { hrSalidaProgramada: 'asc' },
          include: viajeInclude,
        });

    if (!viaje) {
      return { success: true, data: null };
    }

    const boletosAbordados = viaje.boletos.filter((b) => b.estado === 'ABORDADO').length;
    const boletosPagados = viaje.boletos.filter((b) => b.estado === 'PAGADO').length;
    const totalBoletos = viaje.boletos.length;
    const capacidadUnidad = viaje.despacho?.asignacionUnidad?.unidad?.asientos?.length || 15;

    const { origen, destino } = parseOrigenDestino(viaje.ruta, viaje.sentido);
    const choferNombre = viaje.despacho?.asignacionUnidad?.usuario
      ? `${viaje.despacho.asignacionUnidad.usuario.nombre} ${viaje.despacho.asignacionUnidad.usuario.apellido}`.trim()
      : 'Sin chofer';

    return {
      success: true,
      data: {
        idViaje: viaje.idViaje,
        origen,
        destino,
        cooperativa: viaje.ruta.cooperativa.nombre,
        horaSalida: formatManaguaTime(viaje.hrSalidaProgramada),
        estadoViaje: viaje.estado,
        unidad: viaje.despacho?.asignacionUnidad?.unidad.numeroUnidad || 'Sin asignar',
        placa: viaje.despacho?.asignacionUnidad?.unidad.placa || 'N/A',
        chofer: choferNombre,
        ayudante: 'Tripulación asignada',
        capacidadUnidad,
        boletosAbordados,
        boletosPagados,
        totalBoletos,
        boletos: viaje.boletos.map((b) => ({
          idBoleto: b.idBoleto,
          codigoBoleto: `BOLETO-${b.idBoleto}`,
          asientoNumero: b.asiento?.numero || 'De pie',
          monto: Number(b.monto),
          estado: b.estado,
          fechaHora: b.fechaHora.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error('Error en getManifiestoViajeAction:', error);
    return { success: false, error: 'Error al consultar manifiesto de viaje.' };
  }
}

export interface MiBoletoItem {
  id: string;
  codigoBoleto: string;
  origen: string;
  destino: string;
  fecha: string;
  horaSalida: string;
  asientoNumero: string;
  cooperativa: string;
  precio: number;
  estado: 'ACTIVO' | 'UTILIZADO' | 'CANCELADO';
}

/**
 * Obtiene los boletos comprados o asignados al usuario autenticado.
 */
export async function getMisBoletosAction(): Promise<{ success: boolean; data: MiBoletoItem[]; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Debes iniciar sesión para consultar tus boletos.', data: [] };
    }

    // Consultar boletos pertenecientes exclusivamente al usuario en sesión
    const boletos = await prisma.boleto.findMany({
      where: {
        venta: {
          idUsuarioComprador: session.idUsuario,
        },
      },
      take: 20,
      orderBy: { fechaHora: 'desc' },
      include: {
        asiento: true,
        viaje: {
          include: {
            ruta: {
              include: {
                cooperativa: true,
                puntosRuta: {
                  include: { punto: true },
                  orderBy: { orden: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    const items: MiBoletoItem[] = boletos.map((b) => {
      const { origen, destino } = parseOrigenDestino(b.viaje.ruta, b.viaje.sentido);
      const fecha = formatDateOnlyEsNI(b.viaje.fecha);
      const horaSalida = formatManaguaTime(b.viaje.hrSalidaProgramada);

      let estadoMapeado: 'ACTIVO' | 'UTILIZADO' | 'CANCELADO' = 'ACTIVO';
      if (b.estado === 'ABORDADO') estadoMapeado = 'UTILIZADO';
      else if (b.estado === 'CANCELADO') estadoMapeado = 'CANCELADO';

      return {
        id: `b-${b.idBoleto}`,
        codigoBoleto: `BOLETO-${b.idBoleto}`,
        origen,
        destino,
        fecha,
        horaSalida,
        asientoNumero: b.asiento ? String(b.asiento.numero) : 'De pie',
        cooperativa: b.viaje.ruta.cooperativa.nombre,
        precio: Number(b.monto),
        estado: estadoMapeado,
      };
    });

    return { success: true, data: items };
  } catch (error) {
    console.error('Error en getMisBoletosAction:', error);
    return { success: false, error: 'Error al consultar boletos.', data: [] };
  }
}

