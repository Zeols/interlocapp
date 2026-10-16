'use server';

import { prisma } from '../db';
import { getSession } from '../lib/session';
import { revalidatePath } from 'next/cache';
import { TipoMetodoPago } from '@prisma/client';

export interface CreateMetodoPagoInput {
  tipo?: TipoMetodoPago;
  titular: string;
  numeroTarjeta: string;
  mesExpiracion: number;
  anioExpiracion: number;
  marca?: string;
  esPredeterminado?: boolean;
}

// Detección automática de marca por prefijo de tarjeta
function detectarMarca(numero: string): string {
  const limpio = numero.replace(/\D/g, '');
  if (/^4/.test(limpio)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(limpio)) return 'MASTERCARD';
  if (/^3[47]/.test(limpio)) return 'AMEX';
  if (/^(6011|65|64[4-9])/.test(limpio)) return 'DISCOVER';
  return 'LOCAL';
}

/**
 * Obtener todos los métodos de pago registrados por el usuario en sesión activa
 */
export async function getMetodosPagoUsuarioAction() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Debe iniciar sesión para ver sus métodos de pago.' };
    }

    const metodos = await prisma.metodoPagoUsuario.findMany({
      where: {
        idUsuario: session.idUsuario,
        estado: 'ACTIVO',
      },
      orderBy: [
        { esPredeterminado: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        idMetodoPago: true,
        tipo: true,
        titular: true,
        marca: true,
        ultimos4: true,
        mesExpiracion: true,
        anioExpiracion: true,
        esPredeterminado: true,
        createdAt: true,
      },
    });

    return { success: true, data: metodos };
  } catch (error: any) {
    console.error('Error al obtener métodos de pago:', error);
    return { success: false, error: error?.message || 'No se pudieron consultar los métodos de pago.' };
  }
}

/**
 * Agregar un nuevo método de pago (Tarjeta o Billetera) en la base de datos
 */
export async function createMetodoPagoAction(input: CreateMetodoPagoInput) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Debe iniciar sesión para registrar un método de pago.' };
    }

    if (!input.titular || input.titular.trim().length < 3) {
      return { success: false, error: 'El nombre del titular es requerido (mínimo 3 caracteres).' };
    }

    const numeroLimpio = input.numeroTarjeta.replace(/\D/g, '');
    if (numeroLimpio.length < 13 || numeroLimpio.length > 19) {
      return { success: false, error: 'El número de tarjeta ingresado no es válido.' };
    }

    const ultimos4 = numeroLimpio.slice(-4);
    const marcaDetectada = input.marca || detectarMarca(numeroLimpio);

    // Validar expiración
    const mes = Number(input.mesExpiracion);
    const anio = Number(input.anioExpiracion);
    if (isNaN(mes) || mes < 1 || mes > 12) {
      return { success: false, error: 'El mes de expiración debe ser entre 1 y 12.' };
    }
    const currentYear = new Date().getFullYear();
    if (isNaN(anio) || anio < currentYear || anio > currentYear + 20) {
      return { success: false, error: 'El año de expiración no es válido.' };
    }

    // Contar si ya tiene métodos existentes
    const totalExistentes = await prisma.metodoPagoUsuario.count({
      where: {
        idUsuario: session.idUsuario,
        estado: 'ACTIVO',
      },
    });

    // Si es el primero, siempre será predeterminado
    const deberiaSerPredeterminado = totalExistentes === 0 ? true : Boolean(input.esPredeterminado);

    const resultado = await prisma.$transaction(async (tx) => {
      // Si el nuevo método será predeterminado, desmarcar los demás
      if (deberiaSerPredeterminado) {
        await tx.metodoPagoUsuario.updateMany({
          where: { idUsuario: session.idUsuario },
          data: { esPredeterminado: false },
        });
      }

      return await tx.metodoPagoUsuario.create({
        data: {
          idUsuario: session.idUsuario,
          tipo: input.tipo || TipoMetodoPago.TARJETA_DEBITO,
          titular: input.titular.trim().toUpperCase(),
          marca: marcaDetectada,
          ultimos4,
          mesExpiracion: mes,
          anioExpiracion: anio,
          esPredeterminado: deberiaSerPredeterminado,
          estado: 'ACTIVO',
        },
      });
    });

    revalidatePath('/settings');
    revalidatePath('/compra');

    return {
      success: true,
      data: {
        idMetodoPago: resultado.idMetodoPago,
        titular: resultado.titular,
        marca: resultado.marca,
        ultimos4: resultado.ultimos4,
        mesExpiracion: resultado.mesExpiracion,
        anioExpiracion: resultado.anioExpiracion,
        esPredeterminado: resultado.esPredeterminado,
      },
    };
  } catch (error: any) {
    console.error('Error al registrar método de pago:', error);
    return {
      success: false,
      error: error.message || 'No se pudo guardar el método de pago.',
    };
  }
}

/**
 * Marcar un método de pago como el predeterminado para compras
 */
export async function setDefaultMetodoPagoAction(idMetodoPago: number) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Debe iniciar sesión.' };
    }

    const metodo = await prisma.metodoPagoUsuario.findFirst({
      where: {
        idMetodoPago,
        idUsuario: session.idUsuario,
        estado: 'ACTIVO',
      },
    });

    if (!metodo) {
      return { success: false, error: 'Método de pago no encontrado.' };
    }

    await prisma.$transaction([
      prisma.metodoPagoUsuario.updateMany({
        where: { idUsuario: session.idUsuario },
        data: { esPredeterminado: false },
      }),
      prisma.metodoPagoUsuario.update({
        where: { idMetodoPago },
        data: { esPredeterminado: true },
      }),
    ]);

    revalidatePath('/settings');
    revalidatePath('/compra');
    return { success: true };
  } catch (error) {
    console.error('Error al establecer método predeterminado:', error);
    return { success: false, error: 'No se pudo actualizar el método predeterminado.' };
  }
}

/**
 * Eliminar (dar de baja) un método de pago
 */
export async function deleteMetodoPagoAction(idMetodoPago: number) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Debe iniciar sesión.' };
    }

    const metodo = await prisma.metodoPagoUsuario.findFirst({
      where: {
        idMetodoPago,
        idUsuario: session.idUsuario,
        estado: 'ACTIVO',
      },
    });

    if (!metodo) {
      return { success: false, error: 'Método de pago no encontrado.' };
    }

    await prisma.$transaction(async (tx) => {
      // Eliminar el método seleccionado
      await tx.metodoPagoUsuario.delete({
        where: { idMetodoPago },
      });

      // Si el método eliminado era el predeterminado, asignar el más reciente
      if (metodo.esPredeterminado) {
        const siguiente = await tx.metodoPagoUsuario.findFirst({
          where: {
            idUsuario: session.idUsuario,
            estado: 'ACTIVO',
          },
          orderBy: { createdAt: 'desc' },
        });

        if (siguiente) {
          await tx.metodoPagoUsuario.update({
            where: { idMetodoPago: siguiente.idMetodoPago },
            data: { esPredeterminado: true },
          });
        }
      }
    });

    revalidatePath('/settings');
    revalidatePath('/compra');
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar método de pago:', error);
    return { success: false, error: 'No se pudo eliminar el método de pago.' };
  }
}
