'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface UsuarioInput {
  idCooperativa?: number;
  idRol: number;
  nombre: string;
  apellido: string;
  usuario: string;
  passwd?: string;
  telefono?: string;
  correo: string;
  direccion?: string;
}

// -------------------------------------------------------------
// 1. GESTIÓN DE ROLES (CHOFER, ADMIN, TAQUILLERO, ETC.)
// -------------------------------------------------------------

export async function createRol(nombre: string, descripcion?: string) {
  try {
    const rol = await prisma.rol.upsert({
      where: { nombre: nombre.trim().toUpperCase() },
      update: {},
      create: {
        nombre: nombre.trim().toUpperCase(),
        descripcion: descripcion?.trim() || null,
        estado: 'ACTIVO',
      },
    });
    return { success: true, data: rol };
  } catch (error) {
    console.error('Error al crear rol:', error);
    return { success: false, error: 'No se pudo crear el rol.' };
  }
}

export async function getRoles() {
  try {
    const roles = await prisma.rol.findMany({
      where: { estado: 'ACTIVO' },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: roles };
  } catch (error) {
    console.error('Error al obtener roles:', error);
    return { success: false, error: 'No se pudieron consultar los roles.' };
  }
}

// -------------------------------------------------------------
// 2. REGISTRO Y CONSULTA DE USUARIOS Y CHOFERES
// -------------------------------------------------------------

export async function createUsuario(data: UsuarioInput) {
  try {
    if (!data.nombre || !data.apellido || !data.usuario || !data.correo || !data.idRol) {
      return {
        success: false,
        error: 'Nombre, apellido, usuario, correo y rol son campos obligatorios.',
      };
    }

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        idCooperativa: data.idCooperativa || null,
        idRol: data.idRol,
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        usuario: data.usuario.trim(),
        passwd: data.passwd || 'PasswordTemp123!', // En la fase de auth usaremos bcrypt
        telefono: data.telefono?.trim() || null,
        correo: data.correo.trim().toLowerCase(),
        direccion: data.direccion?.trim() || null,
        estado: 'ACTIVO',
      },
      include: {
        rol: true,
        cooperativa: true,
      },
    });

    revalidatePath('/admin/usuarios');
    return { success: true, data: nuevoUsuario };
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: 'El nombre de usuario o el correo electrónico ya se encuentran registrados.',
      };
    }
    return { success: false, error: 'No se pudo registrar el usuario.' };
  }
}

export async function getUsuariosByCooperativa(idCooperativa: number) {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { idCooperativa },
      include: {
        rol: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: usuarios };
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return { success: false, error: 'No se pudieron cargar los usuarios.' };
  }
}