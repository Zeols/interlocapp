'use server';

import { prisma } from '../db';
import { hashPassword, verifyPassword } from '../lib/crypto';
import {
  createSessionToken,
  setSessionCookie,
  destroySession,
  getSession,
  SessionPayload,
} from '../lib/session';
import {
  loginSchema,
  signupSchema,
  LoginInput,
  SignupInput,
  ActionResponse,
} from '../lib/validations/auth';

// ==========================================
// ACCIONES DE AUTENTICACIÓN
// ==========================================

/**
 * Inicia sesión verificando credenciales, estado de la cuenta y emitiendo cookie segura HttpOnly.
 */
export async function loginAction(input: LoginInput): Promise<ActionResponse<{ redirectUrl: string; user: SessionPayload }>> {
  try {
    const validated = loginSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: 'Datos de inicio de sesión inválidos.',
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const { identificador, password } = validated.data;
    const cleanId = identificador.toLowerCase();

    // Buscar por correo o nombre de usuario
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [{ correo: cleanId }, { usuario: cleanId }],
      },
      include: {
        rol: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'Las credenciales ingresadas son incorrectas. Verifica tu correo y contraseña.',
      };
    }

    // Comprobar estado de la cuenta
    if (user.estado === 'INACTIVO') {
      return {
        success: false,
        error: 'Esta cuenta se encuentra inactiva. Comunícate con la administración de la cooperativa.',
      };
    }

    if (user.estado === 'BLOQUEADO') {
      return {
        success: false,
        error: 'Tu cuenta ha sido bloqueada temporalmente por motivos de seguridad.',
      };
    }

    // Verificar contraseña con hash bcrypt
    const passwordMatch = await verifyPassword(password, user.passwd);
    if (!passwordMatch) {
      return {
        success: false,
        error: 'Las credenciales ingresadas son incorrectas. Verifica tu correo y contraseña.',
      };
    }

    // Construir sesión
    const sessionPayload: SessionPayload = {
      idUsuario: user.idUsuario,
      idCooperativa: user.idCooperativa,
      idRol: user.idRol,
      rolNombre: user.rol.nombre,
      correo: user.correo,
      nombre: `${user.nombre} ${user.apellido}`.trim(),
      usuario: user.usuario,
    };

    // Generar token JWT y emitir cookie segura HttpOnly
    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    // Determinar URL de redirección según el rol
    let redirectUrl = '/home';
    if (['SUPER_ADMIN', 'ADMIN_COOP', 'TAQUILLERO'].includes(user.rol.nombre)) {
      redirectUrl = '/dashboard';
    } else if (['CHOFER', 'AYUDANTE'].includes(user.rol.nombre)) {
      redirectUrl = '/validar-boleto';
    }

    return {
      success: true,
      data: {
        redirectUrl,
        user: sessionPayload,
      },
    };
  } catch (error) {
    console.error('Error en loginAction:', error);
    return {
      success: false,
      error: 'Ocurrió un error al procesar el inicio de sesión. Por favor intenta de nuevo.',
    };
  }
}

/**
 * Registra un nuevo pasajero con contraseña hasheada y sesión automática iniciada.
 */
export async function registerAction(input: SignupInput): Promise<ActionResponse<{ redirectUrl: string }>> {
  try {
    const validated = signupSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: 'Por favor completa correctamente todos los campos.',
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const { nombre, apellido, correo, telefono, password } = validated.data;

    // Verificar que el correo no esté registrado
    const existingEmail = await prisma.usuario.findUnique({
      where: { correo },
    });

    if (existingEmail) {
      return {
        success: false,
        error: 'Ya existe una cuenta registrada con este correo electrónico.',
      };
    }

    // Generar nombre de usuario único basado en el correo
    const baseUsername = correo.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    let finalUsername = baseUsername;
    let counter = 1;

    while (await prisma.usuario.findUnique({ where: { usuario: finalUsername } })) {
      finalUsername = `${baseUsername}_${counter}`;
      counter++;
    }

    // Obtener rol PASAJERO (o crearlo si no existe)
    let rolPasajero = await prisma.rol.findFirst({
      where: { nombre: 'PASAJERO' },
    });

    if (!rolPasajero) {
      rolPasajero = await prisma.rol.create({
        data: {
          nombre: 'PASAJERO',
          descripcion: 'Pasajero usuario del servicio',
          estado: 'ACTIVO',
        },
      });
    }

    // Hashear contraseña con bcrypt
    const hashedPassword = await hashPassword(password);

    // Crear usuario en base de datos
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        idRol: rolPasajero.idRol,
        idCooperativa: null,
        nombre,
        apellido,
        usuario: finalUsername,
        correo,
        telefono: telefono?.trim() || null,
        passwd: hashedPassword,
        estado: 'ACTIVO',
      },
    });

    // Iniciar sesión automáticamente
    const sessionPayload: SessionPayload = {
      idUsuario: nuevoUsuario.idUsuario,
      idCooperativa: null,
      idRol: rolPasajero.idRol,
      rolNombre: 'PASAJERO',
      correo: nuevoUsuario.correo,
      nombre: `${nuevoUsuario.nombre} ${nuevoUsuario.apellido}`.trim(),
      usuario: nuevoUsuario.usuario,
    };

    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    return {
      success: true,
      data: {
        redirectUrl: '/home',
      },
    };
  } catch (error) {
    console.error('Error en registerAction:', error);
    return {
      success: false,
      error: 'No se pudo completar el registro. Por favor intenta más tarde.',
    };
  }
}

/**
 * Cierra la sesión activa eliminando la cookie HttpOnly.
 */
export async function logoutAction(): Promise<ActionResponse<{ redirectUrl: string }>> {
  try {
    await destroySession();
    return {
      success: true,
      data: {
        redirectUrl: '/login',
      },
    };
  } catch (error) {
    console.error('Error en logoutAction:', error);
    return {
      success: false,
      error: 'No se pudo cerrar la sesión.',
    };
  }
}

/**
 * Consulta la sesión del usuario actual desde un Server Action.
 */
export async function getCurrentUserAction(): Promise<SessionPayload | null> {
  try {
    return await getSession();
  } catch {
    return null;
  }
}
