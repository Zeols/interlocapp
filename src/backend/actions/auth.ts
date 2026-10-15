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
  verifyCodeSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  LoginInput,
  SignupInput,
  VerifyCodeInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  ActionResponse,
} from '../lib/validations/auth';
import {
  sendWelcomeEmail,
  sendVerificationCodeEmail,
  sendPasswordResetCodeEmail,
} from '../lib/mail';


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
      const firstError = Object.values(validated.error.flatten().fieldErrors)[0]?.[0];
      return {
        success: false,
        error: firstError || 'Datos de inicio de sesión inválidos.',
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const { identificador, password } = validated.data;
    const cleanId = identificador.trim().toLowerCase();
    const rawId = identificador.trim();

    // Buscar por correo o nombre de usuario de forma insensible a mayúsculas/minúsculas
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { correo: { equals: cleanId, mode: 'insensitive' } },
          { usuario: { equals: rawId, mode: 'insensitive' } },
        ],
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

    // Enviar correo de bienvenida asíncrono
    sendWelcomeEmail({
      to: nuevoUsuario.correo,
      name: nuevoUsuario.nombre,
    }).catch((mailErr) => {
      console.warn('[Register] No se pudo enviar el correo de bienvenida:', mailErr);
    });

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

// ==========================================
// FLUJO CON CÓDIGO DE VERIFICACIÓN (SIGNUP)
// ==========================================

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Solicita el código de verificación para registrar un nuevo usuario pasajero.
 * Valida los datos, hashea la contraseña y envía el código por correo.
 */
export async function requestSignupCodeAction(input: SignupInput): Promise<ActionResponse<{ email: string }>> {
  try {
    const validated = signupSchema.safeParse(input);
    if (!validated.success) {
      const firstError = Object.values(validated.error.flatten().fieldErrors)[0]?.[0];
      return {
        success: false,
        error: firstError || 'Por favor completa correctamente todos los campos.',
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const { nombre, apellido, correo, telefono, password } = validated.data;
    const cleanEmail = correo.trim().toLowerCase();

    // Validar que el correo no esté previamente registrado
    const existingUser = await prisma.usuario.findUnique({
      where: { correo: cleanEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Ya existe una cuenta registrada con este correo electrónico.',
      };
    }

    // Hashear contraseña con bcrypt
    const hashedPassword = await hashPassword(password);
    const code = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Invalidar solicitudes anteriores pendientes para el mismo correo
    await prisma.codigoVerificacion.updateMany({
      where: {
        correo: cleanEmail,
        tipo: 'REGISTRO',
        usado: false,
      },
      data: {
        usado: true,
      },
    });

    // Guardar código con los datos en espera
    await prisma.codigoVerificacion.create({
      data: {
        correo: cleanEmail,
        codigo: code,
        tipo: 'REGISTRO',
        expiraEn: expiresAt,
        datosTemp: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono?.trim() || null,
          hashedPassword,
        }),
      },
    });

    // Enviar código por correo
    const emailResult = await sendVerificationCodeEmail({
      to: cleanEmail,
      name: nombre.trim(),
      code,
      expiresMinutes: 15,
    });

    if (!emailResult.success) {
      console.warn('[Signup] Advertencia al enviar correo:', emailResult.error);
    }

    return {
      success: true,
      data: {
        email: cleanEmail,
      },
    };
  } catch (error) {
    console.error('Error en requestSignupCodeAction:', error);
    return {
      success: false,
      error: 'Ocurrió un error al preparar el registro. Intenta nuevamente.',
    };
  }
}

/**
 * Valida el código de 6 dígitos ingresado por el usuario y crea la cuenta definitivamente.
 */
export async function verifySignupCodeAction(input: VerifyCodeInput): Promise<ActionResponse<{ redirectUrl: string }>> {
  try {
    const validated = verifyCodeSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: 'El código debe contener exactamente 6 dígitos.',
      };
    }

    const { correo, codigo } = validated.data;
    const cleanEmail = correo.trim().toLowerCase();

    // Buscar código no usado y vigente
    const record = await prisma.codigoVerificacion.findFirst({
      where: {
        correo: cleanEmail,
        codigo: codigo.trim(),
        tipo: 'REGISTRO',
        usado: false,
        expiraEn: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || !record.datosTemp) {
      return {
        success: false,
        error: 'El código ingresado es incorrecto o ya ha expirado. Solicita un nuevo código.',
      };
    }

    // Verificar si el correo ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { correo: cleanEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Ya existe una cuenta con este correo.',
      };
    }

    const userData = JSON.parse(record.datosTemp) as {
      nombre: string;
      apellido: string;
      telefono: string | null;
      hashedPassword: string;
    };

    // Generar username único
    const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    let finalUsername = baseUsername;
    let counter = 1;

    while (await prisma.usuario.findUnique({ where: { usuario: finalUsername } })) {
      finalUsername = `${baseUsername}_${counter}`;
      counter++;
    }

    // Obtener rol PASAJERO
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

    // Crear usuario y marcar código como usado de forma atómica
    const nuevoUsuario = await prisma.$transaction(async (tx) => {
      await tx.codigoVerificacion.update({
        where: { id: record.id },
        data: { usado: true },
      });

      return tx.usuario.create({
        data: {
          idRol: rolPasajero.idRol,
          idCooperativa: null,
          nombre: userData.nombre,
          apellido: userData.apellido,
          usuario: finalUsername,
          correo: cleanEmail,
          telefono: userData.telefono,
          passwd: userData.hashedPassword,
          estado: 'ACTIVO',
        },
      });
    });

    // Iniciar sesión emitiendo token JWT y cookie segura HttpOnly
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

    // Enviar correo de bienvenida
    sendWelcomeEmail({
      to: nuevoUsuario.correo,
      name: nuevoUsuario.nombre,
    }).catch((mailErr) => {
      console.warn('[Register] No se pudo enviar el correo de bienvenida:', mailErr);
    });

    return {
      success: true,
      data: {
        redirectUrl: '/home',
      },
    };
  } catch (error) {
    console.error('Error en verifySignupCodeAction:', error);
    return {
      success: false,
      error: 'No se pudo completar la verificación del registro.',
    };
  }
}

