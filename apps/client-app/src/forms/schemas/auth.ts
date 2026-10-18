import { z } from 'zod';

// Why: 后端 user.phone 存 E.164 全串（seed '+67088888888'），findUnique 精确匹配——
// UI 前缀块只是视觉（Input prefix 不进表单值），裸号提交必 401；统一在 schema 层归一化，
// 4 个 auth 页（login/login-sms/register/reset）共用此 schema，一处修全生效
const phoneSchema = z
  .string()
  .min(1, 'Phone is required')
  .regex(/^(\+?670|0)?\s?\d{7,12}$/, 'Invalid phone number (e.g. +670 7XXX XXXX)')
  // '0'-前缀（本机拨号习惯）→ +670；无前缀裸号 → 补 +670；已带 + 的保持原样（去空格）
  .transform((v) => {
    const digits = v.replace(/\s+/g, '');
    if (digits.startsWith('+')) return digits;
    if (digits.startsWith('0')) return `+670${digits.slice(1)}`;
    return `+670${digits}`;
  });

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password too long')
  .regex(/[a-zA-Z]/, 'Password must contain letters')
  .regex(/\d/, 'Password must contain numbers');

// Why: 后端 unified 契约 code 固定 6 位（UnifiedVerifySmsRequest: z.string().length(6)）
const smsCodeSchema = z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Digits only');

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
