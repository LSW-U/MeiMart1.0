import { z } from 'zod';

const phoneSchema = z
  .string()
  .min(1, 'Phone is required')
  .regex(/^(\+?670|0)?\s?\d{7,12}$/, 'Invalid phone number (e.g. +670 7XXX XXXX)');

// P27 D4：email 校验信息带 key 标记（编辑页 t() 映射显示；'Email is required' 分支被 or(literal('')) 吸收不会触发）
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('profileEdit.emailInvalid')
  .or(z.literal(''));

export const profileEditSchema = z.object({
  // P27 D5：昵称上限 40 → 15（电商超市用户名 8-12 字符，15 给余量）；错误文案前端 t() 覆盖（D4）
  name: z.string().min(1, 'profileEdit.nameRequired').max(15, 'profileEdit.nameTooLong'),
  // phone 保留 required 定义（类型完整 + 复用 phoneSchema 给 addressEditSchema）；
  // UI 只读 + submit 排除不提交（P27 D5.1），schema 校验不触发
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
