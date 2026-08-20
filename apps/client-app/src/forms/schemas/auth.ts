import { z } from 'zod';

const phoneSchema = z
  .string()
  .min(1, 'Phone is required')
  .regex(/^(\+?670|0)?\s?\d{7,12}$/, 'Invalid phone number (e.g. +670 7XXX XXXX)');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password too long')
  .regex(/[a-zA-Z]/, 'Password must contain letters')
  .regex(/\d/, 'Password must contain numbers');

const smsCodeSchema = z
  .string()
  .min(4, 'Code must be 4-6 digits')
  .max(6, 'Code must be 4-6 digits')
  .regex(/^\d+$/, 'Digits only');

// P29-D4: account(emailOrPhone) → phone-only——service loginPassword 只发 phone（auth.ts:81），
// 邮箱输入通过校验却发给后端当 phone 必失败；东帝汶用户统一手机号登录
export const loginPasswordSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  agreed: z.boolean().refine((v) => v, 'You must agree to the terms'),
});

export const loginSmsSchema = z.object({
  phone: phoneSchema,
  code: smsCodeSchema,
  agreed: z.boolean().refine((v) => v, 'You must agree to the terms'),
});

export const registerSchema = z
  .object({
    phone: phoneSchema,
    code: smsCodeSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm password'),
    inviteCode: z.string().optional(),
    agreed: z.boolean().refine((v) => v, 'You must agree to the terms'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const resetPasswordSchema = z
  .object({
    phone: phoneSchema,
    code: smsCodeSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type LoginPasswordValues = z.infer<typeof loginPasswordSchema>;
export type LoginSmsValues = z.infer<typeof loginSmsSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
