import { z } from 'zod';

export const feedbackSchema = z.object({
  category: z.string().min(1, 'Please select a category'),
  content: z
    .string()
    .min(10, 'Please describe your feedback in at least 10 characters')
    .max(500, 'Feedback too long'),
  contact: z.string().max(60, 'Contact too long').optional().or(z.literal('')),
});

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Please rate').max(5),
  content: z.string().min(1, 'Please write a review').max(500, 'Review too long'),
  images: z.array(z.string()).optional(),
  anonymous: z.boolean().optional(),
});

export const afterSalesApplySchema = z.object({
  type: z.enum(['refund-only', 'return-refund'], {
    message: 'Please select a type',
  }),
  reason: z.string().min(1, 'Please select a reason'),
  description: z.string().min(1, 'Please describe the issue').max(500, 'Description too long'),
});

export type FeedbackValues = z.infer<typeof feedbackSchema>;
export type ReviewValues = z.infer<typeof reviewSchema>;
export type AfterSalesApplyValues = z.infer<typeof afterSalesApplySchema>;
