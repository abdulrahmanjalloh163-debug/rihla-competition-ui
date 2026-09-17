import { z } from 'zod';
import { CORE_CATEGORIES } from '../../types';

// Category is one of the three core categories, or 'Other' for
// anything outside V1 scope (spec §7 — flagged but never used to
// determine core weaknesses).
export const errorCategorySchema = z.enum([...CORE_CATEGORIES, 'Other']);

export const detectedErrorSchema = z.object({
  category: errorCategorySchema,
  original_text: z.string().min(1),
  correction: z.string().min(1),
  explanation_ar: z.string().min(1),
  explanation_en: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const analysisResponseSchema = z.object({
  overall_feedback_ar: z.string().min(1),
  errors: z.array(detectedErrorSchema),
  strengths: z.array(z.string()),
});

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
export type DetectedErrorFromAI = z.infer<typeof detectedErrorSchema>;

// JSON-schema form of the same shape, for Claude's tool-use forced
// structured output (see lib/ai/providers/anthropic.ts).
export const analysisToolSchema = {
  name: 'submit_arabic_analysis',
  description:
    'Submit the structured analysis of the learner\'s Arabic writing.',
  input_schema: {
    type: 'object' as const,
    properties: {
      overall_feedback_ar: { type: 'string' as const },
      errors: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            category: {
              type: 'string' as const,
              enum: [...CORE_CATEGORIES, 'Other'],
            },
            original_text: { type: 'string' as const },
            correction: { type: 'string' as const },
            explanation_ar: { type: 'string' as const },
            explanation_en: { type: 'string' as const },
            confidence: { type: 'number' as const, minimum: 0, maximum: 1 },
          },
          required: [
            'category',
            'original_text',
            'correction',
            'explanation_ar',
            'explanation_en',
            'confidence',
          ],
        },
      },
      strengths: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
    },
    required: ['overall_feedback_ar', 'errors', 'strengths'],
  },
};
