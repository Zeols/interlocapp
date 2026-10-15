import { z } from 'zod';

// ==========================================
// ESQUEMAS DE VALIDACIÓN ZOD PARA AUTENTICACIÓN
// ==========================================

export const loginSchema = z.object({
  identificador: z
    .string()
    .min(3, 'Debes ingresar tu correo electrónico o nombre de usuario.')
    .trim(),
  password: z
    .string()
    .min(6, 'La contraseña debe contener al menos 6 caracteres.'),
});

export const signupSchema = z
  .object({
    nombre: z.string().min(2, 'El nombre debe contener al menos 2 caracteres.').trim(),
    apellido: z.string().min(2, 'El apellido debe contener al menos 2 caracteres.').trim(),
    correo: z.string().email('Por favor ingresa un correo electrónico válido.').trim().toLowerCase(),
    telefono: z.string().min(8, 'Ingresa un número telefónico válido de al menos 8 dígitos.').optional().or(z.literal('')),
    password: z.string().min(6, 'La contraseña debe contener al menos 6 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export const verifyCodeSchema = z.object({
  correo: z.string().email('Correo electrónico no válido.').trim().toLowerCase(),
  codigo: z
    .string()
    .length(6, 'El código debe contener exactamente 6 dígitos.')
    .regex(/^[0-9A-Za-z]{6}$/, 'El código solo puede contener números y letras.'),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email('Por favor ingresa un correo electrónico válido.').trim().toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email('Correo electrónico no válido.').trim().toLowerCase(),
    codigo: z
      .string()
      .length(6, 'El código debe contener exactamente 6 dígitos.')
      .regex(/^[0-9A-Za-z]{6}$/, 'El código solo puede contener números y letras.'),
    password: z.string().min(6, 'La nueva contraseña debe contener al menos 6 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

