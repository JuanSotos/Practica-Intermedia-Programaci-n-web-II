import { z } from 'zod';

// --- Registro ---
export const registerSchema = z.object({
  email: z
    .string()
    .email('El email no es válido')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// --- Validación email (code) ---
export const validationSchema = z.object({
  code: z
    .string()
    .length(6, 'El código debe tener exactamente 6 dígitos')
    .regex(/^\d{6}$/, 'El código debe ser numérico de 6 dígitos'),
});

// --- Login ---
export const loginSchema = z.object({
  email: z
    .string()
    .email('El email no es válido')
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

// --- Onboarding: datos personales ---
export const personalDataSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').transform((val) => val.trim()),
  lastName: z.string().min(1, 'Los apellidos son obligatorios').transform((val) => val.trim()),
  nif: z.string().min(1, 'El NIF es obligatorio').transform((val) => val.trim()),
});

// --- Dirección (reutilizable) ---
const addressSchema = z.object({
  street: z.string().min(1).transform((val) => val.trim()),
  number: z.string().min(1).transform((val) => val.trim()),
  postal: z.string().min(1).transform((val) => val.trim()),
  city: z.string().min(1).transform((val) => val.trim()),
  province: z.string().min(1).transform((val) => val.trim()),
});

// --- Onboarding: compañía (con discriminatedUnion para bonus) ---
const companyBase = z.object({
  isFreelance: z.literal(false),
  name: z.string().min(1, 'El nombre de la empresa es obligatorio').transform((val) => val.trim()),
  cif: z.string().min(1, 'El CIF es obligatorio').transform((val) => val.trim()),
  address: addressSchema,
});

const freelanceBase = z.object({
  isFreelance: z.literal(true),
  // Para autónomos, nombre/cif/address son opcionales porque se rellenan con datos del usuario
  name: z.string().optional(),
  cif: z.string().optional(),
  address: addressSchema.optional(),
});

// Bonus: discriminatedUnion para validación condicional según isFreelance
export const companySchema = z.discriminatedUnion('isFreelance', [
  companyBase,
  freelanceBase,
]);

// --- Cambiar contraseña (bonus: refine) ---
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
    newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser diferente de la actual',
    path: ['newPassword'],
  });

// --- Refresh token ---
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refreshToken es obligatorio'),
});

// --- Invitar usuario ---
export const inviteSchema = z.object({
  email: z
    .string()
    .email('El email no es válido')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().optional().transform((val) => val?.trim()),
  lastName: z.string().optional().transform((val) => val?.trim()),
});
