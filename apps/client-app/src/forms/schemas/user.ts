import { z } from 'zod';

const phoneSchema = z
  .string()
  .min(1, 'Phone is required')
  .regex(/^(\+?670|0)?\s?\d{7,12}$/, 'Invalid phone number (e.g. +670 7XXX XXXX)');

const emailSchema = z.string().min(1, 'Email is required').email('Invalid email').or(z.literal(''));

export const profileEditSchema = z.object({
  name: z.string().min(1, 'Name is required').max(40, 'Name too long'),
  phone: phoneSchema,
  email: emailSchema,
});

export const addressEditSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required').max(40),
  phone: phoneSchema,
  province: z.string().min(1, 'Province is required'),
  city: z.string().min(1, 'City is required'),
  district: z.string().min(1, 'District is required'),
  detail: z.string().min(1, 'Address detail is required').max(120, 'Detail too long'),
  isDefault: z.boolean(),
  // Why: P16 决策 7 —— 预置 'home'/'company'/'school' + 任意自定义文本（后端 tag 是 String?），
  //      与方案 z.enum 相比放宽为 string 以承载自定义标签文本（记录到执行日志）
  tag: z.string().max(20, 'Tag too long').optional(),
});

export type ProfileEditValues = z.infer<typeof profileEditSchema>;
export type AddressEditValues = z.infer<typeof addressEditSchema>;
