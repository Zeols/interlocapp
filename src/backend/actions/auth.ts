'use server';

import { prisma } from '../db';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { decodeJwt } from 'jose';
import {
  createSessionToken,
  setSessionCookie,
  destroySession,
  getSession,
  SessionPayload,
  createBiometricToken,
  verifyBiometricToken,
} from '../lib/session';
import {
  loginSchema,
  signupSchema,
  verifyCodeSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  LoginInput,
  SignupInput,
  SignupCooperativaInput,
  VerifyCodeInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  ActionResponse,
  signupCooperativaSchema,
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
    if (user.estado === 'PENDIENTE_APROBACION') {
      return {
        success: false,
        error: 'Tu cooperativa y cuenta se encuentran en proceso de revisión por la administración central. Te notificaremos por correo en cuanto sea activada.',
      };
    }

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
    if (['SUPER_ADMIN', 'ADMIN_COOP', 'TAQUILLERO', 'AYUDANTE'].includes(user.rol.nombre)) {
      redirectUrl = '/dashboard';
    } else if (['CHOFER'].includes(user.rol.nombre)) {
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
        nombre: nombre.trim(),
        apellido: (apellido || '').trim(),
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
      nombre: [nuevoUsuario.nombre, nuevoUsuario.apellido].filter(Boolean).join(' ').trim(),
      usuario: nuevoUsuario.usuario,
    };

    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    // Enviar correo de bienvenida de forma segura con timeout de protección
    if (process.env.DISABLE_WELCOME_EMAIL !== 'true' && process.env.DISABLE_EMAIL_SENDING !== 'true') {
      try {
        await Promise.race([
          sendWelcomeEmail({
            to: nuevoUsuario.correo,
            name: nuevoUsuario.nombre,
          }),
          new Promise<{ success: boolean; error: string }>((resolve) =>
            setTimeout(() => resolve({ success: false, error: 'Tiempo de espera agotado al enviar bienvenida' }), 4000)
          ),
        ]);
      } catch (mailErr) {
        console.warn('[Register] No se pudo enviar el correo de bienvenida:', mailErr);
      }
    }

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
          apellido: (apellido || '').trim(),
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
      console.error('[Signup] Error al enviar correo de verificación:', emailResult.error);
      return {
        success: false,
        error: `No se pudo enviar el correo con el código: ${emailResult.error || 'Verifica que las credenciales SMTP estén configuradas en Vercel o el archivo de entorno'}.`,
      };
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
 * Solicita el código de verificación para registrar una nueva cooperativa y su administrador.
 */
export async function requestSignupCooperativaCodeAction(
  input: SignupCooperativaInput
): Promise<ActionResponse<{ email: string }>> {
  try {
    const validated = signupCooperativaSchema.safeParse(input);
    if (!validated.success) {
      const firstError = Object.values(validated.error.flatten().fieldErrors)[0]?.[0];
      return {
        success: false,
        error: firstError || 'Por favor completa correctamente todos los campos.',
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const {
      cooperativaNombre,
      cooperativaTelefono,
      cooperativaDireccion,
      nombre,
      apellido,
      correo,
      telefono,
      password,
    } = validated.data;
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

    // Hashear contraseña
    const hashedPassword = await hashPassword(password);
    const code = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Invalidar códigos anteriores pendientes para el mismo correo
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

    // Guardar código con payload de cooperativa
    await prisma.codigoVerificacion.create({
      data: {
        correo: cleanEmail,
        codigo: code,
        tipo: 'REGISTRO',
        expiraEn: expiresAt,
        datosTemp: JSON.stringify({
          tipoRegistro: 'COOPERATIVA',
          cooperativa: {
            nombre: cooperativaNombre.trim(),
            telefono: cooperativaTelefono?.trim() || null,
            direccion: cooperativaDireccion?.trim() || null,
          },
          admin: {
            nombre: nombre.trim(),
            apellido: (apellido || '').trim(),
            telefono: telefono?.trim() || null,
            hashedPassword,
          },
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
      return {
        success: false,
        error: `No se pudo enviar el correo de verificación: ${emailResult.error}.`,
      };
    }

    return {
      success: true,
      data: {
        email: cleanEmail,
      },
    };
  } catch (error) {
    console.error('Error en requestSignupCooperativaCodeAction:', error);
    return {
      success: false,
      error: 'Error al procesar la solicitud de cooperativa.',
    };
  }
}

/**
 * Registra directamente la solicitud de una cooperativa y su administrador en estado PENDIENTE_APROBACION,
 * sin requerir código de verificación por correo (la verificación y activación la realiza el Super Admin al aprobar la solicitud).
 */
export async function solicitarRegistroCooperativaAction(
  input: SignupCooperativaInput
): Promise<ActionResponse<{ redirectUrl: string }>> {
  try {
    const validated = signupCooperativaSchema.safeParse(input);
    if (!validated.success) {
      const firstError = Object.values(validated.error.flatten().fieldErrors)[0]?.[0];
      return {
        success: false,
        error: firstError || 'Por favor completa correctamente todos los campos.',
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const {
      cooperativaNombre,
      cooperativaTelefono,
      cooperativaDireccion,
      nombre,
      apellido,
      correo,
      telefono,
      password,
    } = validated.data;
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

    // Hashear contraseña
    const hashedPassword = await hashPassword(password);

    // Generar username único
    const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    let finalUsername = baseUsername;
    let counter = 1;

    while (await prisma.usuario.findUnique({ where: { usuario: finalUsername } })) {
      finalUsername = `${baseUsername}_${counter}`;
      counter++;
    }

    let rolAdmin = await prisma.rol.findFirst({
      where: { nombre: 'ADMIN_COOP' },
    });

    if (!rolAdmin) {
      rolAdmin = await prisma.rol.create({
        data: {
          nombre: 'ADMIN_COOP',
          descripcion: 'Administrador de cooperativa de transporte',
          estado: 'ACTIVO',
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      const nuevaCoop = await tx.cooperativa.create({
        data: {
          nombre: cooperativaNombre.trim(),
          telefono: cooperativaTelefono?.trim() || null,
          direccion: cooperativaDireccion?.trim() || null,
          estado: 'PENDIENTE_APROBACION',
        },
      });

      await tx.usuario.create({
        data: {
          idRol: rolAdmin.idRol,
          idCooperativa: nuevaCoop.idCooperativa,
          nombre: nombre.trim(),
          apellido: (apellido || '').trim(),
          usuario: finalUsername,
          correo: cleanEmail,
          telefono: telefono?.trim() || null,
          passwd: hashedPassword,
          estado: 'PENDIENTE_APROBACION',
        },
      });
    });

    return {
      success: true,
      data: {
        redirectUrl: '/login?pending=true',
      },
    };
  } catch (error) {
    console.error('Error en solicitarRegistroCooperativaAction:', error);
    return {
      success: false,
      error: 'Error al procesar la solicitud de registro de la cooperativa.',
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

    // Generar username único
    const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    let finalUsername = baseUsername;
    let counter = 1;

    while (await prisma.usuario.findUnique({ where: { usuario: finalUsername } })) {
      finalUsername = `${baseUsername}_${counter}`;
      counter++;
    }

    const rawData = JSON.parse(record.datosTemp);

    // Caso A: Registro de COOPERATIVA (requiere aprobación posterior de Super Admin)
    if (rawData.tipoRegistro === 'COOPERATIVA') {
      const { cooperativa, admin } = rawData as {
        cooperativa: { nombre: string; telefono: string | null; direccion: string | null };
        admin: { nombre: string; apellido: string; telefono: string | null; hashedPassword: string };
      };

      let rolAdmin = await prisma.rol.findFirst({
        where: { nombre: 'ADMIN_COOP' },
      });

      if (!rolAdmin) {
        rolAdmin = await prisma.rol.create({
          data: {
            nombre: 'ADMIN_COOP',
            descripcion: 'Administrador de cooperativa de transporte',
            estado: 'ACTIVO',
          },
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.codigoVerificacion.update({
          where: { id: record.id },
          data: { usado: true },
        });

        const nuevaCoop = await tx.cooperativa.create({
          data: {
            nombre: cooperativa.nombre,
            telefono: cooperativa.telefono,
            direccion: cooperativa.direccion,
            estado: 'PENDIENTE_APROBACION',
          },
        });

        return tx.usuario.create({
          data: {
            idRol: rolAdmin.idRol,
            idCooperativa: nuevaCoop.idCooperativa,
            nombre: admin.nombre,
            apellido: (admin.apellido || '').trim(),
            usuario: finalUsername,
            correo: cleanEmail,
            telefono: admin.telefono,
            passwd: admin.hashedPassword,
            estado: 'PENDIENTE_APROBACION',
          },
        });
      });

      return {
        success: true,
        data: {
          redirectUrl: '/login?pending=true',
        },
      };
    }

    const userData = rawData as {
      nombre: string;
      apellido: string;
      telefono: string | null;
      hashedPassword: string;
    };

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
          apellido: (userData.apellido || '').trim(),
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
      nombre: [nuevoUsuario.nombre, nuevoUsuario.apellido].filter(Boolean).join(' ').trim(),
      usuario: nuevoUsuario.usuario,
    };

    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    // Enviar correo de bienvenida de forma segura con timeout de protección
    if (process.env.DISABLE_WELCOME_EMAIL !== 'true' && process.env.DISABLE_EMAIL_SENDING !== 'true') {
      try {
        await Promise.race([
          sendWelcomeEmail({
            to: nuevoUsuario.correo,
            name: nuevoUsuario.nombre,
          }),
          new Promise<{ success: boolean; error: string }>((resolve) =>
            setTimeout(() => resolve({ success: false, error: 'Tiempo de espera agotado al enviar bienvenida' }), 4000)
          ),
        ]);
      } catch (mailErr) {
        console.warn('[Register] No se pudo enviar el correo de bienvenida:', mailErr);
      }
    }

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

    // 1. Si el usuario ya existe y ya fue creado o verificado, no enviar ningún código
    const existingUser = await prisma.usuario.findFirst({
      where: {
        correo: { equals: cleanEmail, mode: 'insensitive' },
      },
    });

    if (existingUser) {
      // Invalidar cualquier código pendiente residual
      await prisma.codigoVerificacion.updateMany({
        where: { correo: cleanEmail, usado: false },
        data: { usado: true },
      });
      return {
        success: false,
        error: 'Esta cuenta ya se encuentra registrada y verificada en el sistema.',
      };
    }

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

    // 2. Si el registro pertenecía a una cooperativa, no requiere códigos de verificación
    if (userData.tipoRegistro === 'COOPERATIVA') {
      await prisma.codigoVerificacion.updateMany({
        where: { correo: cleanEmail, usado: false },
        data: { usado: true },
      });
      return {
        success: false,
        error: 'Las cuentas de cooperativa son verificadas directamente por el Super Administrador y no requieren código.',
      };
    }

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

    const emailResult = await sendVerificationCodeEmail({
      to: cleanEmail,
      name: userData.nombre,
      code: newCode,
      expiresMinutes: 15,
    });

    if (!emailResult.success) {
      console.error('[ResendSignup] Error al reenviar correo:', emailResult.error);
      return {
        success: false,
        error: `No se pudo enviar el correo de verificación: ${emailResult.error || 'Revisa la configuración SMTP'}.`,
      };
    }

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

    const emailResult = await sendPasswordResetCodeEmail({
      to: user.correo,
      name: user.nombre,
      code,
      expiresMinutes: 15,
    });

    if (!emailResult.success) {
      console.error('[PasswordReset] Error al enviar código de recuperación:', emailResult.error);
      return {
        success: false,
        error: `No se pudo enviar el correo de recuperación: ${emailResult.error || 'Revisa la configuración SMTP'}.`,
      };
    }

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

// ==========================================
// AUTENTICACIÓN GOOGLE Y BIOMÉTRICA (HUELLA)
// ==========================================

export interface GoogleLoginInput {
  credential?: string; // JWT token de Google Identity Services
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  sub?: string;
}

/**
 * Autentica o registra un usuario pasajero a través de su cuenta de Google.
 */
export async function loginWithGoogleAction(
  input: GoogleLoginInput
): Promise<ActionResponse<{ redirectUrl: string; user: SessionPayload }>> {
  try {
    let email = input.email?.trim().toLowerCase();
    let name = input.name?.trim();
    let picture = input.picture?.trim();

    // Si viene un token JWT de Google Identity Services (GSI), decodificar su payload seguro
    if (input.credential) {
      try {
        const decoded = decodeJwt(input.credential);
        if (decoded.email && typeof decoded.email === 'string') {
          email = decoded.email.trim().toLowerCase();
        }
        if (decoded.name && typeof decoded.name === 'string') {
          name = decoded.name.trim();
        }
        if (decoded.picture && typeof decoded.picture === 'string') {
          picture = decoded.picture.trim();
        }
      } catch (err) {
        console.warn('No se pudo decodificar el token de Google:', err);
      }
    }

    if (!email) {
      return {
        success: false,
        error: 'No se pudo obtener el correo de la cuenta de Google.',
      };
    }

    // Buscar si el usuario ya está registrado en la base de datos
    let user = await prisma.usuario.findFirst({
      where: {
        correo: { equals: email, mode: 'insensitive' },
      },
      include: {
        rol: true,
      },
    });

    if (user) {
      // Validaciones de estado
      if (user.estado === 'PENDIENTE_APROBACION') {
        return {
          success: false,
          error: 'Tu cuenta se encuentra en proceso de revisión por la administración central.',
        };
      }
      if (user.estado === 'INACTIVO') {
        return {
          success: false,
          error: 'Esta cuenta se encuentra inactiva. Comunícate con la administración.',
        };
      }
      if (user.estado === 'BLOQUEADO') {
        return {
          success: false,
          error: 'Tu cuenta ha sido bloqueada temporalmente por motivos de seguridad.',
        };
      }

      // Si el usuario no tiene foto y Google nos provee una, actualizarla
      if (!user.foto && picture) {
        try {
          await prisma.usuario.update({
            where: { idUsuario: user.idUsuario },
            data: { foto: picture },
          });
        } catch {
          // No crítico
        }
      }
    } else {
      // Obtener el rol PASAJERO por defecto
      const rolPasajero = await prisma.rol.findFirst({
        where: { nombre: 'PASAJERO' },
      });

      if (!rolPasajero) {
        return {
          success: false,
          error: 'No se pudo asignar el rol de pasajero. Contacte a soporte.',
        };
      }

      // Derivar nombre y apellido
      const fullName = (name || email.split('@')[0]).trim();
      const parts = fullName.split(' ');
      const userNombre = input.givenName || parts[0] || 'Usuario';
      const userApellido = input.familyName || parts.slice(1).join(' ') || 'Pasajero';

      // Generar usuario único basado en el email
      const baseUser = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 15);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const uniqueUsername = `${baseUser || 'user'}_${randomSuffix}`;

      // Generar una contraseña aleatoria segura hasheada
      const dummyPass = Math.random().toString(36).slice(-10) + Date.now().toString(36);
      const hashedPassword = await hashPassword(dummyPass);

      user = await prisma.usuario.create({
        data: {
          idRol: rolPasajero.idRol,
          idCooperativa: null,
          nombre: userNombre,
          apellido: userApellido,
          usuario: uniqueUsername,
          passwd: hashedPassword,
          correo: email,
          foto: picture || null,
          estado: 'ACTIVO',
        },
        include: {
          rol: true,
        },
      });

      // Enviar correo de bienvenida asíncrono
      sendWelcomeEmail({
        to: email,
        name: userNombre,
      }).catch((err) => console.error('Error enviando correo de bienvenida de Google:', err));
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

    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

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
    console.error('Error en loginWithGoogleAction:', error);
    return {
      success: false,
      error: 'Ocurrió un error al iniciar sesión con Google. Intenta nuevamente.',
    };
  }
}

/**
 * Registra y emite un token seguro firmado para el dispositivo biométrico (huella digital) del usuario.
 */
export async function registerBiometricDeviceAction(input: {
  credentialId: string;
  deviceName: string;
}): Promise<ActionResponse<{ deviceToken: string }>> {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'Debes tener una sesión activa para vincular tu huella digital.',
      };
    }

    if (!input.credentialId) {
      return {
        success: false,
        error: 'Identificador biométrico no válido.',
      };
    }

    const deviceToken = await createBiometricToken({
      idUsuario: session.idUsuario,
      credentialId: input.credentialId,
      email: session.correo,
      deviceName: input.deviceName || 'Dispositivo biométrico',
    });

    return {
      success: true,
      data: {
        deviceToken,
      },
    };
  } catch (error) {
    console.error('Error en registerBiometricDeviceAction:', error);
    return {
      success: false,
      error: 'Error al registrar el dispositivo biométrico.',
    };
  }
}

/**
 * Inicia sesión verificando el token del dispositivo biométrico y la credencial de huella digital.
 */
export async function loginWithBiometricsAction(input: {
  credentialId: string;
  deviceToken: string;
}): Promise<ActionResponse<{ redirectUrl: string; user: SessionPayload }>> {
  try {
    if (!input.credentialId || !input.deviceToken) {
      return {
        success: false,
        error: 'Datos biométricos incompletos.',
      };
    }

    const payload = await verifyBiometricToken(input.deviceToken);
    if (!payload) {
      return {
        success: false,
        error: 'El token biométrico del dispositivo ha expirado o no es auténtico. Por favor ingresa con tu contraseña para volver a sincronizarlo.',
      };
    }

    if (payload.credentialId !== input.credentialId) {
      return {
        success: false,
        error: 'La credencial de huella digital no coincide con este dispositivo.',
      };
    }

    const user = await prisma.usuario.findUnique({
      where: { idUsuario: payload.idUsuario },
      include: { rol: true },
    });

    if (!user) {
      return {
        success: false,
        error: 'Usuario asociado a la huella digital no encontrado.',
      };
    }

    if (user.estado !== 'ACTIVO') {
      return {
        success: false,
        error: 'La cuenta no se encuentra activa para acceso biométrico.',
      };
    }

    const sessionPayload: SessionPayload = {
      idUsuario: user.idUsuario,
      idCooperativa: user.idCooperativa,
      idRol: user.idRol,
      rolNombre: user.rol.nombre,
      correo: user.correo,
      nombre: `${user.nombre} ${user.apellido}`.trim(),
      usuario: user.usuario,
    };

    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

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
    console.error('Error en loginWithBiometricsAction:', error);
    return {
      success: false,
      error: 'Error al iniciar sesión con huella digital.',
    };
  }
}


