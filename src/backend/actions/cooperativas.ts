'use server';

import { prisma } from '../db';
import { revalidatePath } from 'next/cache';
import { sendCooperativaAprobadaEmail } from '../lib/mail';
import { hashPassword } from '../lib/crypto';
import { ActionResponse } from '../lib/validations/auth';

export interface CooperativaInput {
  nombre: string;
  telefono?: string;
  direccion?: string;
}

export interface RegistroCooperativaInput {
  // Datos de la Cooperativa
  cooperativaNombre: string;
  cooperativaTelefono?: string;
  cooperativaDireccion?: string;
  // Datos del Administrador
  adminNombre: string;
  adminApellido: string;
  adminCorreo: string;
  adminTelefono?: string;
  adminPassword: string;
}

// 1. Obtener todas las cooperativas (con soporte de recuento)
export async function getCooperativas() {
  try {
    const cooperativas = await prisma.cooperativa.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { unidades: true, usuarios: true, rutas: true },
        },
      },
    });
    return { success: true, data: cooperativas };
  } catch (error) {
    console.error('Error al obtener cooperativas:', error);
    return { success: false, error: 'No se pudieron obtener las cooperativas.' };
  }
}

// 2. Obtener cooperativas activas (para selectores y estadísticas)
export async function getCooperativasActivasAction() {
  try {
    const cooperativas = await prisma.cooperativa.findMany({
      where: { estado: 'ACTIVO' },
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { unidades: true, usuarios: true, rutas: true },
        },
      },
    });
    return { success: true, data: cooperativas };
  } catch (error) {
    console.error('Error al obtener cooperativas activas:', error);
    return { success: false, error: 'No se pudieron cargar las cooperativas activas.' };
  }
}

// 3. Obtener solicitudes de cooperativas pendientes de aprobación (solo para SUPER_ADMIN)
export async function getSolicitudesCooperativasAction() {
  try {
    const solicitudes = await prisma.cooperativa.findMany({
      where: { estado: 'PENDIENTE_APROBACION' },
      orderBy: { createdAt: 'desc' },
      include: {
        usuarios: {
          where: { rol: { nombre: 'ADMIN_COOP' } },
          select: {
            idUsuario: true,
            nombre: true,
            apellido: true,
            correo: true,
            telefono: true,
            usuario: true,
            estado: true,
            createdAt: true,
          },
        },
        _count: {
          select: { unidades: true, rutas: true },
        },
      },
    });
    return { success: true, data: solicitudes };
  } catch (error) {
    console.error('Error al obtener solicitudes de cooperativas:', error);
    return { success: false, error: 'Error al consultar solicitudes pendientes.' };
  }
}

// 4. Aprobar cooperativa y activar a su administrador
export async function aprobarCooperativaAction(idCooperativa: number): Promise<ActionResponse<{ idCooperativa: number }>> {
  try {
    const cooperativa = await prisma.cooperativa.findUnique({
      where: { idCooperativa },
      include: {
        usuarios: {
          where: { rol: { nombre: 'ADMIN_COOP' } },
        },
      },
    });

    if (!cooperativa) {
      return { success: false, error: 'La cooperativa especificada no existe.' };
    }

    // Actualizar cooperativa y administradores en transacción atómica
    await prisma.$transaction([
      prisma.cooperativa.update({
        where: { idCooperativa },
        data: { estado: 'ACTIVO' },
      }),
      prisma.usuario.updateMany({
        where: {
          idCooperativa,
          rol: { nombre: 'ADMIN_COOP' },
        },
        data: { estado: 'ACTIVO' },
      }),
    ]);

    // Enviar correo de notificación a los administradores
    for (const admin of cooperativa.usuarios) {
      sendCooperativaAprobadaEmail({
        to: admin.correo,
        adminName: `${admin.nombre} ${admin.apellido}`,
        cooperativaName: cooperativa.nombre,
      }).catch((mailErr) => {
        console.warn('[Cooperativa] No se pudo enviar correo de aprobación:', mailErr);
      });
    }

    revalidatePath('/dashboard/cooperativas');
    revalidatePath('/dashboard');
    return { success: true, data: { idCooperativa } };
  } catch (error) {
    console.error('Error al aprobar cooperativa:', error);
    return { success: false, error: 'Ocurrió un error al aprobar la cooperativa.' };
  }
}

// 5. Rechazar o dar de baja cooperativa
export async function rechazarCooperativaAction(idCooperativa: number, motivo?: string): Promise<ActionResponse<boolean>> {
  try {
    await prisma.$transaction([
      prisma.cooperativa.update({
        where: { idCooperativa },
        data: { estado: 'INACTIVO' },
      }),
      prisma.usuario.updateMany({
        where: { idCooperativa },
        data: { estado: 'INACTIVO' },
      }),
    ]);

    revalidatePath('/dashboard/cooperativas');
    return { success: true, data: true };
  } catch (error) {
    console.error('Error al rechazar cooperativa:', error);
    return { success: false, error: 'No se pudo rechazar la solicitud.' };
  }
}

// 6. Crear cooperativa directamente (para uso administrativo)
export async function createCooperativa(data: CooperativaInput) {
  try {
    if (!data.nombre || data.nombre.trim() === '') {
      return { success: false, error: 'El nombre de la cooperativa es obligatorio.' };
    }

    const nuevaCooperativa = await prisma.cooperativa.create({
      data: {
        nombre: data.nombre.trim(),
        telefono: data.telefono?.trim() || null,
        direccion: data.direccion?.trim() || null,
        estado: 'ACTIVO',
      },
    });

    revalidatePath('/dashboard/cooperativas');
    return { success: true, data: nuevaCooperativa };
  } catch (error) {
    console.error('Error al crear cooperativa:', error);
    return { success: false, error: 'Error al registrar la cooperativa.' };
  }
}

// 7. Actualizar cooperativa
export async function updateCooperativa(
  idCooperativa: number,
  data: Partial<CooperativaInput> & { estado?: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE_APROBACION' }
) {
  try {
    const actualizada = await prisma.cooperativa.update({
      where: { idCooperativa },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.telefono !== undefined && { telefono: data.telefono?.trim() || null }),
        ...(data.direccion !== undefined && { direccion: data.direccion?.trim() || null }),
        ...(data.estado && { estado: data.estado }),
      },
    });

    revalidatePath('/dashboard/cooperativas');
    return { success: true, data: actualizada };
  } catch (error) {
    console.error('Error al actualizar cooperativa:', error);
    return { success: false, error: 'Error al actualizar la cooperativa.' };
  }
}

