'use server';

import { prisma } from '../db';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { revalidatePath } from 'next/cache';
import { getSession } from '../lib/session';

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

    const hashedPassword = await hashPassword(data.passwd || 'PasswordTemp123!');

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        idCooperativa: data.idCooperativa || null,
        idRol: data.idRol,
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        usuario: data.usuario.trim(),
        passwd: hashedPassword,
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

// -------------------------------------------------------------
// 3. GESTIÓN DEL PERFIL DE USUARIO EN SESIÓN ACTIVA
// -------------------------------------------------------------

export async function getUserProfileAction() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'No has iniciado sesión.' };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: session.idUsuario },
      select: {
        idUsuario: true,
        idCooperativa: true,
        nombre: true,
        apellido: true,
        usuario: true,
        correo: true,
        telefono: true,
        direccion: true,
        foto: true,
        estado: true,
        cooperativa: {
          select: {
            nombre: true,
          },
        },
        rol: {
          select: {
            nombre: true,
            descripcion: true,
          },
        },
      },
    });

    if (!usuario) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    return {
      success: true,
      data: {
        idUsuario: usuario.idUsuario,
        idCooperativa: usuario.idCooperativa || null,
        cooperativaNombre: usuario.cooperativa?.nombre || null,
        nombre: usuario.nombre || '',
        apellido: usuario.apellido || '',
        nombreCompleto: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim(),
        usuario: usuario.usuario || '',
        correo: usuario.correo || '',
        telefono: usuario.telefono || '',
        direccion: usuario.direccion || '',
        foto: usuario.foto || null,
        rolNombre: usuario.rol?.nombre || 'PASAJERO',
      },
    };
  } catch (error) {
    console.error('Error al consultar perfil de usuario:', error);
    return { success: false, error: 'Error al consultar datos del perfil.' };
  }
}

export async function updateUserProfileAction(data: {
  nombre: string;
  apellido?: string;
  telefono?: string;
  direccion?: string;
  foto?: string | null;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'No has iniciado sesión.' };
    }

    if (!data.nombre || data.nombre.trim().length === 0) {
      return { success: false, error: 'El nombre es obligatorio.' };
    }

    const updated = await prisma.usuario.update({
      where: { idUsuario: session.idUsuario },
      data: {
        nombre: data.nombre.trim(),
        apellido: data.apellido?.trim() || '',
        telefono: data.telefono?.trim() || null,
        direccion: data.direccion?.trim() || null,
        ...(data.foto !== undefined ? { foto: data.foto?.trim() || null } : {}),
      },
    });

    revalidatePath('/profile');
    revalidatePath('/home');
    revalidatePath('/', 'layout');

    return {
      success: true,
      data: {
        nombre: updated.nombre,
        apellido: updated.apellido,
        telefono: updated.telefono || '',
        foto: updated.foto || null,
      },
    };
  } catch (error) {
    console.error('Error al actualizar datos del perfil:', error);
    return { success: false, error: 'No se pudieron guardar los cambios del perfil.' };
  }
}

export async function changePasswordAction(data: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'No has iniciado sesión.' };
    }

    if (!data.currentPassword || !data.newPassword) {
      return { success: false, error: 'Todos los campos de contraseña son requeridos.' };
    }

    if (data.newPassword.length < 8) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: session.idUsuario },
      select: { passwd: true },
    });

    if (!usuario) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    const isMatch = await verifyPassword(data.currentPassword, usuario.passwd);
    if (!isMatch) {
      return { success: false, error: 'La contraseña actual ingresada es incorrecta.' };
    }

    const newHashedPassword = await hashPassword(data.newPassword);

    await prisma.usuario.update({
      where: { idUsuario: session.idUsuario },
      data: { passwd: newHashedPassword },
    });

    return { success: true, message: 'Contraseña actualizada con éxito.' };
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return { success: false, error: 'Error al actualizar la contraseña.' };
  }
}

// -------------------------------------------------------------
// 4. DIRECTORIO DE PERSONAL OPERATIVO (CHOFERES Y AYUDANTES)
// -------------------------------------------------------------

export async function getPersonalOperativoAction() {
  try {
    const personal = await prisma.usuario.findMany({
      where: {
        rol: {
          nombre: { in: ['CHOFER', 'AYUDANTE', 'ADMIN_COOP', 'TAQUILLERO'] },
        },
      },
      include: {
        rol: true,
        cooperativa: true,
        asignacionesAsignadas: {
          where: {
            estado: 'INICIADA',
            fechaHFin: null,
          },
          include: {
            unidad: true,
          },
          orderBy: { fechaHInicio: 'desc' },
          take: 1,
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return { success: true, data: personal };
  } catch (error) {
    console.error('Error al consultar personal operativo:', error);
    return { success: false, error: 'No se pudo consultar el directorio de personal.', data: [] };
  }
}

export async function getRolesOperativosAction() {
  try {
    const roles = await prisma.rol.findMany({
      where: {
        nombre: { in: ['CHOFER', 'AYUDANTE', 'TAQUILLERO', 'ADMIN_COOP'] },
        estado: 'ACTIVO',
      },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: roles };
  } catch (error) {
    console.error('Error al consultar roles operativos:', error);
    return { success: false, error: 'No se pudieron consultar los roles.', data: [] };
  }
}

export async function createOperarioAction(data: UsuarioInput) {
  try {
    if (!data.nombre || !data.apellido || !data.usuario || !data.correo || !data.idRol) {
      return {
        success: false,
        error: 'Nombre, apellido, usuario, correo y rol son campos obligatorios.',
      };
    }

    // Default password if not provided
    const rawPass = data.passwd || 'Chofer2026!';
    const hashedPassword = await hashPassword(rawPass);

    const nuevoOperario = await prisma.usuario.create({
      data: {
        idCooperativa: data.idCooperativa || null,
        idRol: data.idRol,
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        usuario: data.usuario.trim().toLowerCase(),
        passwd: hashedPassword,
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

    revalidatePath('/dashboard/choferes');
    return { success: true, data: nuevoOperario };
  } catch (error: any) {
    console.error('Error al registrar operario:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: 'El nombre de usuario o correo electrónico ya se encuentra en uso.',
      };
    }
    return { success: false, error: 'No se pudo registrar el personal operativo.' };
  }
}

export async function updateEstadoOperarioAction(
  idUsuario: number,
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO'
) {
  try {
    const usuario = await prisma.usuario.update({
      where: { idUsuario },
      data: { estado },
    });

    revalidatePath('/dashboard/choferes');
    return { success: true, data: usuario };
  } catch (error) {
    console.error('Error al actualizar estado de operario:', error);
    return { success: false, error: 'No se pudo actualizar el estado del personal.' };
  }
}

export async function deleteOperarioAction(idUsuario: number) {
  try {
    await prisma.usuario.delete({
      where: { idUsuario },
    });

    revalidatePath('/dashboard/choferes');
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar operario:', error);
    return {
      success: false,
      error: 'No se pudo eliminar el usuario. Si tiene viajes o asignaciones históricas, cámbielo a INACTIVO.',
    };
  }
}

