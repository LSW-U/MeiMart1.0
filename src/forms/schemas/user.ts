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
});

export type ProfileEditValues = z.infer<typeof profileEditSchema>;
export type AddressEditValues = z.infer<typeof addressEditSchema>;