/**
 * Reenvía un nuevo código de verificación de registro al correo indicado.
 */
export async function resendSignupCodeAction(correo: string): Promise<ActionResponse<void>> {
  try {
    const cleanEmail = correo.trim().toLowerCase();

    const lastRecord = await prisma.codigoVerificacion.findFirst({
      where: {
        correo: cleanEmail,
        tipo: 'REGISTRO',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastRecord || !lastRecord.datosTemp) {
      return {
        success: false,
        error: 'No se encontró un registro pendiente. Por favor completa el formulario.',
      };
    }

    const userData = JSON.parse(lastRecord.datosTemp);
    const newCode = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Invalidar anteriores
    await prisma.codigoVerificacion.updateMany({
      where: {
        correo: cleanEmail,
        tipo: 'REGISTRO',
        usado: false,
      },
      data: { usado: true },
    });

    // Guardar nuevo código
    await prisma.codigoVerificacion.create({
      data: {
        correo: cleanEmail,
        codigo: newCode,
        tipo: 'REGISTRO',
        expiraEn: expiresAt,
        datosTemp: lastRecord.datosTemp,
      },
    });

    await sendVerificationCodeEmail({
      to: cleanEmail,
      name: userData.nombre,
      code: newCode,
      expiresMinutes: 15,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error en resendSignupCodeAction:', error);
    return {
      success: false,
      error: 'No se pudo reenviar el código de verificación.',
    };
  }
}

// ==========================================
// FLUJO CON CÓDIGO DE RECUPERACIÓN DE CONTRASEÑA
// ==========================================

/**
 * Solicita el código de recuperación de contraseña para un usuario existente.
 */
export async function requestPasswordResetCodeAction(input: RequestPasswordResetInput): Promise<ActionResponse<{ email: string }>> {
  try {
    const validated = requestPasswordResetSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: 'Por favor ingresa un correo electrónico válido.',
      };
    }

    const cleanEmail = validated.data.email.trim().toLowerCase();

    const user = await prisma.usuario.findFirst({
      where: {
        correo: { equals: cleanEmail, mode: 'insensitive' },
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'No existe ninguna cuenta registrada con este correo electrónico.',
      };
    }

    if (user.estado === 'INACTIVO') {
      return {
        success: false,
        error: 'Esta cuenta se encuentra inactiva. Comunícate con el soporte o administración.',
      };
    }

    if (user.estado === 'BLOQUEADO') {
      return {
        success: false,
        error: 'Esta cuenta está bloqueada temporalmente por motivos de seguridad.',
      };
    }

    const code = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Invalidar códigos anteriores no utilizados
    await prisma.codigoVerificacion.updateMany({
      where: {
        correo: user.correo,
        tipo: 'RECUPERACION_PASSWORD',
        usado: false,
      },
      data: { usado: true },
    });

    // Crear registro de código
    await prisma.codigoVerificacion.create({
      data: {
        correo: user.correo,
        codigo: code,
        tipo: 'RECUPERACION_PASSWORD',
        expiraEn: expiresAt,
        datosTemp: JSON.stringify({ idUsuario: user.idUsuario }),
      },
    });

    await sendPasswordResetCodeEmail({
      to: user.correo,
      name: user.nombre,
      code,
      expiresMinutes: 15,
    });

    return {
      success: true,
      data: {
        email: user.correo,
      },
    };
  } catch (error) {
    console.error('Error en requestPasswordResetCodeAction:', error);
    return {
      success: false,
      error: 'Ocurrió un error al procesar la solicitud de recuperación.',
    };
  }
}

/**
 * Valida si el código de recuperación ingresado es correcto y no ha expirado.
 */
export async function verifyPasswordResetCodeAction(input: { email: string; codigo: string }): Promise<ActionResponse<void>> {
  try {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanCode = input.codigo.trim();

    const record = await prisma.codigoVerificacion.findFirst({
      where: {
        correo: cleanEmail,
        codigo: cleanCode,
        tipo: 'RECUPERACION_PASSWORD',
        usado: false,
        expiraEn: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return {
        success: false,
        error: 'El código de recuperación es incorrecto o ha expirado. Solicita uno nuevo.',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error en verifyPasswordResetCodeAction:', error);
    return {
      success: false,
      error: 'No se pudo verificar el código.',
    };
  }
}

/**
 * Restablece la contraseña del usuario tras validar el código de 6 dígitos.
 */
export async function resetPasswordWithCodeAction(input: ResetPasswordInput): Promise<ActionResponse<void>> {
  try {
    const validated = resetPasswordSchema.safeParse(input);
    if (!validated.success) {
      const firstError = Object.values(validated.error.flatten().fieldErrors)[0]?.[0];
      return {
        success: false,
        error: firstError || 'Datos de recuperación inválidos.',
      };
    }

    const { email, codigo, password } = validated.data;
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = codigo.trim();

    // Validar código
    const record = await prisma.codigoVerificacion.findFirst({
      where: {
        correo: cleanEmail,
        codigo: cleanCode,
        tipo: 'RECUPERACION_PASSWORD',
        usado: false,
        expiraEn: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return {
        success: false,
        error: 'El código es inválido o ha expirado. Solicita uno nuevo.',
      };
    }

    const user = await prisma.usuario.findFirst({
      where: {
        correo: { equals: cleanEmail, mode: 'insensitive' },
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'No se encontró la cuenta de usuario.',
      };
    }

    // Hashear nueva contraseña
    const hashedPassword = await hashPassword(password);

    // Actualizar contraseña y quemar el código en transacción
    await prisma.$transaction([
      prisma.usuario.update({
        where: { idUsuario: user.idUsuario },
        data: { passwd: hashedPassword },
      }),
      prisma.codigoVerificacion.update({
        where: { id: record.id },
        data: { usado: true },
      }),
    ]);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error en resetPasswordWithCodeAction:', error);
    return {
      success: false,
      error: 'Ocurrió un error al restablecer la contraseña. Intenta nuevamente.',
    };
  }
}

