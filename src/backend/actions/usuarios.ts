'use server';

import { prisma } from '../db';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { revalidatePath } from 'next/cache';
import { getSession } from '../lib/session';
import { ActionResponse } from '../lib/validations/auth';

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
    if (!data.nombre || !data.usuario || !data.correo || !data.idRol) {
      return {
        success: false,
        error: 'Nombre, usuario, correo y rol son campos obligatorios.',
      };
    }

    const hashedPassword = await hashPassword(data.passwd || 'PasswordTemp123!');

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        idCooperativa: data.idCooperativa || null,
        idRol: data.idRol,
        nombre: data.nombre.trim(),
        apellido: (data.apellido || '').trim(),
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

export async function getUsuariosAdminAction(params?: {
  idCooperativa?: number;
  idRol?: number;
  busqueda?: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'No autorizado.', data: [] };
    }

    const isSuperAdmin = session.rolNombre === 'SUPER_ADMIN';
    const isAdminCoop = session.rolNombre === 'ADMIN_COOP';

    if (!isSuperAdmin && !isAdminCoop) {
      return { success: false, error: 'No tienes permisos para ver usuarios.', data: [] };
    }

    // Aislamiento Multi-Tenant:
    // Si no es Super Admin, se fuerza estrictamente a su propia cooperativa
    const coopFilter = isSuperAdmin
      ? params?.idCooperativa
        ? { idCooperativa: params.idCooperativa }
        : {}
      : { idCooperativa: session.idCooperativa ?? -1 };

    const rolFilter = params?.idRol ? { idRol: params.idRol } : {};

    const searchFilter = params?.busqueda?.trim()
      ? {
          OR: [
            { nombre: { contains: params.busqueda.trim(), mode: 'insensitive' as const } },
            { apellido: { contains: params.busqueda.trim(), mode: 'insensitive' as const } },
            { correo: { contains: params.busqueda.trim(), mode: 'insensitive' as const } },
            { usuario: { contains: params.busqueda.trim(), mode: 'insensitive' as const } },
          ],
        }
      : {};

    const usuarios = await prisma.usuario.findMany({
      where: {
        ...coopFilter,
        ...rolFilter,
        ...searchFilter,
      },
      include: {
        rol: true,
        cooperativa: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: usuarios.map((u) => ({
        idUsuario: u.idUsuario,
        idCooperativa: u.idCooperativa,
        cooperativaNombre: u.cooperativa?.nombre || 'Global / Sin Cooperativa',
        idRol: u.idRol,
        rolNombre: u.rol.nombre,
        nombre: u.nombre,
        apellido: u.apellido,
        nombreCompleto: [u.nombre, u.apellido].filter(Boolean).join(' '),
        usuario: u.usuario,
        correo: u.correo,
        telefono: u.telefono,
        direccion: u.direccion,
        estado: u.estado,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error('Error en getUsuariosAdminAction:', error);
    return { success: false, error: 'Error al consultar usuarios.', data: [] };
  }
}

export async function createUsuarioByAdminAction(input: {
  nombre: string;
  apellido?: string;
  correo: string;
  telefono?: string;
  usuario?: string;
  password?: string;
  idRol: number;
  idCooperativa?: number | null;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'No autorizado.' };
    }

    const isSuperAdmin = session.rolNombre === 'SUPER_ADMIN';
    const isAdminCoop = session.rolNombre === 'ADMIN_COOP';

    if (!isSuperAdmin && !isAdminCoop) {
      return { success: false, error: 'Permisos insuficientes para registrar usuarios.' };
    }

    // Verificar rol a asignar
    const rol = await prisma.rol.findUnique({
      where: { idRol: input.idRol },
    });

    if (!rol) {
      return { success: false, error: 'El rol especificado no existe.' };
    }

    // Si es ADMIN_COOP:
    // 1. No puede crear SUPER_ADMIN
    // 2. Por defecto se asigna obligatoriamente a SU propia cooperativa
    let finalCoopId: number | null = null;
    if (isAdminCoop) {
      if (rol.nombre === 'SUPER_ADMIN') {
        return { success: false, error: 'Un administrador de cooperativa no puede crear cuentas de Super Administrador.' };
      }
      if (!session.idCooperativa) {
        return { success: false, error: 'Tu usuario no tiene una cooperativa asignada.' };
      }
      finalCoopId = session.idCooperativa;
    } else if (isSuperAdmin) {
      finalCoopId = input.idCooperativa || null;
    }

    const cleanEmail = input.correo.trim().toLowerCase();
    const existing = await prisma.usuario.findFirst({
      where: { correo: cleanEmail },
    });

    if (existing) {
      return { success: false, error: 'Ya existe una cuenta con este correo electrónico.' };
    }

    // Generar username único si no fue suministrado
    let finalUsername = input.usuario?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
    let counter = 1;
    const baseUsername = finalUsername;
    while (await prisma.usuario.findUnique({ where: { usuario: finalUsername } })) {
      finalUsername = `${baseUsername}_${counter}`;
      counter++;
    }

    const defaultPass = input.password?.trim() || 'RutaCorp2026!';
    const hashedPassword = await hashPassword(defaultPass);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        idCooperativa: finalCoopId,
        idRol: input.idRol,
        nombre: input.nombre.trim(),
        apellido: (input.apellido || '').trim(),
        usuario: finalUsername,
        correo: cleanEmail,
        telefono: input.telefono?.trim() || null,
        passwd: hashedPassword,
        estado: 'ACTIVO',
      },
      include: {
        rol: true,
        cooperativa: true,
      },
    });

    revalidatePath('/dashboard/usuarios');
    revalidatePath('/dashboard/choferes');

    return {
      success: true,
      data: {
        idUsuario: nuevoUsuario.idUsuario,
        nombre: nuevoUsuario.nombre,
        usuario: nuevoUsuario.usuario,
        correo: nuevoUsuario.correo,
        rolNombre: nuevoUsuario.rol.nombre,
      },
    };
  } catch (error: any) {
    console.error('Error en createUsuarioByAdminAction:', error);
    if (error?.code === 'P2002') {
      return { success: false, error: 'El nombre de usuario o correo ya se encuentra registrado.' };
    }
    return { success: false, error: 'No se pudo crear el usuario.' };
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

// Eliminar usuario general con validaciones de tenant y roles
export async function deleteUsuarioAction(idUsuario: number): Promise<ActionResponse<boolean>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'No autorizado.' };
    }

    if (session.idUsuario === idUsuario) {
      return { success: false, error: 'No puedes eliminar tu propia cuenta en sesión activa.' };
    }

    const isSuperAdmin = session.rolNombre === 'SUPER_ADMIN';
    const isAdminCoop = session.rolNombre === 'ADMIN_COOP';

    if (!isSuperAdmin && !isAdminCoop) {
      return { success: false, error: 'No tienes permisos para eliminar usuarios.' };
    }

    const targetUser = await prisma.usuario.findUnique({
      where: { idUsuario },
      include: { rol: true },
    });

    if (!targetUser) {
      return { success: false, error: 'El usuario no existe o ya fue eliminado.' };
    }

    if (isAdminCoop) {
      if (targetUser.rol.nombre === 'SUPER_ADMIN') {
        return { success: false, error: 'No tienes permisos para eliminar a un Super Administrador.' };
      }
      if (targetUser.idCooperativa !== session.idCooperativa) {
        return { success: false, error: 'Solo puedes eliminar usuarios asignados a tu propia cooperativa.' };
      }
    }

    // Comprobar si el usuario tiene asignaciones de buses o cierres de caja registrados
    const [asignacionesCount, cierresCount] = await Promise.all([
      prisma.asignacionUnidad.count({ where: { idUsuario } }),
      prisma.cierreJornada.count({ where: { idUsuario } }),
    ]);

    if (asignacionesCount > 0 || cierresCount > 0) {
      await prisma.usuario.update({
        where: { idUsuario },
        data: { estado: 'INACTIVO' },
      });
      revalidatePath('/dashboard/usuarios');
      revalidatePath('/dashboard/choferes');
      return {
        success: true,
        data: true,
        error: 'El usuario cuenta con historial operativo o cierres de caja. Para proteger la integridad de los datos, su estado ha sido cambiado a INACTIVO.',
      };
    }

    await prisma.$transaction([
      prisma.codigoVerificacion.deleteMany({
        where: { correo: targetUser.correo },
      }),
      prisma.metodoPagoUsuario.deleteMany({
        where: { idUsuario },
      }),
      prisma.usuario.delete({
        where: { idUsuario },
      }),
    ]);

    revalidatePath('/dashboard/usuarios');
    revalidatePath('/dashboard/choferes');
    return { success: true, data: true };
  } catch (error) {
    console.error('Error en deleteUsuarioAction:', error);
    return { success: false, error: 'No se pudo eliminar el usuario. Intenta nuevamente.' };
  }
}


